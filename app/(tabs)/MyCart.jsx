import { View, Text, TouchableOpacity, Linking, TextInput, Image, FlatList, Dimensions, ScrollView, Modal } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import ItemCard from '../components/ItemCard';
import { FlashList } from "@shopify/flash-list";
import { useAuth } from '../context/AuthContext';
import { useCart } from "../context/CartContext";
import { decryptData } from '../context/hashing'
import { useFocusEffect, useRouter } from 'expo-router';
import Loader from '../components/Loader'
import { useAddressSheet } from '../context/AddressSheetContext'
import { useServiceAreaCheck } from '../hooks/useServiceAreaCheck';
import { RatingStars } from '../components/RatingStars';

const MyCart = () => {
  const router = useRouter()
  const { customerMobileNumber, customerAddress, customerFullData } = useAuth()
  const { cartItems, fetchCartItems, cartCount, cartTotal } = useCart()
  const { openAddressSheet } = useAddressSheet()
  const vendorMobileNumber = decryptData(localStorage.getItem('vendor'))
  const { isInServiceArea, isCheckingServiceArea, serviceAreaError, customerLocation, checkServiceArea, refreshLocation, hasServiceArea } = useServiceAreaCheck(decryptData(localStorage.getItem('vendor')));
  const [filteredItemsList, setFilteredItemsList] = useState([]);
  const [allItemsList, setAllItemsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('')
  const [vendorFullData, setVendorFullData] = useState(null)
  const [isCommonLoaderVisible, setIsCommonLoaderVisible] = useState(false)
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('selectADeliveryMode')
  const [deliveryModeError, setDeliveryModeError] = useState('')
  const [isOrderCommentModalShown, setIsOrderCommentModalShown] = useState(false)
  const [isOrderCommentModalVisible, setIsOrderCommentModalVisible] = useState(false)
  const [orderComment, setOrderComment] = useState('')
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')


  useFocusEffect(
    useCallback(() => {
      // Runs when screen is focused (mounted or comes back into view)
      handleDeliveryModeChange('selectADeliveryMode');
      setDeliveryModeError('');

      return () => {
        // Optional cleanup when screen goes out of focus
      };
    }, [])
  );

  const fetchVendorItemList = async () => {
    if (!vendorMobileNumber) return;
    try {
      const vendorItemsRef = collection(db, 'users', vendorMobileNumber, 'list');
      const vendorItemsDocSnap = await getDocs(vendorItemsRef);
      if (!vendorItemsDocSnap.empty) {
        const items = vendorItemsDocSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllItemsList(items);    // Store full list
        setFilteredItemsList(items); // Initially show all items
      } else {
        setAllItemsList([]);
        setFilteredItemsList([]);
      }
    } catch (error) {
      console.log('Error fetching vendor items: ', error);
    }
  };

  const fetchVendorFullData = async () => {
    if (!vendorMobileNumber || vendorMobileNumber.length !== 10) {
      return;
    }
    try {
      setIsCommonLoaderVisible(true)
      const vendorRef = doc(db, 'users', vendorMobileNumber)
      const vendorDocSnap = await getDoc(vendorRef)
      if (!vendorDocSnap.exists()) {
        return
      }
      const vendorData = vendorDocSnap.data()

      setVendorFullData(vendorData)
    } catch (error) {
      console.log('Error fetching vendor details: ', error)
    } finally {
      setIsCommonLoaderVisible(false)
    }
  }

  const fetchVendorAddress = async () => {
    try {
      if (!vendorMobileNumber) {
        console.warn("Vendor mobile number is missing, cannot fetch address.");
        return;
      }
      const vendorAddressesRef = collection(db, 'users', vendorMobileNumber, 'savedAddresses');
      const vendorAddressesSnap = await getDocs(vendorAddressesRef);
      if (!vendorAddressesSnap.empty) {
        const addressDoc = vendorAddressesSnap.docs[0];
        if (addressDoc) {
          const addressData = addressDoc.data();
          setVendorFullData(prevFullData => {
            const updatedFullData = {
              ...prevFullData,
              createdAt: addressData.createdAt,
              updatedAt: addressData.updatedAt,
              vendorBusinessCity: addressData.vendorBusinessCity,
              vendorBusinessComplexNameOrBuildingName: addressData.vendorBusinessComplexNameOrBuildingName,
              vendorBusinessLandmark: addressData.vendorBusinessLandmark,
              vendorBusinessPincode: addressData.vendorBusinessPincode,
              vendorBusinessPlotNumberOrShopNumber: addressData.vendorBusinessPlotNumberOrShopNumber,
              vendorBusinessRoadNameOrStreetName: addressData.vendorBusinessRoadNameOrStreetName,
              vendorBusinessState: addressData.vendorBusinessState,
              vendorBusinessVillageNameOrTownName: addressData.vendorBusinessVillageNameOrTownName,
              vendorLocation: addressData.vendorLocation,
            };
            return updatedFullData;
          });
        } else {
          console.warn("No address document found for the vendor.");
        }
      } else {
        console.warn("No addresses found for the vendor.");
      }
    } catch (error) {
      console.error("Error fetching vendor address:", error);
    }
  }

  useEffect(() => {
    fetchVendorItemList()
    // fetchVendorFullData()
    fetchVendorAddress()
  }, [vendorMobileNumber])

  const subscribeToVendorFullData = () => {
    if (!vendorMobileNumber || vendorMobileNumber.length !== 10) {
      return () => { }; // Return empty cleanup function if invalid vendor number
    }

    setIsCommonLoaderVisible(true);

    const vendorRef = doc(db, 'users', vendorMobileNumber);

    // Start listening to realtime updates
    const unsubscribe = onSnapshot(
      vendorRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setVendorFullData(docSnap.data());
        } else {
          setVendorFullData(null);
        }
        setIsCommonLoaderVisible(false);
      },
      (error) => {
        console.log('Error fetching vendor details: ', error);
        setIsCommonLoaderVisible(false);
      }
    );

    // Return unsubscribe function to be called on cleanup
    return unsubscribe;
  };

  // Then in your useEffect, subscribe and cleanup:
  useEffect(() => {
    const unsubscribe = subscribeToVendorFullData();

    return () => {
      unsubscribe();
    };
  }, [vendorMobileNumber]);

  useEffect(() => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      setFilteredItemsList(allItemsList);
      return;
    }
    const filtered = allItemsList.filter(item => {
      // Check all string values in the item object for the query
      return Object.values(item).some(value =>
        typeof value === 'string' && value.toLowerCase().includes(query)
      );
    });
    setFilteredItemsList(filtered);
  }, [searchQuery, allItemsList]);

  const handleAddToCartWithUpdate = async (item) => {
    try {
      const itemRef = doc(
        db,
        "customers",
        customerMobileNumber,
        "cart",
        vendorMobileNumber,
        "items",
        item.id
      );

      const itemSnap = await getDoc(itemRef);

      if (itemSnap.exists()) {
        await updateDoc(itemRef, {
          quantity: increment(1),
          updatedAt: new Date(),
        });
      } else {
        await setDoc(itemRef, {
          name: item.name,
          price: item.prices[0].sellingPrice,
          measurement: item.prices[0].measurement,
          quantity: 1,
          stock: item.stock,
          image: item?.images?.[0] || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Refresh cart items after operation
      await fetchCartItems();
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Could not add to cart. Please try again.");
    }
  };

  const handleIncrementWithUpdate = async (itemId) => {
    try {
      const itemRef = doc(db, "customers", customerMobileNumber, "cart", vendorMobileNumber, "items", itemId);
      await updateDoc(itemRef, {
        quantity: increment(1),
        updatedAt: new Date(),
      });

      // Refresh cart items after operation
      await fetchCartItems();
    } catch (error) {
      console.error("Error incrementing:", error);
    }
  };

  const handleDecrementWithUpdate = async (itemId, currentQty) => {
    try {
      const itemRef = doc(db, "customers", customerMobileNumber, "cart", vendorMobileNumber, "items", itemId);

      if (currentQty <= 1) {
        await deleteDoc(itemRef); // remove completely if qty 0
      } else {
        await updateDoc(itemRef, {
          quantity: increment(-1),
          updatedAt: new Date(),
        });
      }

      // Refresh cart items after operation
      await fetchCartItems();
    } catch (error) {
      console.error("Error decrementing:", error);
    }
  };

  const handleDeliveryModeChange = async (mode) => {
    // Clear any previous errors
    setDeliveryModeError('');

    if (hasServiceArea) {
      if (mode === 'homeDelivery') {
        // Check if home delivery is available from vendor
        // if (!vendorDeliveryModes.selfDelivery && !vendorDeliveryModes.thirdPartyServices) {
        //   setDeliveryModeError('Home delivery is not available from this vendor');
        //   return;
        // }

        // Check service area - this will automatically trigger location check
        const inServiceArea = await checkServiceArea();

        if (!inServiceArea) {
          setDeliveryModeError('Home delivery is not available in your area.');
          // Don't set the delivery mode if not in service area
          return;
        }
      }
    }

    // If we reach here, the delivery mode is valid
    setSelectedDeliveryMode(mode);
    router.setParams({ selectedDeliveryMode: mode });
  };

  const confirmOrder = async (isOrderCommentAdded = false) => {

    if (selectedDeliveryMode === 'selectADeliveryMode') {
      alert('Please select a delivery mode');
      return;
    }

    if (!customerMobileNumber || !vendorMobileNumber) {
      alert('Missing customer or vendor information.');
      return;
    }

    if (selectedDeliveryMode === 'homeDelivery' && !isInServiceArea) {
      alert('Home delivery is not available in your area. Please select takeaway or change location.');
      return;
    }

    if (selectedDeliveryMode === 'homeDelivery' && vendorFullData.minimumOrderAmount > cartTotal) {
      alert(`Minimum order amount for home delivery is ₹${vendorFullData.minimumOrderAmount}`)
      return
    }

    try {
      setIsCommonLoaderVisible(true);

      // Fetch cart items under customer's cart for this vendor
      const cartItemsRef = collection(db, 'customers', customerMobileNumber, 'cart', vendorMobileNumber, 'items');
      const cartSnapshot = await getDocs(cartItemsRef);
      if (cartSnapshot.empty) {
        alert('Your cart is empty. Please add items before confirming your order.');
        return;
      }

      // Prepare items and check stock
      const itemsToOrder = [];
      for (const docSnap of cartSnapshot.docs) {
        const cartItem = docSnap.data();
        const itemId = docSnap.id;

        if (cartItem.quantity <= 0) continue;

        const itemRef = doc(db, 'users', vendorMobileNumber, 'list', itemId);
        const itemDocSnap = await getDoc(itemRef);

        if (!itemDocSnap.exists()) {
          alert(`Item "${cartItem.name}" is no longer available.`);
          return;
        }
        const itemData = itemDocSnap.data();
        if (cartItem.quantity > (itemData.stock || 0)) {
          alert(`Not enough stock for "${cartItem.name}". Available: ${itemData.stock}, Ordered: ${cartItem.quantity}`);
          return;
        }

        itemsToOrder.push({
          id: itemId,
          name: cartItem.name,
          quantity: cartItem.quantity,
          price: cartItem.prices,
          imageURL: itemData.images?.[0] || '',
          originalStock: itemData.stock || 0,
        });
      }

      if (itemsToOrder.length === 0) {
        alert('No valid items to order.');
        return;
      }

      // Calculate delivery charge if applicable
      let deliveryCharge = 0;
      if (selectedDeliveryMode === 'homeDelivery') {
        deliveryCharge = vendorFullData?.deliveryCharge || 0;
      }

      // Create order details
      const orderDetails = {
        address: customerAddress,
        businessName: vendorFullData?.businessName || '',
        customerMobileNumber,
        customerName: customerFullData?.customerName || '',
        deliveryCharge: Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 ? Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal > 0 ? deliveryCharge : 0 : deliveryCharge,
        deliveryMode: selectedDeliveryMode === 'homeDelivery' ? 'Home Delivery' : 'Takeaway/Pickup',
        items: itemsToOrder.map(({ id, name, quantity, price, imageURL }) => ({
          id, name, quantity, price, imageURL
        })),
        orderStatus: 'Pending',
        orderTime: new Date(),
        totalAmount: cartTotal || 0, // Calculate total
        vendorMobileNumber,
        vendorName: vendorFullData?.vendorName || '',
        pickupAddress: selectedDeliveryMode === 'takeaway' ? `${vendorFullData.vendorBusinessPlotNumberOrShopNumber}, ${vendorFullData.vendorBusinessComplexNameOrBuildingName}, ${vendorFullData.vendorBusinessLandmark}, ${vendorFullData.vendorBusinessRoadNameOrStreetName}, ${vendorFullData.vendorBusinessVillageNameOrTownName}, ${vendorFullData.vendorBusinessCity}, ${vendorFullData.vendorBusinessState} - ${vendorFullData.vendorBusinessPincode}` : '',
        pickupCoordinates: selectedDeliveryMode === 'takeaway' ? { longitude: vendorFullData.vendorLocation?.longitude, latitude: vendorFullData.vendorLocation?.latitude } : {},
        customerComment: isOrderCommentAdded ? orderComment : ''
      };

      if (Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 ? Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal > 0 : true) {
        orderDetails.totalAmount += Number(deliveryCharge);
      }

      if (!orderDetails.address || orderDetails.items.length === 0 || orderDetails.totalAmount <= 0) {
        alert('Order details are incomplete or total amount is zero.');
        return;
      }

      if (isOrderCommentModalShown === false) {
        setIsOrderCommentModalVisible(true)
        setIsOrderCommentModalShown(true)
        return
      }

      // Add order to customer's myOrders collection
      const customerOrdersRef = collection(db, 'customers', customerMobileNumber, 'myOrders');
      const orderDocRef = await addDoc(customerOrdersRef, orderDetails);

      // Add order to vendor's myOrders collection with orderId
      const vendorOrdersRef = doc(db, 'users', vendorMobileNumber, 'myOrders', orderDocRef.id);
      await setDoc(vendorOrdersRef, { ...orderDetails, orderId: orderDocRef.id });

      // Update stock in vendor items
      for (const item of itemsToOrder) {
        const itemRef = doc(db, 'users', vendorMobileNumber, 'list', item.id);
        await updateDoc(itemRef, { stock: item.originalStock - item.quantity });
      }

      const deletePromises = cartSnapshot.docs.map((document) => {
        const docRef = doc(db, 'customers', customerMobileNumber, 'cart', vendorMobileNumber, 'items', document.id);
        return deleteDoc(docRef);
      });

      await Promise.all(deletePromises);

      setOrderComment('')
      setIsOrderCommentModalShown(false)
      alert('Order confirmed successfully!');
      setSelectedDeliveryMode('selectADeliveryMode')
      setDeliveryModeError('')
      setIsRatingModalVisible(true)

      // Clear cart or reset UI states as needed
      await fetchCartItems();

    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Failed to confirm order. Please try again.');
    } finally {
      setIsCommonLoaderVisible(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) return; // Prevent empty ratings
    setIsCommonLoaderVisible(true);
    try {
      await addDoc(collection(db, "ratings"), {
        comment: ratingComment,
        customerId: customerMobileNumber, // Set this from your auth context or props
        rating: rating,
        timestamp: serverTimestamp(),
        vendorId: vendorFullData.vendorMobileNumber, // Use the vendor's mobile number here
      });
      // Optionally show a confirmation modal/snackbar here
      setIsRatingModalVisible(false);
      setRating(0);
      setRatingComment('');
      router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}`)
    } catch (e) {
      // Show error toast or alert
    }
    setIsCommonLoaderVisible(false);
  }

  if (isRatingModalVisible) {
    return (
      <View className='flex-1 items-center justify-center' >
        <View className='w-[96%] p-[20px] rounded-[10px] bg-white items-center justify-center gap-[10px]' >
          <Text>How was your experience with</Text>
          <Text className='font-bold text-primary text-[15px]' >{vendorFullData?.businessName || ''}?</Text>
          <RatingStars rating={rating} setRating={setRating} />
          <TextInput
            value={ratingComment}
            onChangeText={setRatingComment}
            multiline
            numberOfLines={5}
            placeholder='Leave a comment (Optional)'
            className='rounded-[10px] border border-[#ccc] p-[10px] w-full'
          />
          <View className='flex-row w-full gap-[10px]'>
            <TouchableOpacity
              className='flex-1 p-[10px] rounded-[10px] bg-primary'
              disabled={isCommonLoaderVisible || rating === 0}
              onPress={handleSubmitRating}
            >
              <Text className='text-white text-center'>{isCommonLoaderVisible ? "Submitting..." : "Submit Rating"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className='flex-1 p-[10px] rounded-[10px] bg-[#ccc]'
              onPress={() => { setIsRatingModalVisible(false); router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}`) }}
            >
              <Text className='text-white text-center'>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  if (cartCount === 0) {
    return (
      <View className='flex-1 items-center justify-center gap-[10px]' >
        <Image style={{ height: 300, width: 300 }} source={require('../../assets/images/emptyCartImage.png')} className='rounded-[10px]' />
        <Text className='text-[20px] font-bold text-primaryRed' >Your cart is empty</Text>
        <TouchableOpacity onPress={() => router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}`)} className='mt-[20px]' ><Text className='text-[18px] text-primary text-center underline' >Continue Shopping</Text></TouchableOpacity>
      </View>
    )
  }

  return (
    <View className='h-full w-full pt-[3px] gap-[3px]' >
      {isCommonLoaderVisible && <Loader />}
      {isOrderCommentModalVisible &&
        <Modal animationType='slide' >
          <View className='flex-1 bg-[#00000080] items-center justify-center' >
            <View className='p-[20px] w-[96%] bg-white rounded-[10px] gap-[15px] items-center justify-center' >
              <Text className='font-bold text-primary text-[18px]' >Add Comment to Order</Text>
              <Text className='text-[12px] text-center' >Any special instructions or preferences for your order?</Text>
              <TextInput
                value={orderComment}
                onChangeText={setOrderComment}
                multiline
                numberOfLines={5}
                className='rounded-[10px] border border-[#ccc] p-[10px] w-full'
                placeholder='Enter any special instructions, cooking preference, or notes for the vendor...'
              />
              <View className='flex-row w-full gap-[10px]' >
                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-primaryGreen' onPress={() => { const isOrderCommentAdded = true; setIsOrderCommentModalVisible(false); confirmOrder(isOrderCommentAdded) }} ><Text className='text-center text-white' >Confirm</Text></TouchableOpacity>
                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-[#ccc]' onPress={() => { setIsOrderCommentModalVisible(false); confirmOrder() }} ><Text className='text-center' >Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      }
      <View className='border-b-[5px] border-primary rounded-b-[10px] px-[10px] py-[5px] gap-[5px] bg-white' >
        {selectedDeliveryMode === 'homeDelivery' && <TouchableOpacity onPress={openAddressSheet} className='p-[5px] bg-primary rounded-[5px] absolute top-[0px] right-[5px] z-10' ><Text className='text-white' >Change</Text></TouchableOpacity>}
        {selectedDeliveryMode === 'homeDelivery' &&
          <View>

            <Text className='font-bold text-[17px]' >📍{customerAddress.nameForAddress}</Text>

            <View className='flex-row gap-[3px]' >
              <Text className='text-[12px]' >{customerAddress.customerPlotNumber}, </Text>
              <Text className='text-[12px]' >{customerAddress.customerComplexNameOrBuildingName}, </Text>
              <Text className='text-[12px]' >{customerAddress.customerLandmark}, </Text>
              <Text className='text-[12px]' >{customerAddress.customerRoadNameOrStreetName}, </Text>
              <Text className='text-[12px]' >{customerAddress.customerVillageNameOrTownName}</Text>
            </View>

            <View className='flex-row gap-[3px]' >
              <Text className='text-[12px]' >{customerAddress.customerCity}, </Text>
              <Text className='text-[12px]' >{customerAddress.customerState} - </Text>
              <Text className='text-[12px]' >{customerAddress.customerPincode}, </Text>
              <Text className='text-[12px]' >Ph no. {customerAddress.mobileNumberForAddress}</Text>
            </View>
          </View>
        }
        <View className='flex-row gap-[10px]'>
          {vendorFullData?.deliveryModes?.takeaway && (
            <TouchableOpacity
              // onPress={() => setSelectedDeliveryMode('takeaway')}
              onPress={() => handleDeliveryModeChange('takeaway')}
              className={`px-4 py-2 rounded-full border ${selectedDeliveryMode === 'takeaway' ? 'bg-primary border-primary' : 'border-gray-400'
                }`}
            >
              <Text className={`${selectedDeliveryMode === 'takeaway' ? 'text-white' : 'text-gray-700'}`}>
                Takeaway
              </Text>
            </TouchableOpacity>
          )}
          {vendorFullData?.deliveryModes?.selfDelivery && (
            <TouchableOpacity
              // onPress={() => setSelectedDeliveryMode('homeDelivery')}
              onPress={() => handleDeliveryModeChange('homeDelivery')}
              className={`px-4 py-2 rounded-full border ${selectedDeliveryMode === 'homeDelivery' ? 'bg-primary border-primary' : 'border-gray-400'
                }`}
            >
              <Text className={`${selectedDeliveryMode === 'homeDelivery' ? 'text-white' : 'text-gray-700'}`}>
                Home Delivery
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {deliveryModeError !== '' && deliveryModeError && <Text className='text-[12px] text-primaryRed text-center' >{deliveryModeError}</Text>}

        {/* {!isInServiceArea && (
          <Text className='text-center text-primaryRed text-[12px]' >Home Delivery not available in your area.</Text>
        )} */}

        {selectedDeliveryMode === 'takeaway' && deliveryModeError === '' && !deliveryModeError && (
          <TouchableOpacity onPress={() => { if (!vendorFullData.vendorLocation?.latitude || !vendorFullData.vendorLocation?.longitude) { return }; Linking.openURL(`https://www.google.com/maps/place/${vendorFullData.vendorLocation.latitude}+${vendorFullData.vendorLocation.longitude}/`) }} ><Text className='text-center text-primary text-[12px]' ><Text className='font-bold text-primaryRed text-[14px]' >Pickup address:</Text> {vendorFullData.vendorBusinessPlotNumberOrShopNumber}, {vendorFullData.vendorBusinessComplexNameOrBuildingName}, {vendorFullData.vendorBusinessLandmark}, {vendorFullData.vendorBusinessRoadNameOrStreetName}, {vendorFullData.vendorBusinessVillageNameOrTownName}, {vendorFullData.vendorBusinessCity}, {vendorFullData.vendorBusinessState} - {vendorFullData.vendorBusinessPincode}</Text></TouchableOpacity>
        )}

        {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal > 0 && (<Text className='text-center text-[11px]' >Delivery Charge: <Text className='text-primaryRed font-bold' >₹{vendorFullData.deliveryCharge}</Text>. You're just <Text className='text-primaryGreen font-bold' >₹{Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal}</Text> away from <Text className='text-primaryGreen font-bold' >Free Delivery</Text>.</Text>)}
        {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount || 0) === 0 && (<Text className='text-center text-[11px]' >Delivery Charge: <Text className='text-primaryRed font-bold' >₹{vendorFullData.deliveryCharge}</Text></Text>)}
        {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 && Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal <= 0 && (<Text className='text-primaryGreen font-bold text-center' >Free Delivery!</Text>)}
      </View>

      <FlashList
        data={filteredItemsList}
        renderItem={({ item }) => {
          const cartItemIds = Object.keys(cartItems);
          if (!cartItemIds.includes(item.id)) return null

          return (
            <ItemCard
              item={item}
              cartItem={cartItems[item.id] || null}
              onAddToCart={handleAddToCartWithUpdate}
              onIncrement={handleIncrementWithUpdate}
              onDecrement={handleDecrementWithUpdate}
              isStockVisible={false}
            />
          )
        }}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
      />
      <TouchableOpacity onPress={confirmOrder} className='p-[10px] m-[10px] bg-primary rounded-[10px]' ><Text className='text-white text-[18px] text-center' >Confirm Order</Text></TouchableOpacity>
    </View>
  )
}

export default MyCart