import { View, Text, TouchableOpacity, Linking, TextInput, Image, FlatList, Dimensions, ScrollView, Modal } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import Header from '../components/Header';
import { db } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, deleteDoc, onSnapshot, serverTimestamp, addDoc } from 'firebase/firestore';
import ItemCard from '../components/ItemCard';
import MultipleItemsCard from '../components/MutipleItemsCard';
import { FlashList } from "@shopify/flash-list";
import { useAuth } from '../context/AuthContext';
import { useCart } from "../context/CartContext";
import { decryptData, encryptData } from '../context/hashing'
import Loader from '../components/Loader'
import ConfirmationModal from '../components/ConfirmationModal';
import MyVendorsListModal from '../components/MyVendorsListModal';
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { RatingStars } from '../components/RatingStars';
import MyCartForCustomisedQRModal from '../components/MyCartForCustomisedQRModal'

const Vendors = () => {
  const { customerMobileNumber, fetchMyVendors, setCustomerMobileNumber, fetchVendorOffers } = useAuth()
  const router = useRouter()
  const params = useLocalSearchParams()
  const screenWidth = Dimensions.get('window').width;
  const vendorMobileNumber = decryptData(params.vendor)
  const [isCommonLoaderVisible, setIsCommonLoaderVisible] = useState(false)
  const [vendorFullData, setVendorFullData] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(false)
  const [carouselData, setCarouselData] = useState([]);
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filteredItemsList, setFilteredItemsList] = useState([]);
  const [allItemsList, setAllItemsList] = useState([]); // Add this near filteredItemsList state
  const { cartItems, fetchCartItems } = useCart();
  const [isMyVendorsListModalVisible, setIsMyVendorsListModalVisible] = useState(false)
  const [isRemoveVendorFromMyVendorsListConfirmationModalVisible, setIsRemoveVendorFromMyVendorsListConfirmationModalVisible] = useState(false)
  const [vendorMobileNumberToRemoveFromMyVendorsList, setVendorMobileNumberToRemoveFromMyVendorsList] = useState(null)
  const [hasCustomerReadVendorTermsAndConditions, setHasCustomerReadVendorTermsAndConditions] = useState(false)
  const [isVendorTermsAndConditionsModalVisible, setIsVendorTermsAndConditionsModalVisible] = useState(false)
  const [isOfflineModalVisible, setIsOfflineModalVisible] = useState(vendorFullData?.isOffline ?? false);
  const fromQR = params.fromQR === 'true' ? true : false
  const fromCustomisedQR = params.fromCustomisedQR === 'true' ? true : false
  const customisedQRId = params.QR || ''
  const [cartItemsForCustomisedQR, setCartItemsForCustomisedQR] = useState({})
  const [isOrderCommentModalShown, setIsOrderCommentModalShown] = useState(false)
  const [isOrderCommentModalVisible, setIsOrderCommentModalVisible] = useState(false)
  const [orderComment, setOrderComment] = useState('')
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [isCartModalVisible, setIsCartModalVisible] = useState(false)

  useEffect(() => {
    if (fromCustomisedQR) {
      localStorage.removeItem('customerMobileNumber');
      localStorage.setItem('customerMobileNumber', '');
      localStorage.setItem('customerMobileNumber', null);
      localStorage.setItem('customerMobileNumber', 'undefined');
      setCustomerMobileNumber('');
      setTimeout(() => {
        localStorage.removeItem('customerMobileNumber');
        localStorage.setItem('customerMobileNumber', '');
        localStorage.setItem('customerMobileNumber', null);
        localStorage.setItem('customerMobileNumber', 'undefined');
        const stored = localStorage.getItem('customerMobileNumber');
        console.log('✅ Final localStorage value:', stored);
        console.log('✅ Type of value:', typeof stored);
        fetchCartItemsForCustomisedQR()
      }, 200);
    }
  }, [fromCustomisedQR])

  useEffect(() => {
    localStorage.setItem('vendor', params.vendor);

    // Dispatch custom event when vendor changes
    const vendorChangeEvent = new CustomEvent('vendorChanged');
    document.dispatchEvent(vendorChangeEvent);
  }, [params.vendor]);

  useEffect(() => {
    if (params.fromCustomisedQR === 'true') {
      localStorage.setItem('customerMobileNumber', params.fromCustomisedQR);
    }

    // Dispatch custom event when vendor changes
    const fromCustomisedQRChangedEvent = new CustomEvent('fromCustomisedQRChanged');
    document.dispatchEvent(fromCustomisedQRChangedEvent);
  }, [params.fromCustomisedQR]);

  const fetchCartItemsForCustomisedQR = () => {
    try {
      // Get all carts from localStorage
      const storedCart = JSON.parse(localStorage.getItem("cartItems")) || {};

      // Get cart for this vendor only
      const vendorCart = storedCart || {};

      // Update state
      setCartItemsForCustomisedQR(vendorCart);
      return vendorCart;
    } catch (error) {
      console.error("Error fetching cart items:", error);
      setCartItemsForCustomisedQR({});
      return {};
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

      fetchVendorOffers(vendorMobileNumber)

      setVendorFullData(vendorData)
      fetchHasCustomerReadVendorTermsAndConditions(vendorData)
    } catch (error) {
      // console.log('Error fetching vendor details: ', error)
    } finally {
      setIsCommonLoaderVisible(false)
    }
  }

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

  const fetchHasCustomerReadVendorTermsAndConditions = async (vendorFullData) => {
    try {
      const vendorInCustomerRef = doc(db, 'customers', customerMobileNumber, 'vendors', vendorMobileNumber)
      const vendorInCustomerDocSnap = await getDoc(vendorInCustomerRef)
      if (vendorInCustomerDocSnap.exists()) {
        const vendorInCustomerData = vendorInCustomerDocSnap.data()
        if (vendorInCustomerData?.isTermsAndConditionsReaded === true || vendorFullData?.termsAndConditions === '' || vendorFullData?.termsAndConditions === null || vendorFullData?.termsAndConditions === undefined) {
          setIsVendorTermsAndConditionsModalVisible(false)
          setHasCustomerReadVendorTermsAndConditions(true)
        } else {
          setIsVendorTermsAndConditionsModalVisible(true)
          setHasCustomerReadVendorTermsAndConditions(false)
        }
        setHasCustomerReadVendorTermsAndConditions(vendorInCustomerData.areTermsAndConditionsReaded)
      }
    } catch (error) {
      console.log('Error checking has customer readed T&C: ', error)
    }
  }

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

  useEffect(() => {
    localStorage.setItem('vendor', params.vendor)
  }, [])

  useFocusEffect(
    useCallback(() => {
      // Runs when screen is focused (mounted or comes back into view)
      fetchVendorFullData()
      return () => {
        // Optional cleanup when screen goes out of focus
      };
    }, [vendorMobileNumber])
  );

  useEffect(() => {
    fetchCartItems()
  }, [vendorMobileNumber])

  // Inside Vendors component
  useEffect(() => {
    if (!vendorMobileNumber) return;

    const vendorItemsRef = collection(db, 'users', vendorMobileNumber, 'list');
    const unsubscribe = onSnapshot(vendorItemsRef, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllItemsList(items);
        setFilteredItemsList(items);
      } else {
        setAllItemsList([]);
        setFilteredItemsList([]);
      }
    }, (error) => {
      console.log('Error fetching vendor items: ', error);
    });

    return () => unsubscribe(); // cleanup on unmount
  }, [vendorMobileNumber]);

  const handleAddToCartWithUpdate = async (item) => {
    if (!fromCustomisedQR) {
      if (!customerMobileNumber || customerMobileNumber.length !== 10 || fromQR && decryptData(localStorage.getItem('customerMobileNumber')).length !== 10) {
        alert('Please Login/SignUp to continue.')
        localStorage.setItem('registerInVendor', encryptData(vendorMobileNumber))
        router.replace(`/Login`)
        return;
      } else {
        setCustomerMobileNumber(decryptData(localStorage.getItem('customerMobileNumber')))
      }
    }
    const isGuest = !customerMobileNumber || customerMobileNumber.length !== 10 || (fromCustomisedQR && !customerMobileNumber);
    if (isGuest) {
      // Get existing cart from localStorage
      let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');

      // Use vendorMobileNumber as key
      if (!localCart[vendorMobileNumber]) localCart[vendorMobileNumber] = {};

      if (localCart[vendorMobileNumber][item.id]) {
        localCart[vendorMobileNumber][item.id].quantity += 1;
        localCart[vendorMobileNumber][item.id].updatedAt = new Date();
      } else {
        localCart[vendorMobileNumber][item.id] = {
          id: item.id,
          name: item.name,
          price: item.prices[0].sellingPrice,
          prices: item.prices,
          measurement: item.prices[0].measurement,
          quantity: 1,
          stock: item.stock,
          image: item?.images?.[0] || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      localStorage.setItem('cartItems', JSON.stringify(localCart));
      setCartItemsForCustomisedQR(localCart); // Update state
      return;
    }
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
          prices: item.prices,
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
    const isGuest = !customerMobileNumber || customerMobileNumber.length !== 10 || (fromCustomisedQR && !customerMobileNumber);
    if (isGuest) {
      let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
      if (localCart[vendorMobileNumber] && localCart[vendorMobileNumber][itemId]) {
        localCart[vendorMobileNumber][itemId].quantity += 1;
        localCart[vendorMobileNumber][itemId].updatedAt = new Date();
        localStorage.setItem('cartItems', JSON.stringify(localCart));
        setCartItemsForCustomisedQR(localCart);
      }
      return;
    }
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
    const isGuest = !customerMobileNumber || customerMobileNumber.length !== 10 || (fromCustomisedQR && !customerMobileNumber);
    if (isGuest) {
      let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
      if (localCart[vendorMobileNumber] && localCart[vendorMobileNumber][itemId]) {
        if (currentQty <= 1) {
          delete localCart[vendorMobileNumber][itemId];
        } else {
          localCart[vendorMobileNumber][itemId].quantity -= 1;
          localCart[vendorMobileNumber][itemId].updatedAt = new Date();
        }
        localStorage.setItem('cartItems', JSON.stringify(localCart));
        setCartItemsForCustomisedQR(localCart);
      }
      return;
    }
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

  useEffect(() => {
    if (vendorFullData?.banners?.length > 0) {
      setCarouselData(vendorFullData.banners.map((bannerUrl, index) => ({
        id: `banner-${index}`, // Use a unique ID for each banner
        image: { uri: bannerUrl }
      })));
    } else {
      setCarouselData([]); // Clear the carousel if no banners are available
    }
  }, [vendorFullData]);

  useEffect(() => {
    setIsOfflineModalVisible(vendorFullData?.isOffline ?? false);
  }, [vendorFullData?.isOffline, vendorFullData]);

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  });

  const viewConfigRef = useRef({
    viewAreaCoveragePercentThreshold: 50,
    waitForInteraction: true,
  });

  // Auto-scroll effect for carousel
  useEffect(() => {
    let intervalId;
    if (carouselData.length > 1) {
      intervalId = setInterval(() => {
        setActiveIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % carouselData.length;
          carouselRef.current?.scrollToOffset({
            offset: nextIndex * screenWidth,
            animated: true,
          });
          return nextIndex;
        });
      }, 5000);
    }

    return () => clearInterval(intervalId);
  }, [carouselData.length, screenWidth]);

  const numberedItems = [];
  let counter = filteredItemsList.length;

  filteredItemsList.forEach((item, index) => {
    const nameGroup = filteredItemsList.filter(
      (itm) => itm.name.toLowerCase() === item.name.toLowerCase()
    );

    const firstIndexOfGroup = filteredItemsList.findIndex(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );

    // If this is the first occurrence of a group
    if (nameGroup.length > 1 && firstIndexOfGroup === index) {
      nameGroup.forEach((gItem) => {
        numberedItems.push({ ...gItem, itemNumber: counter });
        counter--;
      });
    }

    // If it's a single item
    if (nameGroup.length === 1) {
      numberedItems.push({ ...item, itemNumber: counter });
      counter--;
    }
  })

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
    } catch (e) {
      // Show error toast or alert
    }
    setIsCommonLoaderVisible(false);
  }

  const confirmOrder = async (isOrderCommentAdded = false) => {
    if (!vendorMobileNumber) {
      alert('Missing vendor information.');
      return;
    }

    try {
      setIsCommonLoaderVisible(true);

      // Determine cart source
      let cartData = {};

      cartData = cartItemsForCustomisedQR[vendorMobileNumber] || {};
      if (Object.keys(cartData).length === 0) {
        alert('Your cart is empty. Please add items before confirming your order.');
        return;
      }

      // Prepare items and check stock
      const itemsToOrder = [];
      for (const [itemId, cartItem] of Object.entries(cartData)) {
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

      // Create order details
      const orderDetails = {
        businessName: vendorFullData?.businessName || '',
        items: itemsToOrder.map(({ id, name, quantity, price, imageURL }) => ({
          id, name, quantity, price, imageURL
        })),
        orderStatus: 'Pending',
        orderTime: new Date(),
        totalAmount: Object.values(cartItemsForCustomisedQR[vendorMobileNumber]).reduce((total, item) => total + (item.price * item.quantity), 0) || 0,
        vendorMobileNumber: vendorMobileNumber,
        vendorName: vendorFullData?.vendorName || '',
        QRCode: decryptData(customisedQRId) || null,
        customerComment: isOrderCommentAdded ? orderComment : '',
      };

      if (orderDetails.items.length === 0 || orderDetails.totalAmount <= 0) {
        alert('Order details are incomplete or total amount is zero.');
        return;
      }

      // if (fromCustomisedQR) {
      //   // Save order to localStorage for guest
      //   let localOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
      //   localOrders.push(orderDetails);
      //   localStorage.setItem('myOrders', JSON.stringify(localOrders));

      //   // Add vendor to customer's vendors list in localStorage
      //   let localVendors = JSON.parse(localStorage.getItem('vendors') || '{}');
      //   localVendors[vendorMobileNumber] = {
      //     addedAt: new Date().toISOString(),
      //     vendorMobileNumber
      //   };
      //   localStorage.setItem('vendors', JSON.stringify(localVendors));

      //   // Clear cart for this vendor
      //   let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
      //   delete localCart[vendorMobileNumber];
      //   localStorage.setItem('cartItems', JSON.stringify(localCart));

      //   setCartItemsForCustomisedQR(localCart);
      //   alert('Order confirmed successfully!');
      //   setOrderComment('');
      //   setIsOrderCommentModalShown(false);
      //   setSelectedDeliveryMode('selectADeliveryMode');
      //   setDeliveryModeError('');
      //   return;
      // }

      // --- Keep normal order flow for logged-in users ---

      if (isOrderCommentModalShown === false) {
        setIsOrderCommentModalVisible(true)
        setIsOrderCommentModalShown(true)
        return
      }

      const customerOrdersRef = collection(db, 'customers', '1000000001', 'myOrders');
      const orderDocRef = await addDoc(customerOrdersRef, orderDetails);

      const customerVendorDocRef = doc(db, 'customers', '1000000001', 'vendors', vendorMobileNumber);
      await setDoc(customerVendorDocRef, {
        vendorMobileNumber,
        addedAt: serverTimestamp()
      });

      const vendorOrdersRef = doc(db, 'users', vendorMobileNumber, 'myOrders', orderDocRef.id);
      await setDoc(vendorOrdersRef, { ...orderDetails, orderId: orderDocRef.id });

      // Update stock
      for (const item of itemsToOrder) {
        const itemRef = doc(db, 'users', vendorMobileNumber, 'list', item.id);
        await updateDoc(itemRef, { stock: item.originalStock - item.quantity });
      }

      let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
      delete localCart[vendorMobileNumber];
      localStorage.setItem('cartItems', JSON.stringify(localCart));
      setCartItemsForCustomisedQR({})

      setOrderComment('')
      setIsOrderCommentModalShown(false)
      setIsRatingModalVisible(true)
      alert('Order confirmed successfully!');

    } catch (error) {
      console.error('Error confirming order:', error);
      alert('Failed to confirm order. Please try again.');
    } finally {
      setIsCommonLoaderVisible(false);
    }
  };

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
                onPress={() => { setIsRatingModalVisible(false); }}
              >
                <Text className='text-white text-center'>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  if (isOfflineModalVisible || vendorFullData?.balance < 12) {
    return (
      <Modal animationType='slide' transparent={true} visible={isOfflineModalVisible || vendorFullData?.balance < 12} >
        <TouchableOpacity className='flex-1' onPress={() => { setIsOfflineModalVisible(false); if (!fromCustomisedQR && !fromQR) router.replace('/Home'); }} >
          <Image className='absolute top-0' resizeMode='stretch' source={require('../../assets/images/closedShutterImage.png')} style={{ height: '100%', width: '100%' }} />
          <Image className='absolute top-[10px] right-[10px] z-50' source={require('../../assets/images/crossImage.png')} style={{ height: 30, width: 30 }} />
          <Text className='mt-[20px] text-[20px] font-bold text-center' >{vendorFullData?.businessName}</Text>
          <Text className='mt-[100px] font-bold text-[25px] text-primaryRed text-center' >CLOSED</Text>
          {vendorFullData?.leaveNotice && vendorFullData?.leaveNotice !== '' && <Text className='mt-[100px] font-bold text-[20px] text-primaryRed text-center' >Notice</Text>}
          {vendorFullData?.leaveNotice && vendorFullData?.leaveNotice !== '' && <Text className='mt-[10px] text-center text-[16px]' >{vendorFullData?.leaveNotice}</Text>}
        </TouchableOpacity>
      </Modal>
    )
  }

  return (
    <View className='flex-1 gap-[1px]'>
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
                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-[#ccc]' onPress={() => { setIsOrderCommentModalVisible(false); confirmOrder() }} ><Text className='text-center' >Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      }

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

      <Modal animationType='slide' transparent={true} visible={isVendorTermsAndConditionsModalVisible}>
        <View className='flex-1 bg-[#00000060] items-center justify-center' >
          <View className='bg-white p-[10px] w-[90%] h-[90%] rounded-[10px]' >
            <TouchableOpacity className='absolute top-[10px] right-[10px] z-50' onPress={() => { router.replace('/Home'); setIsVendorTermsAndConditionsModalVisible(false) }} ><Image style={{ height: 30, width: 30 }} source={require('../../assets/images/crossImage.png')} /></TouchableOpacity>
            <View className='p-[10px] w-full rounded-[10px] max-w-[90%]' ><Text className='text-center text-primaryRed text-[15px]' ><Text className='text-[#E48108FD] font-bold' >{vendorFullData?.businessName}'s</Text> Terms and Condition*</Text></View>
            <ScrollView className='max-h-[85%] p-[5px] border border-[#ccc] rounded-[10px]' >
              <Text>{vendorFullData?.termsAndConditions}</Text>
            </ScrollView>
            <View className='flex-row items-center justify-center gap-[5px] p-[10px]' >
              <BouncyCheckbox
                isChecked={hasCustomerReadVendorTermsAndConditions}
                disableText
                fillColor="green"
                size={25}
                iconComponent={<Image style={{ height: 15, width: 15 }} source={require('../../assets/images/checkImage.png')} />}
                useBuiltInState={false}
                iconStyle={{ borderRadius: 5 }}        // outer icon container radius
                innerIconStyle={{ borderRadius: 5 }}   // inner icon radius (important)
                onPress={async () => {
                  const newValue = !hasCustomerReadVendorTermsAndConditions;
                  setHasCustomerReadVendorTermsAndConditions(newValue);
                  await updateDoc(doc(db, 'customers', customerMobileNumber, 'vendors', vendorMobileNumber), {
                    isTermsAndConditionsReaded: newValue
                  });
                  setIsVendorTermsAndConditionsModalVisible(false);
                }}
              />
              <Text className='text-[15px] leading-none' >I Agree</Text>
            </View>
          </View>
        </View>
      </Modal>

      {decryptData(localStorage.getItem('customerMobileNumber')).length === 10 && <Header setIsMyVendorsListModalVisible={setIsMyVendorsListModalVisible} />}

      <View className='w-full self-center bg-white rounded-b-[10px] border border-[#ccc] px-[10px]' >
        {fromCustomisedQR && (
          <>
            <TouchableOpacity onPress={() => router.push('/Login')} className='flex-row items-center justify-center gap-[10px]' >
              <Image style={{ height: 40, width: 40 }} source={require('../../assets/images/iconRoundImage.png')} />
              <Text className='font-bold text-primary' >Explore more with unoshops.com</Text>
            </TouchableOpacity>
            <View className='border-b border-[#ccc]' />
          </>
        )}
        <View className='p-[10px] w-full flex-row items-center justify-between' >
          <Text className='text-center text-[16px] text-primaryGreen font-bold flex-1 border-r'>{vendorFullData?.businessName}</Text>
          <TouchableOpacity className='px-[10px]' onPress={() => Linking.openURL(`tel:${vendorMobileNumber}`)} ><Text className='text-primary text-center' >Call 📞</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView className='flex-1 pb-[50px]' >
        {carouselData.length > 0 && <View style={{ height: 180, width: '100%', marginBottom: 5 }}>
          <FlatList
            data={carouselData}
            renderItem={({ item }) => (
              <Image
                source={item.image}
                style={{ width: screenWidth, height: 180, borderRadius: 7, maxWidth: '450px' }} // 👈 match width with snapToInterval
                resizeMode="stretch"
              />
            )}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewConfigRef.current}
            ref={carouselRef}
            snapToInterval={screenWidth} // 👈 match width
            decelerationRate="fast"
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })} // 👈 required for scrollToIndex
          />

          {/* Dots only when real banners exist */}
          {carouselData.length > 0 && (
            <View className="flex-row justify-center absolute bottom-2 w-full">
              {carouselData.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 ${index === activeIndex ? 'bg-white' : 'bg-gray-400'
                    }`}
                />
              ))}
            </View>
          )}
        </View>}

        <FlashList
          data={numberedItems}
          renderItem={({ item }) => {
            // const isItemHidden = item?.hidden ?? false;
            const nameGroup = numberedItems.filter(
              (itm) => itm.name.toLowerCase() === item.name.toLowerCase() && itm.hidden !== true
            );
            const isItemsMultiple = nameGroup.length > 1;
            const firstIndexOfGroup = numberedItems.findIndex(
              (i) => i.name.toLowerCase() === item.name.toLowerCase()
            );

            const cartSource = fromCustomisedQR ? cartItemsForCustomisedQR[vendorMobileNumber] || {} : cartItems;

            if (isItemsMultiple && numberedItems[firstIndexOfGroup].id === item.id) {
              return (
                <View className="bg-[white] rounded-[10px] mb-[2px] gap-[3px]">
                  <Text className="text-base font-bold m-[5px] text-white text-center bg-primary rounded-[10px] p-[7px]  border-[3px] border-black">
                    {item.name}
                  </Text>

                  <FlatList
                    data={nameGroup}
                    keyExtractor={(itm) => itm.id}
                    horizontal
                    renderItem={({ item: groupedItem, index: groupedItemIndex }) => {
                      const isItemHidden = groupedItem?.hidden ?? false;
                      if (isItemHidden) return null
                      return (
                        <View className="mr-2">
                          <MultipleItemsCard
                            item={groupedItem}
                            innerIndex={nameGroup.length - groupedItemIndex}
                            cartItem={cartSource[groupedItem.id] || null} // Get cart item for this specific product
                            onAddToCart={handleAddToCartWithUpdate}
                            onIncrement={handleIncrementWithUpdate}
                            onDecrement={handleDecrementWithUpdate}
                          />
                        </View>
                      )
                    }}
                  />
                </View>
              );
            }

            if (!isItemsMultiple) {
              const isItemHidden = item?.hidden ?? false;
              if (isItemHidden) return null
              return (
                <ItemCard
                  item={item}
                  cartItem={cartSource[item.id] || null}
                  onAddToCart={handleAddToCartWithUpdate}
                  onIncrement={handleIncrementWithUpdate}
                  onDecrement={handleDecrementWithUpdate}
                />
              );
            }

            return null;
          }}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        />

      </ScrollView>

      {/* {!isSearchBarVisible && (
        <TouchableOpacity
          className="absolute bottom-[5px] z-[10] left-[1px] p-[10px] items-center justify-center rounded-r-[10px] bg-wheat"
          onPress={() => router.push('/MyCart')}
        >
          {cartCount > 0 && <Text className='absolute top-[5px] right-[5px] rounded-full bg-black z-20 p-[2px] text-white' >{cartCount}</Text>}
          <Image style={{ height: 30, width: 30 }} source={require('../../assets/images/myCartImage.png')} />
          {cartTotal > 0 && <Text className='font-bold text-[12px]' >₹{cartTotal}</Text>}
        </TouchableOpacity>
      )} */}

      {!isSearchBarVisible && (
        <TouchableOpacity
          className={`absolute z-[10] bottom-[5px] right-[0px] p-[10px] items-center justify-center rounded-l-[10px] bg-primary`}
          onPress={() => setIsSearchBarVisible(true)}
        >
          <Text className="text-[20px]">🔍</Text>
        </TouchableOpacity>
      )}

      {isSearchBarVisible && <View className='max-w-[96%] justify-center items-center flex-row self-center fixed bottom-[5px]' >
        {fromCustomisedQR && cartItemsForCustomisedQR[vendorMobileNumber] && Object.keys(cartItemsForCustomisedQR[vendorMobileNumber]).length > 0 && <TouchableOpacity className='w-fit bg-primaryGreen p-[10px] rounded-[10px] mr-[5px]' ><Text className='text-white text-center font-bold text-[14px]' >Confirm Order</Text></TouchableOpacity>}
        <TextInput
          className='flex-1 py-[12px] px-[15px] border-[#ccc] border rounded-l-full bg-white text-base text-gray-800 outline-none focus:outline-none focus:border-[#ccc] focus:bg-white'
          placeholder='🔍 Search by Name'
          value={searchQuery}
          onChangeText={setSearchQuery} // Update search query state
        />
        <TouchableOpacity onPress={() => { setIsSearchBarVisible(false); setSearchQuery('') }}><Image style={{ height: 50, width: 60 }} className='p-[10px] bg-primaryRed rounded-r-full' source={require('../../assets/images/crossImage.png')} /></TouchableOpacity>
      </View>}

      {!isSearchBarVisible && fromCustomisedQR && cartItemsForCustomisedQR[vendorMobileNumber] && Object.keys(cartItemsForCustomisedQR[vendorMobileNumber]).length > 0 &&
        <TouchableOpacity onPress={() => setIsCartModalVisible(true)} className='p-[10px] my-[5px] bg-primary rounded-[5px] w-[85%] left-[10px]' >
          <Text className='text-white text-[18px] text-center items-center justify-center'>Confirm Order <Text className='h-[30px] w-[50px] rounded-full items-center justify-center bg-white text-black text-[13px] p-[2px]' >{Object.values(cartItemsForCustomisedQR[vendorMobileNumber]).reduce((total, item) => total + item.quantity, 0)}</Text></Text>
          <Text className='text-white text-[12px] text-center'>Total: ₹{Object.values(cartItemsForCustomisedQR[vendorMobileNumber]).reduce((total, item) => total + (item.price * item.quantity), 0)}</Text>
        </TouchableOpacity>
      }

      <MyVendorsListModal vendorMobileNumber={vendorMobileNumber} isMyVendorsListModalVisible={isMyVendorsListModalVisible} setIsMyVendorsListModalVisible={setIsMyVendorsListModalVisible} setIsRemoveVendorFromMyVendorsListConfirmationModalVisible={setIsRemoveVendorFromMyVendorsListConfirmationModalVisible} setVendorMobileNumberToRemoveFromMyVendorsList={setVendorMobileNumberToRemoveFromMyVendorsList} />

      {isCartModalVisible && (
        <Modal animationType='slide' transparent={true} visible={isCartModalVisible} >
          <View className='flex-1 bg-[#00000060] items-center justify-center p-[10px]' >
            <ScrollView stickyHeaderIndices={[0]} className='bg-white h-full w-full rounded-[10px] border-[5px]' >
              <TouchableOpacity onPress={() => setIsCartModalVisible(false)} className='w-full bg-white mb-[5px] items-center border-b-[5px] border-primary rounded-[10px] p-[10px]' >
                <Image style={{ height: 30, width: 30 }} className='absolute left-[5px] top-[5px]' source={require('../../assets/images/arrowLeftImage.png')} />
                <Text className='text-[18px] font-bold text-center flex-1 text-primary' >My Cart</Text>
              </TouchableOpacity>
              <MyCartForCustomisedQRModal
                cartItems={cartItemsForCustomisedQR[vendorMobileNumber] || null}
                cartCount={cartItemsForCustomisedQR[vendorMobileNumber] ? Object.values(cartItemsForCustomisedQR[vendorMobileNumber]).reduce((total, item) => total + item.quantity, 0) : 0}
                cartTotal={cartItemsForCustomisedQR[vendorMobileNumber] ? Object.values(cartItemsForCustomisedQR[vendorMobileNumber]).reduce((total, item) => total + (item.price * item.quantity), 0) : 0}
                fetchCartItems={fetchCartItemsForCustomisedQR}
                setCartItemsForCustomisedQR={setCartItemsForCustomisedQR}
                setIsCartModalVisible={setIsCartModalVisible}
                customisedQRId={customisedQRId}>
              </MyCartForCustomisedQRModal>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  )
}

export default Vendors