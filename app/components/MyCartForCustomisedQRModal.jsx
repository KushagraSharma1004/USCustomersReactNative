import { View, Text, TouchableOpacity, Linking, TextInput, Image, FlatList, Dimensions, ScrollView, Modal } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '@/firebase'
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, increment, deleteDoc, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import ItemCard from './ItemCard';
import { FlashList } from "@shopify/flash-list";
import { useAuth } from '../context/AuthContext';
import { useCart } from "../context/CartContext";
import { decryptData, encryptData } from '../context/hashing'
import Loader from './Loader'
import { RatingStars } from './RatingStars';
import TextInputComponent from './TextInput';

const MyCartForCustomisedQRModal = ({ cartItems, cartCount, cartTotal, fetchCartItems, setCartItemsForCustomisedQR, setIsCartModalVisible, customisedQRId }) => {
    const { customerMobileNumber, customerFullData, vendorOffers } = useAuth()
    const vendorMobileNumber = decryptData(localStorage.getItem('vendor'))
    const [filteredItemsList, setFilteredItemsList] = useState([]);
    const [allItemsList, setAllItemsList] = useState([]);
    const [searchQuery, setSearchQuery] = useState('')
    const [vendorFullData, setVendorFullData] = useState(null)
    const [isCommonLoaderVisible, setIsCommonLoaderVisible] = useState(false)
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
    const [customerMobileNumberFromCustomisedQR, setCustomerMobileNumberFromCustomisedQR] = useState('')
    const [customerNameFromCustomisedQR, setCustomerNameFromCustomisedQR] = useState('')
    const [customisedQRPin, setCustomisedQRPin] = useState('')
    const [customisedQRData, setCustomisedQRData] = useState(null)

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

        let final = Math.max(0, cartTotal - discount);

        setTotalDiscount(discount);
        setFinalAmount(final);
    }, [vendorOffers, cartItems, cartTotal, selectedOffers, vendorFullData]);

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

    const fetchCustomisedQRData = async () => {
        try {
            const customisedQRDocRef = doc(db, 'users', vendorMobileNumber, 'myQRs', decryptData(customisedQRId));
            const customisedQRDocSnap = await getDoc(customisedQRDocRef);
            if (customisedQRDocSnap.exists()) {
                const customisedQRData = { ...customisedQRDocSnap.data(), id: customisedQRDocSnap.data().id };
                setCustomisedQRData(customisedQRData)
            }
        } catch (error) {
            console.log('Error fetching customised QR data: ', error)
        }
    }

    useEffect(() => {
        fetchCustomisedQRData()
    }, [customisedQRId])

    useEffect(() => {
        calculateOffers();
    }, [calculateOffers]);

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
    // useEffect(() => {
    //     const removeInvalidCartItems = async () => {
    //         if (!allItemsList.length || !cartItems) return;

    //         const vendorItemIds = allItemsList.map(item => item.id);
    //         const cartItemIds = Object.keys(cartItems);

    //         // Find invalid cart items (those not in vendor's item list)
    //         const invalidItemIds = cartItemIds.filter(cartId => !vendorItemIds.includes(cartId));

    //         if (invalidItemIds.length === 0) return;

    //         try {
    //             // Get cart from localStorage
    //             const localCart = JSON.parse(localStorage.getItem("cartItems")) || {};

    //             // Remove invalid items for this vendor
    //             invalidItemIds.forEach(itemId => {
    //                 if (localCart[vendorMobileNumber] && localCart[vendorMobileNumber][itemId]) {
    //                     delete localCart[vendorMobileNumber][itemId];
    //                 }
    //             });

    //             // Save updated cart back to localStorage
    //             localStorage.setItem("cartItems", JSON.stringify(localCart));

    //             // Refresh UI
    //             await fetchCartItems();

    //             console.log("Removed invalid cart items:", invalidItemIds);
    //         } catch (error) {
    //             console.error("Error removing invalid cart items:", error);
    //         }
    //     };

    //     removeInvalidCartItems();
    // }, [allItemsList, cartItems, vendorMobileNumber]);

    useEffect(() => {
        const removeInvalidCartItems = async () => {
            if (!allItemsList.length || !cartItems || Object.keys(cartItems).length === 0) return;

            // Create a map of all valid item IDs (base items + variants)
            const validItemIds = new Set();

            allItemsList.forEach(item => {
                // Add base item ID
                validItemIds.add(item.id);

                // Add all variant IDs if they exist
                if (item.variants && Array.isArray(item.variants)) {
                    item.variants.forEach(variant => {
                        if (variant.id) {
                            validItemIds.add(variant.id);
                            validItemIds.add(`${item.id}_${variant.id}`); // Include unique ID for variant items
                        }
                    });
                }
            });

            const cartItemIds = Object.keys(cartItems);
            const invalidItemIds = cartItemIds.filter(cartId => {
                const cartItem = cartItems[cartId];
                // Check if cart item is valid by matching baseItemId or variantId
                return !validItemIds.has(cartId) && !validItemIds.has(cartItem.baseItemId);
            });

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
    }, [allItemsList, cartItems, customerMobileNumber, vendorMobileNumber]);

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
                // console.log('Error fetching vendor details: ', error);
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
                buyingLimit: Number(item?.buyingLimit || 0) || 0
            };
        }

        localStorage.setItem('cartItems', JSON.stringify(localCart));
        setCartItemsForCustomisedQR(localCart); // Update state
        return;
    };

    const handleIncrementWithUpdate = async (itemId) => {
        let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
        if (localCart[vendorMobileNumber] && localCart[vendorMobileNumber][itemId]) {
            if (Number(localCart[vendorMobileNumber][itemId].quantity) === Number(localCart[vendorMobileNumber][itemId]?.buyingLimit || 0)) {
                alert(`Maximum quantity - 'limit: ${localCart[vendorMobileNumber][itemId]?.buyingLimit}' reached for '${localCart[vendorMobileNumber][itemId]?.name} ${localCart[vendorMobileNumber][itemId]?.variantName ? ' - ' + localCart[vendorMobileNumber][itemId]?.variantName : ''}'.\n\nCan't add more quantity.`)
                return
            }
            localCart[vendorMobileNumber][itemId].quantity += 1;
            localCart[vendorMobileNumber][itemId].updatedAt = new Date();
            localStorage.setItem('cartItems', JSON.stringify(localCart));
            setCartItemsForCustomisedQR(localCart);
        }
        return;
    };

    const handleDecrementWithUpdate = async (itemId, currentQty) => {
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
    };

    const confirmOrder = async (isOrderCommentAdded = false) => {

        if (!vendorMobileNumber) {
            alert('Missing vendor information.');
            return;
        }

        try {
            setIsCommonLoaderVisible(true);

            let cartData = {};

            cartData = cartItems || {};
            if (Object.keys(cartData).length === 0) {
                alert('Your cart is empty. Please add items before confirming your order.');
                return;
            }

            // Prepare items and check stock
            const itemsToOrder = [];
            for (const [itemId, cartItem] of Object.entries(cartData)) {
                if (cartItem.quantity <= 0) continue;

                if (cartItem.variantId && cartItem.variantId !== '') {
                    // For variant items - get the base item first
                    const itemRef = doc(db, 'users', vendorMobileNumber, 'list', cartItem.baseItemId);
                    const itemDocSnap = await getDoc(itemRef);

                    if (!itemDocSnap.exists()) {
                        alert(`Item "${cartItem.name}" is no longer available.`);
                        return;
                    }

                    const itemData = itemDocSnap.data();
                    const variant = itemData.variants?.find(v => v.id === cartItem.variantId);

                    if (!variant) {
                        alert(`Variant "${cartItem.name} - ${cartItem.variantName}" is no longer available.`);
                        return;
                    }

                    if (cartItem.quantity > Number(variant.variantStock || 0)) {
                        alert(`Not enough stock for "${cartItem.name}". Available: ${variant.variantStock}, Ordered: ${cartItem.quantity}`);
                        return;
                    }

                    itemsToOrder.push({
                        id: itemId,
                        name: cartItem.name,
                        quantity: cartItem.quantity,
                        price: cartItem.prices,
                        imageURL: itemData.images?.[0] || '',
                        originalStock: itemData.stock || 0,
                        variantId: cartItem.variantId,
                        variantName: cartItem.variantName,
                        baseItemId: cartItem.baseItemId,
                        type: 'variant'
                    });
                } else {
                    // For regular items
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
            }

            if (itemsToOrder.length === 0) {
                alert('No valid items to order.');
                return;
            }

            const itemsToSendWithOrder = itemsToOrder.map(({ id, name, quantity, price, imageURL, variantId, baseItemId, variantName }) => {
                const item = {
                    id,
                    name,
                    quantity,
                    price,
                    imageURL
                };
                if (variantId && variantId !== '') {
                    item.variantId = variantId;
                    item.variantName = variantName;
                    item.baseItemId = baseItemId;
                }
                return item;
            });

            const orderDetails = {
                businessName: vendorFullData?.businessName || '',
                items: itemsToSendWithOrder,
                orderStatus: 'Pending',
                orderTime: new Date(),
                totalAmount: finalAmount || 0, // Use finalAmount instead of cartTotal
                vendorMobileNumber,
                vendorName: vendorFullData?.vendorName || '',
                customerComment: isOrderCommentAdded ? orderComment : '',
                appliedOffers: selectedOffers.map(offerId => {
                    const offer = applicableOffers.find(o => o.id === offerId);
                    return offer ? {
                        id: offer.id,
                        title: offer.title,
                        discount: calculateOfferDiscount(offer, cartTotal, cartItems)
                    } : null;
                }).filter(Boolean),
                totalDiscount: totalDiscount,
                QRCodeLink: customisedQRData?.link || null,
                QRCodeMessage: customisedQRData?.message || null,
                QRCodePin: customisedQRData?.pin || null,
                customerMobileNumberForCustomisedQR: customerMobileNumberFromCustomisedQR || null,
                // customerMobileNumber: customerMobileNumberFromCustomisedQR.length > 0 ? customerMobileNumberFromCustomisedQR : null,
                customerMobileNumber: '1000000001',
                customerNameForCustomisedQR: customerNameFromCustomisedQR || null,
                QRCode: decryptData(customisedQRId) || null,
                QRCodeId: decryptData(customisedQRId) || null,
            };

            if (orderDetails.items.length === 0 || orderDetails.totalAmount <= 0) {
                alert('Order details are incomplete or total amount is zero.');
                return;
            }

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
                if (item.type === 'variant') {
                    // For variants - update the specific variant stock
                    const itemRef = doc(db, 'users', vendorMobileNumber, 'list', item.baseItemId);
                    const itemDoc = await getDoc(itemRef);

                    if (itemDoc.exists()) {
                        const itemData = itemDoc.data();
                        const updatedVariants = itemData.variants.map(variant => {
                            if (variant.id === item.variantId) {
                                return {
                                    ...variant,
                                    variantStock: Number(variant.variantStock) - item.quantity
                                };
                            }
                            return variant;
                        });

                        await updateDoc(itemRef, {
                            variants: updatedVariants
                        });
                    }
                } else {
                    // For regular items
                    const itemRef = doc(db, 'users', vendorMobileNumber, 'list', item.id);
                    await updateDoc(itemRef, { stock: item.originalStock - item.quantity });
                }
            }

            let localCart = JSON.parse(localStorage.getItem('cartItems') || '{}');
            delete localCart[vendorMobileNumber];
            localStorage.setItem('cartItems', JSON.stringify(localCart));
            const storedOrders = localStorage.getItem('OrdersListFromCustomisedQR');
            const ordersList = storedOrders ? JSON.parse(storedOrders) : [];
            ordersList.push(orderDocRef.id);
            localStorage.setItem('OrdersListFromCustomisedQR', JSON.stringify(ordersList));
            setCartItemsForCustomisedQR({})

            setOrderComment('')
            setIsOrderCommentModalShown(false)
            alert('Order confirmed successfully!');
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
            setIsCartModalVisible(false)
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
                                onPress={() => { setIsRatingModalVisible(false); setIsCartModalVisible(false) }}
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
                <TouchableOpacity onPress={() => setIsCartModalVisible(false)} className='mt-[20px]' ><Text className='text-[18px] text-primary text-center underline' >Continue Shopping</Text></TouchableOpacity>
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
                            {customisedQRData?.pin && customisedQRData?.pin !== '' && <Text className='font-bold text-primary text-[18px]' >Add Pin/Comment to Order</Text>}
                            {(!customisedQRData?.pin || customisedQRData?.pin === '') && <Text className='font-bold text-primary text-[18px]' >Add Comment to Order</Text>}
                            {customisedQRData?.pin && customisedQRData?.pin !== '' && <TextInputComponent className={'text-center bg-wheat'} value={customisedQRPin} onChangeText={setCustomisedQRPin} placeholder={'Enter QR Pin (Mandatory)'} />}
                            <Text className='text-[12px] text-center text-primary' >Any special instructions or preferences for your order?</Text>
                            <TextInput value={orderComment} onChangeText={setOrderComment} multiline maxLength={1000} numberOfLines={5} className='rounded-[10px] border border-[#ccc] p-[10px] w-full' placeholder='Enter any special instructions, cooking preference, or notes for the vendor...' />
                            <TextInputComponent keyboardType={'numeric'} value={customerMobileNumberFromCustomisedQR} onChangeText={setCustomerMobileNumberFromCustomisedQR} placeholder={'Enter your mobile number (Optional)'} maxLength={10} />
                            <TextInputComponent value={customerNameFromCustomisedQR} onChangeText={setCustomerNameFromCustomisedQR} placeholder={'Enter your name (Optional)'} />
                            <View className='flex-row w-full gap-[10px]' >
                                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-primaryGreen'
                                    onPress={() => {
                                        if (customisedQRData?.pin && customisedQRData?.pin !== '') {
                                            if (customisedQRData?.pin !== customisedQRPin) {
                                                alert('Incorrect QR Pin.')
                                                return
                                            }
                                        }
                                        if (customerMobileNumberFromCustomisedQR.length > 0) {
                                            if (customerMobileNumberFromCustomisedQR.length !== 10) {
                                                alert('Invalid mobile number.')
                                                return
                                            }
                                        }
                                        const isOrderCommentAdded = true;
                                        setIsOrderCommentModalVisible(false);
                                        confirmOrder(isOrderCommentAdded)
                                    }} >
                                    <Text className='text-center text-white' >Confirm</Text>
                                </TouchableOpacity>
                                <TouchableOpacity className='p-[10px] rounded-[10px] flex-1 bg-[#ccc]' onPress={() => { setIsOrderCommentModalVisible(false); setIsOrderCommentModalShown(false); }} ><Text className='text-center' >Back</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            }

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 5, gap: 3 }}
            >
                <FlashList
                    data={Object.values(cartItems || {})} // Use cart items directly as data source
                    renderItem={({ item: cartItem }) => {
                        // Find the corresponding base item from vendor's inventory
                        const baseItem = allItemsList.find(dbItem => {
                            // For regular items
                            if (dbItem.id === cartItem.id && (!cartItem.variantId || cartItem.variantId === '')) {
                                return true;
                            }
                            // For variant items - find the base item that contains this variant
                            if (cartItem.variantId && cartItem.variantId !== '') {
                                if (dbItem.variants) {
                                    return dbItem.variants.some(variant => variant.id === cartItem.variantId);
                                }
                            }
                            return false;
                        });

                        if (!baseItem) {
                            console.log('❌ No base item found for cart item:', cartItem);
                            return null;
                        }

                        return (
                            <ItemCard
                                key={cartItem.id}
                                item={baseItem}
                                cartItems={cartItems}
                                onAddToCart={handleAddToCartWithUpdate}
                                onIncrement={handleIncrementWithUpdate}
                                onDecrement={handleDecrementWithUpdate}
                                isStockVisible={false}
                                isVariantsSelectorDisabled={true}
                                offerBadge={selectedOffers.some(offerId => {
                                    const offer = applicableOffers.find(o => o.id === offerId);
                                    return offer?.applicableItems?.some(appItem => appItem.id === baseItem.id);
                                })}
                                variantId={cartItem.variantId} // Pass the variantId from cartItem
                            />
                        );
                    }}
                    keyExtractor={(cartItem) => cartItem.id?.toString() || Math.random().toString()}
                    estimatedItemSize={200}
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

export default MyCartForCustomisedQRModal