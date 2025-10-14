import React, { useState, useEffect, useRef, useMemo, useCallback, use } from 'react'
import { View, Text, FlatList, Image, Dimensions, TouchableOpacity, Linking, ActivityIndicator, StyleSheet, TextInput, Modal } from 'react-native'
import { useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import { FullStarSVG, PartialStarSVG, EmptyStarSVG } from '../components/StarSVGs'
import { useRouter } from 'expo-router'
import { encryptData } from '../context/hashing'
import ConfirmationModal from '../components/ConfirmationModal';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import MyVendorsListModal from '../components/MyVendorsListModal'
import html2canvas from 'html2canvas';
import Loader from '../components/Loader'

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

// Shuffle array to mix products randomly
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const Home = () => {
  const { categoriesThoseHaveVendor, allVendors, customerAddress, myVendors, customerMobileNumber, fetchMyVendors } = useAuth()
  const router = useRouter()
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [customerLocation, setCustomerLocation] = useState(null)
  // const [locationError, setLocationError] = useState(null)
  // const [distanceFilter, setDistanceFilter] = useState(null)
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
  const [selectedMode, setSelectedMode] = useState('Products')
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [allProductsByVendor, setAllProductsByVendor] = useState({});
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRounds, setMaxRounds] = useState(0);
  const snapshotVendors = useRef([]);

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

  const sortedProducts = useMemo(() => {
    let products = allProducts;
    const lowercasedQuery = searchQuery.toLowerCase();

    // 1. Search Filter (Only run if query exists)
    if (searchQuery) {
      products = products.filter(product =>
        product.name?.toLowerCase().includes(lowercasedQuery)
      );
    }

    // 2. Distance Filter (Only run if filter exists)
    // if (distanceFilter) {
    //   products = products.filter(product => product.distance !== null && product.distance <= distanceFilter);
    // }

    // Products are already "meshed" and appended in a specific order in `loadNextRound`, so no further sorting is applied here.
    return products;
  }, [allProducts, searchQuery, 
    // distanceFilter
  ]);

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

  // Sort vendors: active first, then by distance ascending (if available), then by ratingCount descending
  const sortedVendors = useMemo(() => {
    let vendors = vendorsWithDistanceAndAvailability;
    const lowercasedQuery = searchQuery.toLowerCase();

    // 1. Search Filter (Only run if query exists)
    if (searchQuery) {
      vendors = vendors.filter(vendor => {
        return (
          vendor.businessName?.toLowerCase().includes(lowercasedQuery) ||
          vendor.vendorName?.toLowerCase().includes(lowercasedQuery) ||
          vendor.category?.toLowerCase().includes(lowercasedQuery) ||
          // Optimize Object.values() creation
          (vendor.vendorAddress && Object.keys(vendor.vendorAddress).some(key =>
            typeof vendor.vendorAddress[key] === 'string' && vendor.vendorAddress[key].toLowerCase().includes(lowercasedQuery)
          ))
        );
      });
    }

    // 2. Category Filter (Only run if filter is set)
    if (selectedCategoryId) {
      vendors = vendors.filter(vendor => vendor.category === selectedCategoryId);
    }

    // 3. Distance Filter (Only run if filter is set)
    // if (distanceFilter) {
    //   vendors = vendors.filter(vendor => vendor.distance !== null && vendor.distance <= distanceFilter);
    // }

    // 4. Sort vendors (Active first, then by distance, then by rating)
    return vendors.sort((a, b) => {
      // Primary sort: Active status
      if (a.isVendorActive && !b.isVendorActive) return -1
      if (!a.isVendorActive && b.isVendorActive) return 1

      // Secondary sort: Distance ascending
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      } else if (a.distance !== null) {
        return -1; // a is closer (known distance)
      } else if (b.distance !== null) {
        return 1; // b is closer (known distance)
      }

      // Tertiary sort: Rating count descending
      return (b.ratingCount || 0) - (a.ratingCount || 0)
    });
  }, [vendorsWithDistanceAndAvailability, searchQuery, selectedCategoryId, 
    // distanceFilter
  ]);

  const fetchProductsForVendors = useCallback(async (vendors) => {
    if (vendors.length === 0) return;
    setLoadingProducts(true);
    try {
      const promises = vendors.map(async (vendor) => {
        const listRef = collection(db, 'users', vendor.vendorMobileNumber, 'list');
        const snapshot = await getDocs(listRef);
        return snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
        })).filter(p => !p.hidden);
      });

      const results = await Promise.all(promises);
      const byVendor = {};
      vendors.forEach((v, i) => {
        byVendor[v.vendorMobileNumber] = results[i];
      });
      setAllProductsByVendor(byVendor);

      const mr = Math.max(...results.map(r => r.length), 0);
      setMaxRounds(mr);

      // Load the first round immediately if there are products
      if (mr > 0) {
        loadNextRound();
      } else {
        setHasMoreProducts(false);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadNextRound = useCallback(() => {
    if (currentRound >= maxRounds) return;

    const roundProducts = snapshotVendors.current.map(v => {
      const prods = allProductsByVendor[v.vendorMobileNumber] || [];
      const product = prods[currentRound];
      if (!product) return null;

      return {
        ...product,
        categoryId: v.category, // Always use vendor's category (no fallback needed)
        vendorMobileNumber: v.vendorMobileNumber,
        businessName: v.businessName,
        businessImageURL: v.businessImageURL,
        distance: v.distance,
        available: v.available,
        isVendorActive: v.isVendorActive
      };
    }).filter(p => p !== null);

    setAllProducts(prev => [...prev, ...roundProducts]);
    setCurrentRound(prev => {
      const newRound = prev + 1;
      setHasMoreProducts(newRound < maxRounds);
      return newRound;
    });
  }, [currentRound, maxRounds, allProductsByVendor]);

  // --- OPTIMIZATION: Stabilize active vendor list for product fetching ---
  const activeVendorsForProducts = useMemo(() => {
    let candidateVendors = vendorsWithDistanceAndAvailability
      .filter(v => v.isVendorActive && !v.disabled);

    // Apply category filter
    if (selectedCategoryId) {
      candidateVendors = candidateVendors.filter(v => v.category === selectedCategoryId);
    }

    // Sort active vendors for consistent product meshing
    return candidateVendors
      .slice()
      .sort((a, b) => {
        // Same sorting logic as sortedVendors
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        } else if (a.distance !== null) {
          return -1;
        } else if (b.distance !== null) {
          return 1;
        }
        return (b.ratingCount || 0) - (a.ratingCount || 0);
      });
  }, [vendorsWithDistanceAndAvailability, selectedCategoryId]);

  // --- Product Fetching Logic ---
  useEffect(() => {
    if (selectedMode === 'Products') {
      // Reset state for new fetch
      setCurrentRound(0);
      setAllProducts([]);
      setHasMoreProducts(true);

      snapshotVendors.current = activeVendorsForProducts;
      fetchProductsForVendors(activeVendorsForProducts);
    } else {
      setAllProductsByVendor({});
      setCurrentRound(0);
      setMaxRounds(0);
      setAllProducts([]);
      setHasMoreProducts(false);
    }
  }, [selectedMode, activeVendorsForProducts]); // Use stabilized dependency array

  if (loadingLocation) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#E48108" />
        <Text>Please wait till vendors are loading...</Text>
      </View>
    )
  }

  // if (locationError) {
  //   return (
  //     <View className="flex-1 justify-center items-center p-10">
  //       <Text className="text-center text-red-600 mb-3">Error getting location: {locationError}</Text>
  //       <Text className="text-center">Some features may not be available.</Text>
  //     </View>
  //   )
  // }

  return (
    <View className="gap-[1px] flex-1">
      <Header setIsMyVendorsListModalVisible={setIsMyVendorsListModalVisible} />

      {isCommonLoaderVisible && <Loader />}

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
      {selectedMode !== 'Products' && <View className="bg-white w-[98%] self-center justify-between rounded-[5px] flex-row">
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
      </View>}

      {selectedMode !== 'Products' && <View className='bg-white w-[98%] self-center justify-between rounded-[5px] flex-row' >
        <TouchableOpacity onPress={() => setSelectedMode('Vendors')} className={`flex-1 ${selectedMode === 'Vendors' ? 'bg-primary' : 'border border-[#ccc]'} p-[10px] rounded-l-[5px]`} >
          <Text className={`${selectedMode === 'Vendors' ? 'text-white' : 'text-black'} text-center text-[16px] font-bold`} >Vendors</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedMode('Products')} className={`flex-1 ${selectedMode === 'Products' ? 'bg-primary' : 'border border-[#ccc]'} p-[10px] rounded-r-[5px]`} >
          <Text className={`${selectedMode === 'Products' ? 'text-white' : 'text-black'} text-center text-[16px] font-bold`} >Products</Text>
        </TouchableOpacity>
      </View>}

      {/* Vendors FlatList */}
      {selectedMode === 'Vendors' && (
        <View className={`${selectedCategoryId ? 'bg-primaryLight' : 'bg-white'} w-[98%] self-center rounded-[5px] flex-1`}>
          <FlatList
            data={sortedVendors.filter((vendor) => !vendor.disabled)} // Now uses the sortedVendors which includes search filtering
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 50, width: '98%', alignSelf: 'center', paddingTop: 5 }}
            showsVerticalScrollIndicator
            renderItem={({ item }) => {
              if (!item?.businessName || item?.businessName === '') return
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
      )}

      {selectedMode === 'Products' && (
        <View className={`${selectedCategoryId ? 'bg-primaryLight' : 'bg-white'} w-full flex-1 p-1`}>
          {loadingProducts && !sortedProducts.length ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#E48108" />
              <Text>Loading products...</Text>
            </View>
          ) : (
            <FlatList
              data={sortedProducts.filter((item) => item.images?.[0])}
              // --- Performance: Use numColumns for better grid performance and responsiveness ---
              numColumns={3}
              keyExtractor={(item) => `${item.id}-${item.vendorMobileNumber}`}
              // Use margin/padding for spacing around the grid
              contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 50 }}
              showsVerticalScrollIndicator
              ListHeaderComponent={() => (
                <>
                  <View className="bg-white w-[98%] self-center justify-between rounded-[5px] flex-row mb-[5px]">
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
                  <View className='bg-white w-[98%] self-center justify-between rounded-[5px] flex-row' >
                    <TouchableOpacity onPress={() => setSelectedMode('Vendors')} className={`flex-1 ${selectedMode === 'Vendors' ? 'bg-primary' : 'border border-[#ccc]'} p-[10px] rounded-l-[5px]`} >
                      <Text className={`${selectedMode === 'Vendors' ? 'text-white' : 'text-black'} text-center text-[16px] font-bold`} >Vendors</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSelectedMode('Products')} className={`flex-1 ${selectedMode === 'Products' ? 'bg-primary' : 'border border-[#ccc]'} p-[10px] rounded-r-[5px]`} >
                      <Text className={`${selectedMode === 'Products' ? 'text-white' : 'text-black'} text-center text-[16px] font-bold`} >Products</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    if (item.isVendorActive) {
                      if (myVendors.find(myVendor => myVendor.vendorMobileNumber === item.vendorMobileNumber)) {
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
                  }}
                  // --- Sleek Visuals & Responsiveness: max-w-[48%] for 2 items per row, plus margin for spacing ---
                  className="flex-1 m-[2px] border border-gray-100 rounded-lg bg-white shadow-md min-h-[230px]"
                >
                  {/* --- Style Prop & Aspect Ratio for Image --- */}
                  <Image
                    source={item.images?.[0] ? { uri: item.images[0] } : require('../../assets/images/placeholderImage.png')}
                    className="w-full rounded-lg mb-2"
                    // Using aspect-square and full width for a sleek, responsive image container
                    style={{ aspectRatio: 1, width: '100%' }}
                    resizeMode="cover"
                  />

                  <View className="flex-1 justify-between gap-1 px-[7px] pb-[7px]">
                    {/* Ensure Text doesn't overflow visually */}
                    <Text className="font-semibold" numberOfLines={2}>{item.name}</Text>

                    <View className='flex-col'>
                      {/* Price Display with improved layout */}
                      <Text className="text-xs text-gray-400 line-through">₹{item.prices?.[0]?.mrp || 'N/A'}</Text>
                      <Text className="text-[12px] text-green-600 font-bold">
                        ₹{item.prices?.[0]?.sellingPrice || 'N/A'} / {item.prices?.[0]?.measurement || ''}
                      </Text>
                    </View>

                    {/* Vendor Availability */}
                    {item.available === false && <Text className="text-xs text-primary">Takeaway Only</Text>}
                  </View>
                </TouchableOpacity>
              )}
              onEndReached={() => {
                if (!loadingProducts && hasMoreProducts) {
                  setLoadingProducts(true);
                  loadNextRound();
                  setLoadingProducts(false);
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={() => loadingProducts && hasMoreProducts ? <ActivityIndicator size="small" color="#E48108" style={{ marginVertical: 10 }} /> : null}
              ListEmptyComponent={() => {
                return (
                  <View className='p-8 w-full' >
                    <Text className='font-bold text-xl text-center' >No Items found. Try again later</Text>
                  </View>
                )
              }}
            />
          )}
        </View>
      )}

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

      <MyVendorsListModal vendorMobileNumber={vendorMobileNumber} isMyVendorsListModalVisible={isMyVendorsListModalVisible} setIsMyVendorsListModalVisible={setIsMyVendorsListModalVisible} setIsRemoveVendorFromMyVendorsListConfirmationModalVisible={setIsRemoveVendorFromMyVendorsListConfirmationModalVisible} setVendorMobileNumberToRemoveFromMyVendorsList={setVendorMobileNumberToRemoveFromMyVendorsList} />
    </View>
  )
}

export default Home
