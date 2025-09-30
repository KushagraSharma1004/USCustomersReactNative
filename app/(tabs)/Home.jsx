import React, { useState, useEffect, useRef, useMemo, useCallback, use } from 'react'
import { View, Text, FlatList, Image, Dimensions, TouchableOpacity, Linking, ActivityIndicator, StyleSheet, TextInput, Modal } from 'react-native'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import { FullStarSVG, PartialStarSVG, EmptyStarSVG } from '../components/StarSVGs'
import { useRouter } from 'expo-router'
import { encryptData } from '../context/hashing'
import ConfirmationModal from '../components/ConfirmationModal';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import MyVendorsListModal from '../components/MyVendorsListModal'
import html2canvas from 'html2canvas';
import Loader from '../components/Loader'
// import { captureRef } from "react-native-view-shot";

/**
 * Get customer's current location
 * @returns {Promise<Object>} - {latitude: number, longitude: number}
 */
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  })
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {Object} point - {latitude: number, longitude: number}
 * @param {Array} polygon - Array of {latitude: number, longitude: number}
 * @returns {boolean}
 */
const isPointInPolygon = (point, polygon) => {
  const { latitude: x, longitude: y } = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { latitude: xi, longitude: yi } = polygon[i]
    const { latitude: xj, longitude: yj } = polygon[j]
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Check if a point is inside any of the service area polygons
 * @param {Object} customerLocation - {latitude: number, longitude: number}
 * @param {Array} serviceAreaPolygons - Array of polygon arrays
 * @returns {boolean}
 */
const isInServiceArea = (customerLocation, serviceAreaPolygons) => {
  if (!customerLocation || !serviceAreaPolygons || serviceAreaPolygons.length === 0) {
    return false
  }
  // Each serviceAreaPolygon is expected as { points: [GeoPoint, GeoPoint, ...] }
  // Convert GeoPoint to {latitude, longitude} for each polygon
  return serviceAreaPolygons.some((polygonObj) => {
    if (!polygonObj.points || polygonObj.points.length < 3) {
      return false
    }
    const polygon = polygonObj.points.map(p => ({
      latitude: p._lat ?? p.latitude,
      longitude: p._long ?? p.longitude ?? p._lng
    }))
    return isPointInPolygon(customerLocation, polygon)
  })
}

/**
 * Calculate distance between two latitude/longitude points using Haversine formula
 * @param {Object} loc1 - {latitude: number, longitude: number}
 * @param {Object} loc2 - {latitude: number, longitude: number}
 * @returns {number} Distance in kilometers
 */
const getDistanceKm = (loc1, loc2) => {
  const toRad = (value) => (value * Math.PI) / 180
  const R = 6371 // Earth's radius in km
  const dLat = toRad(loc2.latitude - loc1.latitude)
  const dLon = toRad(loc2.longitude - loc1.longitude)
  const lat1 = toRad(loc1.latitude)
  const lat2 = toRad(loc2.latitude)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const Home = () => {
  const { categoriesThoseHaveVendor, allVendors, customerAddress, myVendors, customerMobileNumber, fetchMyVendors } = useAuth()
  const router = useRouter()
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [customerLocation, setCustomerLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [distanceFilter, setDistanceFilter] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const [searchQuery, setSearchQuery] = useState(''); // New state for search query
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false)
  const [isMyVendorsListModalVisible, setIsMyVendorsListModalVisible] = useState(false)
  const [isRemoveVendorFromMyVendorsListConfirmationModalVisible, setIsRemoveVendorFromMyVendorsListConfirmationModalVisible] = useState(false)
  const [vendorMobileNumberToRemoveFromMyVendorsList, setVendorMobileNumberToRemoveFromMyVendorsList] = useState(null)
  const [vendorMobileNumber, setVendorMobileNumber] = useState(null)
  const [addVendorInMyVendorsListBusinessName, setAddVendorInMyVendorsListBusinessName] = useState(null)
  const [addVendorInMyVendorsListMobileNumber, setAddVendorInMyVendorsListMobileNumber] = useState(null)
  const vendorCardRefs = useRef({});
  const [isCommonLoaderVisible, setIsCommonLoaderVisible] = useState(false)

  const handleRemoveVendorFromMyVendorsList = async () => {
    try {
      const vendorInCustomerRef = doc(db, 'customers', customerMobileNumber, 'vendors', vendorMobileNumberToRemoveFromMyVendorsList)
      const vendorInCustomerDocSnap = await getDoc(vendorInCustomerRef)

      if (vendorInCustomerDocSnap.exists()) {
        await deleteDoc(vendorInCustomerRef)
      }
      const customerInVendorRef = doc(db, 'users', vendorMobileNumberToRemoveFromMyVendorsList, 'customers', customerMobileNumber)
      const customerInVendorDocSnap = await getDoc(customerInVendorRef)
      if (customerInVendorDocSnap.exists()) {
        await deleteDoc(customerInVendorRef)
      }
      await fetchMyVendors()
    } catch (error) {
      console.log('Error removing vendor from vendor list: ', error)
    }
  }

  const handleAddVendorToMyVendorList = async () => {
    try {
      const customerInVendorRef = doc(db, 'customers', customerMobileNumber, 'vendors', addVendorInMyVendorsListMobileNumber)
      const vendorInCustomerRef = doc(db, 'users', addVendorInMyVendorsListMobileNumber, 'customers', customerMobileNumber)
      await setDoc(customerInVendorRef, {
        addedAt: serverTimestamp(),
        vendorMobileNumber: addVendorInMyVendorsListMobileNumber
      })
      await setDoc(vendorInCustomerRef, {
        addedAt: serverTimestamp(),
        customerMobileNumber
      })
      setAddVendorInMyVendorsListBusinessName(null)
      setAddVendorInMyVendorsListMobileNumber(null)
      router.push(`/Vendors/?vendor=${encodeURIComponent(encryptData(addVendorInMyVendorsListMobileNumber))}`)
      await fetchMyVendors()
    } catch (error) {
      console.log('Error adding vendor to vendor list: ', error)
      alert('Could not add vendor to vendor list. Please try again.')
    }
  }

  const shareVendorCard = async (id) => {
    const domNode = vendorCardRefs.current[id]?.current;
    if (!domNode) {
      console.error("DOM ref not found for id:", id);
      return;
    }
    try {
      const canvas = await html2canvas(domNode);
      const dataUrl = canvas.toDataURL("image/jpeg");

      // Convert dataUrl to blob and prepare file
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `vendor_${id}.png`, { type: 'image/jpeg' });

      // Try Web Share API first
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Vendor Card',
            text: 'Check out this vendor card!'
          });
          return; // If shared successfully, stop
        } catch (shareError) {
          console.error('Error sharing:', shareError);
        }
      }

      // Fallback: trigger download
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `vendor_${id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error("Error capturing image with html2canvas:", err);
    }
  };

  useEffect(() => {
    // getCurrentLocation()
    //   .then((location) => {
    //     setCustomerLocation(location)
    //     setLoadingLocation(false)
    //   })
    //   .catch((error) => {
    //     setLocationError(error.message)
    //     setLoadingLocation(false)
    //   })
    if (customerAddress?.customerLocation?.latitude && customerAddress?.customerLocation?.longitude) {
      setCustomerLocation({ latitude: customerAddress?.customerLocation.latitude, longitude: customerAddress?.customerLocation.longitude })
      setLoadingLocation(false)
    } else {
      // getCurrentLocation()
      // .then((location) => {
      //   setCustomerLocation(location)
      //   setLoadingLocation(false)
      // })
      // .catch((error) => {
      //   setLocationError(error.message)
      //   setLoadingLocation(false)
      // })
      setLoadingLocation(false)
    }
  }, [customerAddress])

  // Add distance, availability to each vendor
  const vendorsWithDistanceAndAvailability = useMemo(() =>
    allVendors.map((vendor) => {
      const vendorLocation = vendor.vendorAddress?.vendorLocation
      let distance = null
      if (customerLocation && vendorLocation?.latitude && vendorLocation?.longitude) {
        distance = getDistanceKm(
          customerLocation,
          { latitude: vendorLocation.latitude, longitude: vendorLocation.longitude }
        )
      }
      const available = customerLocation && vendor.serviceArea
        ? isInServiceArea(customerLocation, vendor.serviceArea)
        : false

      return {
        ...vendor,
        distance,
        available
      }
    }), [allVendors, customerLocation]
  );

  // Apply search filter first
  const searchedVendors = useMemo(() => {
    if (!searchQuery) {
      return vendorsWithDistanceAndAvailability;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return vendorsWithDistanceAndAvailability.filter(vendor => {
      // Search in businessName, vendorName, category, and vendorAddress fields
      // You can expand this to other fields as needed
      return (
        vendor.businessName?.toLowerCase().includes(lowercasedQuery) ||
        vendor.vendorName?.toLowerCase().includes(lowercasedQuery) ||
        vendor.category?.toLowerCase().includes(lowercasedQuery) ||
        Object.values(vendor.vendorAddress || {})
          .some(field => typeof field === 'string' && field.toLowerCase().includes(lowercasedQuery))
      );
    });
  }, [vendorsWithDistanceAndAvailability, searchQuery]);


  // Filter by selected category if any
  const filteredByCategory = selectedCategoryId
    ? searchedVendors.filter(vendor => vendor.category === selectedCategoryId)
    : searchedVendors;

  // Filter by distance filter if set
  const filteredByDistance = distanceFilter
    ? filteredByCategory.filter(vendor => vendor.distance !== null && vendor.distance <= distanceFilter)
    : filteredByCategory;

  // Sort vendors: active first, then by distance ascending (if available), then by ratingCount descending
  const sortedVendors = useMemo(() =>
    filteredByDistance.slice().sort((a, b) => {
      if (a.isVendorActive && !b.isVendorActive) return -1
      if (!a.isVendorActive && b.isVendorActive) return 1
      if (a.distance !== null && b.distance !== null) {
        if (a.distance < b.distance) return -1
        if (a.distance > b.distance) return 1
      } else if (a.distance !== null) {
        return -1
      } else if (b.distance !== null) {
        return 1
      }
      return (b.ratingCount || 0) - (a.ratingCount || 0)
    }), [filteredByDistance]
  );

  if (loadingLocation) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#E48108" />
        <Text>Please wait till vendors are loading...</Text>
      </View>
    )
  }

  if (locationError) {
    return (
      <View className="flex-1 justify-center items-center p-10">
        <Text className="text-center text-red-600 mb-3">Error getting location: {locationError}</Text>
        <Text className="text-center">Some features may not be available.</Text>
      </View>
    )
  }

  return (
    <View className="gap-[1px] flex-1">
      <Header setIsMyVendorsListModalVisible={setIsMyVendorsListModalVisible} />

      {isCommonLoaderVisible && <Loader/>}
      
      {isRemoveVendorFromMyVendorsListConfirmationModalVisible &&
        <ConfirmationModal
          setIsConfirmModalVisible={setIsRemoveVendorFromMyVendorsListConfirmationModalVisible}
          confirmationMessage={'Are you sure you want to remove this vendor from ⁠❤️ Vendors list?'}
          onConfirm={async () => {
            await handleRemoveVendorFromMyVendorsList()
            setIsRemoveVendorFromMyVendorsListConfirmationModalVisible(false)
          }}
          confirmText='Delete'
          cancelText='Cancel'
        />
      }

      {addVendorInMyVendorsListBusinessName &&
        <Modal animationType='slide' transparent={true}>
          <View className='flex-1 bg-[#00000060] items-center justify-center' >
            <View className='bg-white py-[30px] px-[10px] w-[90%] rounded-[10px] gap-[15px]' >
              <Text className='text-center font-bold text-[20px]' >Do you want to add "{addVendorInMyVendorsListBusinessName}" to ⁠❤️ Vendors list?</Text>
              <Text className='text-[10px] text-primaryRed text-center' >Warning: Your mobile number will be shared to this vendor</Text>
              <View className='flex-row gap-[10px]' >
                <TouchableOpacity onPress={() => { handleAddVendorToMyVendorList() }} className='p-[10px] rounded-[10px] bg-primary flex-1' ><Text className='text-center text-white' >Accept</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => { setAddVendorInMyVendorsListBusinessName(null); setAddVendorInMyVendorsListMobileNumber(null) }} className='p-[10px] rounded-[10px] bg-primaryRed flex-1' ><Text className='text-center text-white' >Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      }

      {/* Categories horizontal scroll for selection */}
      <View className="bg-white w-[98%] self-center justify-between rounded-[5px] flex-row">
        <FlatList
          horizontal
          data={categoriesThoseHaveVendor}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = item.id === selectedCategoryId
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategoryId(isSelected ? null : item.id)}
                className={`p-[3px] min-w-[90px] border justify-center items-center rounded-[7px] mr-[3px] ${isSelected ? 'border-primary bg-primaryLight' : 'border-gray-300'}`}
              >
                <Image
                  resizeMode="stretch"
                  className="rounded-[5px]"
                  style={{ height: 70, width: 80 }}
                  source={
                    item.categoryImage
                      ? { uri: item.categoryImage }
                      : require('../../assets/images/placeholderImage.png')
                  }
                />
                <Text className="text-[10px]">{item.categoryName}</Text>
              </TouchableOpacity>
            )
          }}
        />
        {selectedCategoryId && <TouchableOpacity onPress={() => setSelectedCategoryId(null)} className='rounded-l-[20px] bg-primary items-center justify-center p-[5px]' ><Text className='text-white text-[12px]' >Show</Text><Text className='text-white text-[12px]' >All</Text></TouchableOpacity>}
      </View>

      {/* Vendors FlatList */}
      <View className={`${selectedCategoryId ? 'bg-primaryLight' : 'bg-white'} w-[98%] self-center rounded-[5px] flex-1`}>
        <FlatList
          data={sortedVendors.filter((vendor) => !vendor.disabled)} // Now uses the sortedVendors which includes search filtering
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 50, width: '98%', alignSelf: 'center', paddingTop: 5 }}
          showsVerticalScrollIndicator
          renderItem={({ item }) => {
            const vendorLocation = item.vendorAddress?.vendorLocation
            const isVendorInMyVendorsList = myVendors.find(myVendor => myVendor.vendorMobileNumber === item.vendorMobileNumber)
            if (!vendorCardRefs.current[item.id]) {
              vendorCardRefs.current[item.id] = React.createRef()
            }
            const cardRef = vendorCardRefs.current[item.id]
          
            const handleShare = async () => {
              setIsCommonLoaderVisible(true)
              await new Promise(requestAnimationFrame);
              
              if (!cardRef.current) {
                console.error('Card element ref is null. Cannot capture image.');
                alert('Error capturing card image. Please try again.');
                setIsCommonLoaderVisible(false)
                return;
              }
            
              const vendorLink = `https://customers.unoshops.com/Vendors?fromQR=true&vendor=${encodeURIComponent(encryptData(item.vendorMobileNumber))}`;
            
              // Capture card as canvas
              html2canvas(cardRef.current, {
                useCORS: true,
                scale: 2,
                logging: false,
              }).then(canvas => {
                canvas.toBlob(async blob => {
                  if (!blob) {
                    alert('Could not capture card image.');
                    setIsCommonLoaderVisible(false)
                    return;
                  }
            
                  const file = new File([blob], `${item.businessName}_card.png`, { type: 'image/png' });
            
                  try {
                    if (navigator.share && navigator.canShare?.({ files: [file] })) {
                      await navigator.share({
                        title: `${item.businessName} - Check them out on UnoShops!`,
                        text: `Here's ${item.businessName}'s card from UnoShops! You can find them at ${item.vendorAddressDetails?.vendorBusinessCity}.`,
                        url: vendorLink,
                        files: [file],
                      });
                      console.log('Vendor card and link shared successfully!');
                      setIsCommonLoaderVisible(false)
                    } else {
                      // fallback: download + copy link
                      const imgUrl = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = imgUrl;
                      a.download = `${item.businessName}_card.png`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
            
                      await navigator.clipboard.writeText(vendorLink);
                      alert(`Vendor card downloaded. Link copied to clipboard: ${vendorLink}`);
                      setIsCommonLoaderVisible(false)
                    }
                  } catch (err) {
                    console.error('Error sharing vendor card:', err);
                    alert('Could not share vendor card.');
                    setIsCommonLoaderVisible(false)
                  }
                }, 'image/png');
              });
            };
            
            return (
              <TouchableOpacity
                ref={cardRef}
                // ref={domRef}
                onPress={() => {
                  if (item.isVendorActive) {
                    if (isVendorInMyVendorsList) {
                      router.push(`/Vendors/?vendor=${encodeURIComponent(encryptData(item.vendorMobileNumber))}`)
                    } else {
                      setAddVendorInMyVendorsListBusinessName(item.businessName)
                      setAddVendorInMyVendorsListMobileNumber(item.vendorMobileNumber)
                      return
                    }
                  } else {
                    alert('Vendor is currently unavailable.')
                    return
                  }
                }} className="p-[5px] border-b-[3px] border-primary rounded-[10px] mb-[2px] relative w-full flex-col gap-[5px] bg-white">
                {item.isVendorActive && (
                  <Image
                    resizeMode="stretch"
                    className="absolute top-0 left-0"
                    source={require('../../assets/images/vendorCardBackgroundImage.png')}
                    style={{ height: '100%', width: '100%', borderRadius: 7 }}
                  />
                )}
                <View className="w-full flex-row gap-[5px]">
                  <TouchableOpacity className="absolute top-[5px] right-[5px] z-50" onPress={() => {
                    // shareVendorCard(item.id)
                    handleShare()
                    }}>
                    <Image
                      source={require('../../assets/images/shareImage.png')}
                      style={{ height: 25, width: 25 }}
                    />
                  </TouchableOpacity>
                  <Image
                    source={item.businessImageURL ? { uri: item.businessImageURL } : require('../../assets/images/placeholderImage.png')}
                    className="w-[150px] h-[150px] rounded-lg bg-gray-100 border border-gray-300"
                    style={{ height: 150, width: 150 }}
                    resizeMode="cover"
                  />
                  <View className="flex-1 gap-[5px]">
                    <View className="flex-row items-center gap-[5px]">
                      {/* <Image
                        style={{ height: 20, width: 20 }}
                        source={require('../../assets/images/vendorActiveImage.png')}
                      /> */}
                      {!isVendorInMyVendorsList && <Text className='text-[20px] leading-none' >⁠♡</Text>}
                      {isVendorInMyVendorsList && <Text className='text-[12px] leading-none' >⁠❤️</Text>}
                      <Text
                        className={`font-bold ${item.isVendorActive ? 'text-primaryGreen' : 'text-primaryRed'} leading-none`}
                      >
                        {item.isVendorActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Text className="font-bold text-[10px]">({item.category})</Text>
                    <View className="flex-row gap-[1px]">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const rating = item.averageRating || 0
                        let StarComponent
                        let fillPercentage = 0
                        if (rating >= starIndex) {
                          StarComponent = FullStarSVG
                        } else if (rating > starIndex - 1 && rating < starIndex) {
                          fillPercentage = (rating - (starIndex - 1)) * 100
                          StarComponent = PartialStarSVG
                        } else {
                          StarComponent = EmptyStarSVG
                        }
                        return (
                          <StarComponent
                            key={starIndex}
                            size={15}
                            {...(StarComponent === PartialStarSVG && { fillPercentage })}
                          />
                        )
                      })}
                      {item.ratingCount > 0 && (
                        <Text style={{ fontSize: 12, color: '#555' }}>
                          ({(item.averageRating || 0).toFixed(1)}) {item.ratingCount || 0} ratings
                        </Text>
                      )}
                    </View>
                    <Text className="font-bold text-[16px] text-[#E48108F5]">{item.businessName}</Text>
                    <Text className="font-bold">
                      {item.vendorName} <Text className="text-[10px]">(Owner)</Text>
                    </Text>
                    {/* Distance display */}
                    {item.distance !== null && (
                      <Text className="text-[10px] font-medium text-gray-700">
                        Distance: {item.distance.toFixed(2)} km
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    if (
                      !vendorLocation?.latitude ||
                      !vendorLocation?.longitude
                    ) {
                      return
                    }
                    Linking.openURL(
                      `https://www.google.com/maps/place/${vendorLocation.latitude}+${vendorLocation.longitude}/`
                    )
                  }}
                  className="w-full flex-row items-center p-[5px]"
                >
                  <Text className="text-[23px]">📍</Text>
                  <Text className="text-[12px] flex-1">
                    {item.vendorAddress?.vendorBusinessPlotNumberOrShopNumber || ''}, {item.vendorAddress?.vendorBusinessComplexNameOrBuildingName || ''}, {item.vendorAddress?.vendorBusinessLandmark || ''},{' '}
                    {item.vendorAddress?.vendorBusinessRoadNameOrStreetName || ''},{' '}
                    {item.vendorAddress?.vendorBusinessVillageNameOrTownName || ''},{' '}
                    {item.vendorAddress?.vendorBusinessCity || ''},{' '}
                    {item.vendorAddress?.vendorBusinessState || ''} - {item.vendorAddress?.vendorBusinessPincode || ''}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
              // </ViewShot>
            )
          }}
          ListEmptyComponent={() => (
            <View className='p-[30px] w-full' >
              <Text className='text-center text-[20px] text-primaryRed font-bold' >Not Found</Text>
            </View>
          )}
        />
      </View>

      {!isSearchBarVisible && (
        <TouchableOpacity
          className="absolute bottom-[5px] z-[10] right-[0px] p-[10px] items-center justify-center rounded-l-[10px] bg-primary"
          // onPress={() => searchSheetRef.current?.expand()}
          onPress={() => setIsSearchBarVisible(true)}
        >
          <Text className="text-[20px]">🔍</Text>
        </TouchableOpacity>
      )}

      {isSearchBarVisible &&
        <View className='w-[97%] justify-center items-center flex-row place-self-center fixed bottom-[70px]' >
          <TextInput
            className='flex-1 py-[12px] px-[15px] border-[#ccc] border rounded-l-full bg-white text-base text-gray-800 outline-none focus:outline-none focus:border-[#ccc] focus:bg-white'
            placeholder='🔍 Search'
            value={searchQuery}
            onChangeText={setSearchQuery} // Update search query state
          />
          <TouchableOpacity onPress={() => { setIsSearchBarVisible(false); setSearchQuery('') }}><Image style={{ height: 50, width: 60 }} className='p-[10px] bg-primaryRed rounded-r-full' source={require('../../assets/images/crossImage.png')} /></TouchableOpacity>
        </View>
      }
      {/* {isMyVendorsListModalVisible && ( */}
      {/* <Modal
        animationType="slide"
        transparent={true}
        visible={isMyVendorsListModalVisible}
        onRequestClose={() => setIsMyVendorsListModalVisible(false)}
      >
        <TouchableOpacity onPress={() => setIsMyVendorsListModalVisible(false)} className='flex-1 bg-[#00000060] items-end justify-end pb-[70px]' >
          <View className='bg-wheat p-[5px] w-[80%] rounded-[10px] gap-[10px] max-h-[88%] border-b-[5px] border-primary' >
            <FlashList
              data={myVendors}
              className='flex-1'
              renderItem={({ item }) => {
                let businessName = ''
                let businessImageURL = null
                let vendorName = ''
                let category = ''
                let vendorBusinessCity = ''
                let vendorBusinessPincode = ''
                let isVendorActive = ''
                const vendorRef = allVendors.find(vendor => vendor.vendorMobileNumber === item.vendorMobileNumber)
                if (vendorRef) {
                  businessName = vendorRef.businessName
                  businessImageURL = vendorRef.businessImageURL || null
                  vendorName = vendorRef.vendorName
                  category = vendorRef.category
                  vendorBusinessCity = vendorRef.vendorAddress?.vendorBusinessCity || ''
                  vendorBusinessPincode = vendorRef.vendorAddress?.vendorBusinessPincode || ''
                  isVendorActive = vendorRef.isVendorActive
                }
                return (
                  <TouchableOpacity onPress={() => { if(isVendorActive) { router.push(`/Vendors/?vendor=${encryptData(item.vendorMobileNumber)}`); setIsMyVendorsListModalVisible(false) } else null }} className='flex-row items-center' >
                    <View className={`${vendorMobileNumber === item.vendorMobileNumber ? 'bg-wheat' : 'bg-white'} flex-1 rounded-[5px] p-[5px] flex-row mb-[3px] gap-[5px]`} >
                      <Image style={{ height: 70, width: 70 }} className='rounded-[5px]' source={businessImageURL ? { uri: businessImageURL } : require('../../assets/images/placeholderImage.png')} />
                      <View className='flex-1 gap-[5px] justify-between' >
                        <View className='w-full flex-row justify-between items-center gap-[5px]' ><Text className='text-[10px]' >({category})</Text><Text className='text-[10px] text-primary' >{vendorBusinessCity}, {vendorBusinessPincode}</Text></View>
                        <Text className='font-bold text-center text-[#E48108F5]'>{businessName}</Text>
                        <Text className='text-[12px]' >{vendorName} (Owner)</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => { setIsRemoveVendorFromMyVendorsListConfirmationModalVisible(true); setVendorMobileNumberToRemoveFromMyVendorsList(item.vendorMobileNumber) }} ><Image style={{ height: 30, width: 30 }} source={require('../../assets/images/deleteTrashBinImage.png')} /></TouchableOpacity>
                  </TouchableOpacity>
                )
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal> */}
      {/* )}  */}

      <MyVendorsListModal vendorMobileNumber={vendorMobileNumber} isMyVendorsListModalVisible={isMyVendorsListModalVisible} setIsMyVendorsListModalVisible={setIsMyVendorsListModalVisible} setIsRemoveVendorFromMyVendorsListConfirmationModalVisible={setIsRemoveVendorFromMyVendorsListConfirmationModalVisible} setVendorMobileNumberToRemoveFromMyVendorsList={setVendorMobileNumberToRemoveFromMyVendorsList} />
    </View>
  )
}

export default Home
