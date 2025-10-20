import { View, Text, TouchableOpacity, Linking, TextInput, Image, FlatList, Dimensions, ScrollView, Modal } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import ItemCard from '../components/ItemCard';
import { FlashList } from "@shopify/flash-list";
import { useAuth } from '../context/AuthContext';
import { useCart } from "../context/CartContext";
import { decryptData, encryptData } from '../context/hashing'
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import Loader from '../components/Loader'
import { useAddressSheet } from '../context/AddressSheetContext'
import { useServiceAreaCheck } from '../hooks/useServiceAreaCheck';
import { RatingStars } from '../components/RatingStars';

const MyCart = () => {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { customerMobileNumber, customerAddress, customerFullData, vendorOffers } = useAuth()
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
  const [isOffersSectionOpen, setIsOffersSectionOpen] = useState(false)
  const [applicableOffers, setApplicableOffers] = useState([]);
  const [selectedOffers, setSelectedOffers] = useState([]);
  const [finalAmount, setFinalAmount] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [isVendorVisiting, setIsVendorVisiting] = useState(decryptData(params.isVendorVisiting) === 'true' ? true : false)

  const calculateOffers = useCallback(() => {
    if (!vendorOffers || !cartItems || Object.keys(cartItems).length === 0) {
      setApplicableOffers([]);
      setTotalDiscount(0);
      setFinalAmount(cartTotal);
      return;
    }

    // Find all applicable offers (respecting minimum order amount)
    const allApplicableOffers = vendorOffers.filter(offer => {
      if (offer.minimumOrderAmount && cartTotal < offer.minimumOrderAmount) {
        return false;
      }
      return true;
    });

    setApplicableOffers(allApplicableOffers);

    // Calculate discount based on selected offers only (no auto-selection)
    let discount = 0;

    if (selectedOffers.length > 0) {
      // Use manually selected offer (only one allowed)
      const offerId = selectedOffers[0];
      const offer = allApplicableOffers.find(o => o.id === offerId);
      if (offer) {
        discount = calculateOfferDiscount(offer, cartTotal, cartItems);
      }
    }

    // Calculate final amount with delivery charge if applicable
    let final = Math.max(0, cartTotal - discount);

    if (selectedDeliveryMode === 'homeDelivery') {
      const deliveryCharge = Number(vendorFullData?.deliveryCharge) || 0;
      const freeDeliveryAbove = Number(vendorFullData?.freeDeliveryAboveAmount || 0);

      if (freeDeliveryAbove === 0 || final < freeDeliveryAbove) {
        final += deliveryCharge;
      }
    }

    setTotalDiscount(discount);
    setFinalAmount(final);
  }, [vendorOffers, cartItems, cartTotal, selectedOffers, selectedDeliveryMode, vendorFullData]);

  useEffect(() => {
    localStorage.setItem('finalAmount', encryptData(String(finalAmount)))
  }, [finalAmount])

  // Helper function to calculate discount for a single offer
  const calculateOfferDiscount = (offer, cartTotal, cartItems) => {
    let discount = 0;

    if (offer.applicableOn === 'All Items') {
      // Apply to entire cart
      if (offer.valueType === '₹') {
        discount = Math.min(offer.value, cartTotal);
      } else if (offer.valueType === '%') {
        discount = (cartTotal * offer.value) / 100;
      }
    } else {
      // Calculate discount
      const applicableItems = offer.applicableItems || []; // array of objects with id
      let applicableItemsTotal = 0;

      Object.values(cartItems).forEach(cartItem => {
        if (applicableItems.some(appItem => appItem.id === cartItem.id)) {
          applicableItemsTotal += cartItem.price * cartItem.quantity;
        }
      });

      if (applicableItemsTotal > 0) {
        if (offer.valueType === '₹') {
          discount = Math.min(offer.value, applicableItemsTotal);
        } else if (offer.valueType === '%') {
          discount = (applicableItemsTotal * offer.value) / 100;
        }
      }
    }

    return discount;
  };

  const toggleOfferSelection = (offerId) => {
    if (selectedOffers.includes(offerId)) {
      setSelectedOffers([])
    } else {
      setSelectedOffers([offerId])
    }
  };

  useEffect(() => {
    calculateOffers();
  }, [calculateOffers]);

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

  // Delete cart items that are not in the vendor's current list
  useEffect(() => {
    const removeInvalidCartItems = async () => {
      if (!allItemsList.length || !cartItems) return;

      const vendorItemIds = allItemsList.map(item => item.id);
      const cartItemIds = Object.keys(cartItems);

      const invalidItemIds = cartItemIds.filter(cartId => !vendorItemIds.includes(cartId));

      if (invalidItemIds.length === 0) return;

      try {
        const deletePromises = invalidItemIds.map(itemId => {
          const docRef = doc(db, 'customers', customerMobileNumber, 'cart', vendorMobileNumber, 'items', itemId);
          return deleteDoc(docRef);
        });
        await Promise.all(deletePromises);
        await fetchCartItems(); // Refresh cart after deletion
        console.log('Removed invalid cart items:', invalidItemIds);
      } catch (error) {
        console.error('Error removing invalid cart items:', error);
      }
    };

    removeInvalidCartItems();
  }, [allItemsList, cartItems]);

  useEffect(() => {
    fetchVendorItemList()
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
      // const orderDetails = {
      //   address: customerAddress,
      //   businessName: vendorFullData?.businessName || '',
      //   customerMobileNumber,
      //   customerName: customerFullData?.customerName || '',
      //   deliveryCharge: Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 ? Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal > 0 ? deliveryCharge : 0 : deliveryCharge,
      //   deliveryMode: selectedDeliveryMode === 'homeDelivery' ? 'Home Delivery' : 'Takeaway/Pickup',
      //   items: itemsToOrder.map(({ id, name, quantity, price, imageURL }) => ({
      //     id, name, quantity, price, imageURL
      //   })),
      //   orderStatus: 'Pending',
      //   orderTime: new Date(),
      //   totalAmount: cartTotal || 0, // Calculate total
      //   vendorMobileNumber,
      //   vendorName: vendorFullData?.vendorName || '',
      //   pickupAddress: selectedDeliveryMode === 'takeaway' ? `${vendorFullData.vendorBusinessPlotNumberOrShopNumber}, ${vendorFullData.vendorBusinessComplexNameOrBuildingName}, ${vendorFullData.vendorBusinessLandmark}, ${vendorFullData.vendorBusinessRoadNameOrStreetName}, ${vendorFullData.vendorBusinessVillageNameOrTownName}, ${vendorFullData.vendorBusinessCity}, ${vendorFullData.vendorBusinessState} - ${vendorFullData.vendorBusinessPincode}` : '',
      //   pickupCoordinates: selectedDeliveryMode === 'takeaway' ? { longitude: vendorFullData.vendorLocation?.longitude, latitude: vendorFullData.vendorLocation?.latitude } : {},
      //   customerComment: isOrderCommentAdded ? orderComment : ''
      // };
      const orderDetails = {
        address: customerAddress,
        businessName: vendorFullData?.businessName || '',
        customerMobileNumber,
        customerName: customerFullData?.customerName || '',
        deliveryCharge: Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 ? Number(vendorFullData.freeDeliveryAboveAmount) - (cartTotal - totalDiscount) > 0 ? deliveryCharge : 0 : deliveryCharge,
        deliveryMode: selectedDeliveryMode === 'homeDelivery' ? 'Home Delivery' : 'Takeaway/Pickup',
        items: itemsToOrder.map(({ id, name, quantity, price, imageURL }) => ({
          id, name, quantity, price, imageURL
        })),
        orderStatus: 'Pending',
        orderTime: new Date(),
        totalAmount: finalAmount || 0, // Use finalAmount instead of cartTotal
        vendorMobileNumber,
        vendorName: vendorFullData?.vendorName || '',
        pickupAddress: selectedDeliveryMode === 'takeaway' ? `${vendorFullData.vendorBusinessPlotNumberOrShopNumber}, ${vendorFullData.vendorBusinessComplexNameOrBuildingName}, ${vendorFullData.vendorBusinessLandmark}, ${vendorFullData.vendorBusinessRoadNameOrStreetName}, ${vendorFullData.vendorBusinessVillageNameOrTownName}, ${vendorFullData.vendorBusinessCity}, ${vendorFullData.vendorBusinessState} - ${vendorFullData.vendorBusinessPincode}` : '',
        pickupCoordinates: selectedDeliveryMode === 'takeaway' ? { longitude: vendorFullData.vendorLocation?.longitude, latitude: vendorFullData.vendorLocation?.latitude } : {},
        customerComment: isOrderCommentAdded ? orderComment : '',
        appliedOffers: selectedOffers.map(offerId => {
          const offer = applicableOffers.find(o => o.id === offerId);
          return offer ? {
            id: offer.id,
            title: offer.title,
            discount: calculateOfferDiscount(offer, cartTotal, cartItems)
          } : null;
        }).filter(Boolean),
        totalDiscount: totalDiscount // Add total discount to order details
      };

      // if (Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 ? Number(vendorFullData.freeDeliveryAboveAmount) - finalAmount > 0 : true) {
      //   orderDetails.totalAmount += Number(deliveryCharge);
      // }

      // if (Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 ? Number(vendorFullData.freeDeliveryAboveAmount) - cartTotal > 0 : true) {
      //   orderDetails.totalAmount += Number(deliveryCharge);
      // }

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
      localStorage.removeItem('finalAmount')

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
      if(isVendorVisiting){
        router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}&isVendorVisiting=${encodeURIComponent(encryptData('true'))}`)
      } else {
        router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}`)
      }
    } catch (e) {
      // Show error toast or alert
    }
    setIsCommonLoaderVisible(false);
  }

  if (isRatingModalVisible) {
    return (
      <Modal animate='heart-beat' visible={true} transparent={true}>
        <View className='flex-1 items-center justify-center bg-[#00000060]' >
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
                onPress={() => { 
                  setIsRatingModalVisible(false);
                  if(isVendorVisiting){
                    router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}&isVendorVisiting=${encodeURIComponent(encryptData('true'))}`) 
                  } else {
                    router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}`) 
                  }
                }}
              >
                <Text className='text-white text-center'>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  if (cartCount === 0) {
    return (
      <View className='flex-1 items-center justify-center gap-[10px]' >
        <Image style={{ height: 300, width: 300 }} source={require('../../assets/images/emptyCartImage.png')} className='rounded-[10px]' />
        <Text className='text-[20px] font-bold text-primaryRed' >Your cart is empty</Text>
        <TouchableOpacity onPress={() => {
          if(isVendorVisiting){
            router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}&isVendorVisiting=${encodeURIComponent(encryptData('true'))}`)
          } else {
            router.push(`/Vendors/?vendor=${encodeURIComponent(localStorage.getItem('vendor'))}`)
          }
        }} className='mt-[20px]' ><Text className='text-[18px] text-primary text-center underline' >Continue Shopping</Text></TouchableOpacity>
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
                maxLength={1000}
                numberOfLines={5}
                className='rounded-[10px] border border-[#ccc] p-[10px] w-full'
                placeholder='Enter any special instructions, cooking preference, or notes for the vendor...'
              />
              <View className='flex-row w-full gap-[10px]' >
                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-primaryGreen' onPress={() => { const isOrderCommentAdded = true; setIsOrderCommentModalVisible(false); confirmOrder(isOrderCommentAdded) }} ><Text className='text-center text-white' >Confirm</Text></TouchableOpacity>
                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-[#ccc]' onPress={() => { setIsOrderCommentModalVisible(false); setIsOrderCommentModalShown(false); }} ><Text className='text-center' >Back</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      }

      <View className='border-b-[5px] border-primary rounded-b-[10px] px-[10px] py-[5px] gap-[5px] bg-white' >
        {selectedDeliveryMode === 'homeDelivery' && !isVendorVisiting && <TouchableOpacity onPress={openAddressSheet} className='p-[5px] bg-primary rounded-[5px] absolute top-[0px] right-[5px] z-10' ><Text className='text-white' >Change</Text></TouchableOpacity>}
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

        {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount) - (cartTotal - totalDiscount) > 0 && (<Text className='text-center text-[11px]' >Delivery Charge: <Text className='text-primaryRed font-bold' >₹{vendorFullData.deliveryCharge}</Text>. You're just <Text className='text-primaryGreen font-bold' >₹{(Number(vendorFullData.freeDeliveryAboveAmount) - Number((cartTotal - totalDiscount))).toFixed(2)}</Text> away from <Text className='text-primaryGreen font-bold' >Free Delivery</Text>.</Text>)}
        {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount || 0) === 0 && (<Text className='text-center text-[11px]' >Delivery Charge: <Text className='text-primaryRed font-bold' >₹{vendorFullData.deliveryCharge}</Text></Text>)}
        {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 && Number(vendorFullData.freeDeliveryAboveAmount) - (cartTotal - totalDiscount) <= 0 && (<Text className='text-primaryGreen font-bold text-center' >Free Delivery!</Text>)}

        {/* {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount) - finalAmount > 0 && (<Text className='text-center text-[11px]' >Delivery Charge: <Text className='text-primaryRed font-bold' >₹{vendorFullData.deliveryCharge}</Text>. You're just <Text className='text-primaryGreen font-bold' >₹{Number(vendorFullData.freeDeliveryAboveAmount) - finalAmount}</Text> away from <Text className='text-primaryGreen font-bold' >Free Delivery</Text>.</Text>)} */}
        {/* {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount || 0) === 0 && (<Text className='text-center text-[11px]' >Delivery Charge: <Text className='text-primaryRed font-bold' >₹{vendorFullData.deliveryCharge}</Text></Text>)} */}
        {/* {selectedDeliveryMode === 'homeDelivery' && isInServiceArea && Number(vendorFullData.freeDeliveryAboveAmount || 0) !== 0 && Number(vendorFullData.freeDeliveryAboveAmount) - finalAmount <= 0 && (<Text className='text-primaryGreen font-bold text-center' >Free Delivery!</Text>)} */}

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 5, gap: 3 }}
      >
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
                offerBadge={selectedOffers.some(offerId => {
                  const offer = applicableOffers.find(o => o.id === offerId);
                  return offer?.applicableItems?.some(appItem => appItem.id === item.id);
                })}

              />
            )
          }}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        />

        {vendorOffers && vendorOffers.length !== 0 && <View className='w-full px-[10px] py-[5px] rounded-[5px] bg-primaryGreen border' >
          <TouchableOpacity onPress={() => setIsOffersSectionOpen(!isOffersSectionOpen)} className='w-full items-center justify-between flex-row' >
            <Text className='font-bold text-[16px] text-white' >OFFERS</Text>
            <Image style={{ height: 25, width: 25 }} className='bg-white rounded-full' source={isOffersSectionOpen ? require('../../assets/images/arrowDownImage.png') : require('../../assets/images/arrowRightImage.png')} />
          </TouchableOpacity>
          {isOffersSectionOpen && (
            <FlatList
              data={vendorOffers.filter((offer) => offer.active)}
              horizontal
              className='mt-[5px]'
              renderItem={({ item }) => {
                const isApplicable = applicableOffers.some(offer => offer.id === item.id);
                const isSelected = selectedOffers.includes(item.id);
                return (
                  <TouchableOpacity
                    onPress={() => isApplicable && toggleOfferSelection(item.id)}
                    className={`flex-row p-[10px] mr-[3px] h-[180px] w-[320px] rounded-[10px] gap-[5px] ${isApplicable ? 'bg-white' : 'bg-gray-100'} ${isSelected ? 'border-2 border-primaryGreen' : 'border border-gray-300'}`}
                    disabled={!isApplicable}
                  >
                    <View className='gap-[5px] items-center justify-center' >
                      {item.applicableOn === 'All Items' && <Text className='font-bold text-center' >Applicable</Text>}
                      {item.applicableOn === 'All Items' && <Text className='font-bold text-center' >on</Text>}
                      {item.applicableOn === 'All Items' && <Text className='font-bold text-center' >All Items</Text>}
                      {item.applicableOn !== 'All Items' && <Text className='font-bold' >Applicable on</Text>}
                      {item.applicableOn !== 'All Items' &&
                        <FlatList
                          data={item.applicableItems}
                          keyExtractor={(appItem, index) => appItem.id || index.toString()}
                          nestedScrollEnabled={true}
                          className='gap-[3px]'
                          renderItem={({ item: appItem }) => (
                            <View className="flex-row items-center border border-[#ccc] p-[5px] rounded-[5px]">
                              {appItem.image && (
                                <Image
                                  source={{ uri: appItem.image }}
                                  style={{ width: 32, height: 32 }}
                                  className="rounded mr-1"
                                />
                              )}
                              <View>
                                <Text className="text-[10px] text-gray-700 text-center">{appItem.name}</Text>
                                <Text className="text-[10px] text-gray-700 text-center">₹{appItem.sellingPrice}</Text>
                              </View>
                            </View>
                          )}
                        />
                      }
                    </View>

                    <View className='h-full border-l border-[#ccc] pr-[5px]' />

                    <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ gap: 3 }} className='gap-[5px] flex-1' >
                      <View className='flex-row justify-between items-center bg-white'>
                        <Text className='font-bold text-primary text-[16px]' >{item.title}</Text>
                        {isApplicable && <Text className={`${isSelected ? 'text-primaryGreen font-bold' : 'text-[#ccc] border border-[#ccc] rounded-[5px] px-[10px] py-[2px]'}`}>{isSelected ? '✓ Applied' : 'Apply'}</Text>}
                        {!isApplicable && <Text className='text-primaryRed text-[12px]'>Not applicable</Text>}
                      </View>
                      <View className='w-full pb-[3px] border-b border-[#ccc]' />
                      <Text className='text-[20px] font-bold text-primaryGreen' >{item.valueType === '₹' ? `₹${item.value}` : `${item.value}%`} OFF</Text>
                      {item.minimumOrderAmount ? <Text className='' >Min. Order value: ₹{item.minimumOrderAmount}</Text> : ''}
                      <Text className='text-[12px]' >{item.description}</Text>
                    </ScrollView>
                  </TouchableOpacity>
                )
              }}
            />
          )}

        </View>}

        {/* Offer Summary */}
        <View className='p-[10px] bg-green-50 rounded-[10px] border border-green-200'>
          <View className={`border-green-200 `}>
            <View className='flex-row justify-between items-center'>
              <Text className='text-[12px]'>Sub Total</Text>
              <Text className='text-[12px]'>₹{cartTotal.toFixed(2)}</Text>
            </View>
            {selectedOffers.length !== 0 && <View className='flex-row justify-between items-center mt-[5px]'>
              <Text className='text-[12px] text-primaryGreen'>Total Discount</Text>
              <Text className='text-[12px] font-bold text-primaryGreen'>-₹{totalDiscount.toFixed(2)}</Text>
            </View>}
            {Number((cartTotal - totalDiscount)) + Number(vendorFullData?.deliveryCharge) === finalAmount && <View className='flex-row justify-between items-center mt-[5px]'>
              <Text className='text-[12px] text-primaryRed'>Delivery Charge</Text>
              <Text className='text-[13px] text-primaryRed'>+₹{Number(vendorFullData?.deliveryCharge)}</Text>
            </View>}
            <View className='border-b-[1px] border-[#ccc] mt-[5px]' />
            <View className='flex-row justify-between items-center mt-[5px]'>
              <Text className='text-[14px] font-bold text-primary'>Final Amount</Text>
              <Text className='text-[14px] font-bold text-primary'>₹{finalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>
        {/* )} */}

        <TouchableOpacity onPress={confirmOrder} className='p-[10px] my-[10px] bg-primary rounded-[5px]' >
          <Text className='text-white text-[18px] text-center'>Confirm Order</Text>
          <Text className='text-white text-[12px] text-center'>
            Total: ₹{finalAmount.toFixed(2)} {totalDiscount > 0 && `(Saved ₹${totalDiscount.toFixed(2)})`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

    </View>
  )
}

export default MyCart