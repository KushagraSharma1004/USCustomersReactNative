import { View, Text, FlatList, TouchableOpacity, Linking, Image, ScrollView, TextInput } from 'react-native'
import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, documentId } from "firebase/firestore";
import { db } from '@/firebase'
import { FlashList } from '@shopify/flash-list'
import OrderItemCard from './OrderItemCard'

const HighlightText = ({ text, highlight, className }) => {
    if (!highlight.trim()) return <Text className={className} >{text}</Text>;

    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = String(text).split(regex);

    return (
        <Text className={className} >
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <Text key={i} style={{ backgroundColor: 'black', color: 'white' }}>
                        {part}
                    </Text>
                ) : (
                    <Text key={i}>{part}</Text>
                )
            )}
        </Text>
    );
};

const extractStrings = (value) => {
    if (typeof value === 'string' || typeof value === 'number') {
        return [String(value)];
    }
    if (Array.isArray(value)) {
        return value.flatMap(v => extractStrings(v));
    }
    if (typeof value === 'object' && value !== null) {
        return Object.values(value).flatMap(v => extractStrings(v));
    }
    return [];
};

const MyOrdersForCustomisedQRModal = () => {
    const [allOrders, setAllOrders] = useState([])
    const [filteredOrders, setFilteredOrders] = useState(allOrders)
    const [searchText, setSearchText] = useState('')

    const fetchAllOrders = () => {
        try {
            // Step 1: Get the order IDs stored locally
            const storedOrders = JSON.parse(localStorage.getItem('OrdersListFromCustomisedQR') || '[]');

            // Step 2: If no stored orders, clear state and return early
            if (storedOrders.length === 0) {
                setAllOrders([]);
                return;
            }

            // Step 3: Create reference to the Firestore collection
            const customerOrdersRef = collection(db, 'customers', '1000000001', 'myOrders');

            // Step 4: Fetch only documents whose IDs are in storedOrders
            const q = query(customerOrdersRef, where(documentId(), 'in', storedOrders));

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const orders = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllOrders(orders);
            });

            return unsubscribe; // Return unsubscribe for cleanup
        } catch (error) {
            console.log('Error fetching Orders: ', error);
        }
    };

    useEffect(() => {
        fetchAllOrders()
    }, [])

    useEffect(() => {
        if (!searchText.trim()) {
            setFilteredOrders(allOrders);
            return;
        }

        const lowerSearch = searchText.toLowerCase();

        const filteredOrdersBySearch = allOrders.filter(order => {
            const allValues = extractStrings(order);
            return allValues.some(str => str.toLowerCase().includes(lowerSearch));
        });

        setFilteredOrders(filteredOrdersBySearch);
    }, [searchText, allOrders]);

    return (
        <View className='pb-[5px] px-[5px] flex-1 gap-[5px]'>
            <View className='flex-row gap-[5px] p-[5px] items-center bg-white rounded-b-[10px]' >
                <Image source={require('../../assets/images/iconRoundImage.png')} style={{ height: 30, width: 30 }} className='ronuded-full' /><Text>My Orders</Text>
                <TextInput
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder='Search orders...'
                    className='flex-1 ml-[10px] p-[10px] border border-[#ccc] rounded-[5px]'
                />
            </View>
            <FlashList
                data={filteredOrders.sort((a, b) => b.orderTime - a.orderTime)}
                renderItem={({ item, index }) => {
                    return (
                        <View className={`py-[10px] px-[5px] self-center ${item.orderStatus === 'Pending' ? 'bg-[#FFF3CD]' : item.orderStatus === 'Approved' ? 'bg-[#D4EDDA]' : 'bg-[#F8D7DA]'} rounded-[10px] w-full gap-[10px] mb-[3px] border-y-[5px] border-primary`} >
                            <Text className='font-bold text-primary' >
                                Order ID: <HighlightText text={item.id} highlight={searchText} />
                            </Text>
                            {item.QRCodeMessage && (
                                <View className='w-full flex-row' >
                                    <HighlightText className={'font-bold text-center w-full text-primaryRed text-[20px]'} text={item.QRCodeMessage} highlight={searchText} />
                                </View>
                            )}
                            <View className='w-full flex-row' >
                                <Text className='font-bold' >Vendor Name:</Text>
                                <Text className='flex-1 text-right' >
                                    <HighlightText text={item.businessName} highlight={searchText} />
                                </Text>
                            </View>
                            <View className='w-full flex-row' >
                                <Text className='font-bold' >Vendor Mobile Number:</Text>
                                <Text className='flex-1 text-right' >
                                    <HighlightText text={item.vendorMobileNumber} highlight={searchText} />
                                </Text>
                            </View>
                            <View className='border-b-[1px] border-[#ccc]' ></View>
                            <View className='w-full flex-row' >
                                <Text className='font-bold' >Time:</Text>
                                <Text className='flex-1 text-right' >
                                    <HighlightText text={item.orderTime ? item.orderTime.toDate().toLocaleString() : ''} highlight={searchText} />
                                </Text>
                            </View>
                            <View className='border-b-[1px] border-[#ccc]' ></View>
                            <View className='w-full flex-row' >
                                <Text className='font-bold' >Status:</Text>
                                <Text className={`flex-1 text-right font-bold ${item.orderStatus === 'Pending' ? '' : item.orderStatus === 'Approved' ? 'text-primaryGreen' : 'text-primaryRed'}`} >
                                    <HighlightText text={item.orderStatus} highlight={searchText} />
                                </Text>
                            </View>

                            <View className='w-full flex-row' >
                                <Text className='font-bold' >Sub Total:</Text>
                                <Text className='flex-1 text-right' >
                                    <HighlightText
                                        text={`₹${Number((item.totalAmount ?? 0) - (item.deliveryCharge ?? 0) + (item.appliedOffers?.[0]?.discount ?? 0))}`}
                                        highlight={searchText}
                                    />

                                </Text>
                            </View>

                            {item.appliedOffers && item.appliedOffers[0] &&
                                <View className='w-full flex-row' >
                                    <Text className='font-bold text-primaryGreen' >Offer applied: {item.appliedOffers[0]?.title}</Text>
                                    <Text className='flex-1 text-right text-primaryGreen' >
                                        <HighlightText text={`₹${item.appliedOffers[0]?.discount}`} highlight={searchText} />
                                    </Text>
                                </View>
                            }

                            <View className='w-full flex-row' >
                                <Text className='font-bold text-primary text-[16px]' >Total Amount:</Text>
                                <Text className='flex-1 text-right font-bold text-primary text-[16px]' >
                                    <HighlightText text={`₹${item.totalAmount}`} highlight={searchText} />
                                </Text>
                            </View>

                            <View className='w-full rounded-[5px] bg-[#F0F2F5] gap-[5px] px-[3px] pb-[3px] pt-[3px]' >
                                <Text className='text-right font-bold' >Items</Text>
                                <FlatList
                                    data={item.items}
                                    renderItem={({ item, index }) => {
                                        return (
                                            <OrderItemCard item={item} index={index} />
                                        )
                                    }}
                                />
                            </View>

                            {item.customerComment && item.customerComment !== '' &&
                                <View className='w-full gap-[5px]' >
                                    <Text className='font-bold text-[16px] text-primaryRed text-center' >Your Comment</Text>
                                    <ScrollView className='flex-1 max-h-[150px] bg-[#F0F2F5] rounded-[10px] border-[3px] border-primaryRed p-[10px]' >
                                        <HighlightText text={item.customerComment.trimEnd()} highlight={searchText} />
                                    </ScrollView>
                                </View>
                            }
                        </View>
                    )
                }}
            />
        </View>
    )
}

export default MyOrdersForCustomisedQRModal
