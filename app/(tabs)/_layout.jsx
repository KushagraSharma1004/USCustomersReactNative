// app/_layout.tsx (or wherever TabsLayout is defined)
import { View, Text, Image, TouchableOpacity } from 'react-native'
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { Tabs, useGlobalSearchParams, useLocalSearchParams, useRouter, useSegments } from 'expo-router'
import SubMenuModal from '../components/SubMenuModal'
import AddressSheet from '../components/AddressSheet'
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet'
import { AddressSheetProvider } from '../context/AddressSheetContext'
import { useCart } from "../context/CartContext";
import { decryptData } from '../context/hashing'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useFocusEffect } from '@react-navigation/native'
import { useAuth } from '../context/AuthContext'

const TabsLayout = () => {
    const segments = useSegments();
    const { cartCount, cartTotal } = useCart();
    const params = useGlobalSearchParams()
    const router = useRouter()
    const {logout} = useAuth()
    const isVendorsScreenOpen = segments.includes('Vendors');
    const isMyCartScreenOpen = segments.includes('MyCart');
    const [isSubMenuModalVisible, setIsSubMenuModalVisible] = useState(false)
    const addressSheetRef = useRef(null)
    const snapPointsForAddressSheet = useMemo(() => [1, '90%'], [])
    const [vendorFullData, setVendorFullData] = useState(null)
    const vendorMobileNumber = decryptData(localStorage.getItem('vendor'))
    const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('selectADeliveryMode')
    const [customerMobileNumber, setCustomerMobileNumber] = useState(decryptData(localStorage.getItem('customerMobileNumber')) || '');
    const [finalAmount, setFinalAmount] = useState(decryptData(localStorage.getItem('finalAmount')) || '')
    const [isVendorVisiting, setIsVendorVisiting] = useState(decryptData(params.isVendorVisiting) === 'true' ? true : false)

    useEffect(() => {
        setIsVendorVisiting(decryptData(params.isVendorVisiting) === 'true' ? true : false)
    }, [params.isVendorVisiting])
    
    useFocusEffect(
      useCallback(() => {
        if (isVendorVisiting && !isMyCartScreenOpen && !isVendorsScreenOpen) {
          handleVendorLogout();
        }
      }, [isVendorVisiting, isMyCartScreenOpen, isVendorsScreenOpen, segments, logout, router])
    );
    
    const handleVendorLogout = useCallback(() => {
      localStorage.removeItem('customerMobileNumber');
      localStorage.setItem('vendor', null);
      logout();
      router.replace('/Login');
    }, [logout, router]);
    
    useEffect(() => {
            let isCleanup = false;
    
            // METHOD 1: Browser Tab Close/Refresh
            const handleBeforeUnload = (e) => {
                if (isVendorVisiting && !isCleanup) {
                    localStorage.removeItem('customerMobileNumber');
                    localStorage.setItem('vendor', null);
                    logout();
                }
            };
    
            // METHOD 2: Page Visibility Change (Tab Switch)
            const handleVisibilityChange = () => {
                if (document.hidden && isVendorVisiting && !isCleanup) {
                    handleVendorLogout();
                }
            };
    
            // METHOD 3: Window Unload (Fallback)
            const handleUnload = () => {
                if (isVendorVisiting && !isCleanup) {
                    localStorage.removeItem('customerMobileNumber');
                    localStorage.setItem('vendor', null);
                    logout();
                }
            };
    
            // ADD LISTENERS
            window.addEventListener('beforeunload', handleBeforeUnload);
            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('unload', handleUnload);
    
            return () => {
                isCleanup = true;
                window.removeEventListener('beforeunload', handleBeforeUnload);
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                window.removeEventListener('unload', handleUnload);
            };
        }, [isVendorVisiting, logout, handleVendorLogout]);

    useEffect(() => {
        const interval = setInterval(() => {
            const newCustomerMobileNumber = decryptData(localStorage.getItem('customerMobileNumber')) || '';
            const newFinalAmount = decryptData(localStorage.getItem('finalAmount')) || '';
            setFinalAmount(newFinalAmount)
            setCustomerMobileNumber(newCustomerMobileNumber);
        }, 500); // check every 500ms

        return () => clearInterval(interval);
    }, []);

    const fetchVendorFullData = async () => {
        if (!vendorMobileNumber || vendorMobileNumber.length !== 10) {
            return;
        }
        try {
            const vendorRef = doc(db, 'users', vendorMobileNumber)
            const vendorDocSnap = await getDoc(vendorRef)
            if (!vendorDocSnap.exists()) {
                return
            }
            const vendorData = vendorDocSnap.data()
            setVendorFullData(vendorData)
        } catch (error) {
            console.log('Error fetching vendor details: ', error)
        }
    }

    useEffect(() => {
        fetchVendorFullData()
    }, [])

    useEffect(() => {
        fetchVendorFullData()
        setSelectedDeliveryMode(params.selectedDeliveryMode || 'selectADeliveryMode')
    }, [params])

    const renderBackdrop = useCallback(
        (props) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
                pressBehavior="close"
            />
        ),
        []
    )

    const onSubMenuModalClose = () => setIsSubMenuModalVisible(false)
    const openSubMenuModal = () => setIsSubMenuModalVisible(true)

    // Function to open the AddressSheet - exposed via context
    const openAddressSheet = () => {
        addressSheetRef.current?.snapToIndex(1)
    }

    return (
        <>
            <View className={`flex-1`}>
                <AddressSheetProvider openAddressSheet={openAddressSheet}>
                    <SubMenuModal isVisible={isSubMenuModalVisible} onClose={onSubMenuModalClose} />
                    <Tabs
                        initialRouteName="Home"
                        screenOptions={{
                            animation: 'shift',
                            headerShown: false,
                            tabBarActiveBackgroundColor: '#2874F0',
                            tabBarActiveTintColor: 'white',
                            // tabBarStyle: customerMobileNumber.length === 10 && (isMyCartScreenOpen ? cartCount !== 0 : true) ? {
                            tabBarStyle: customerMobileNumber.length === 10 && !isVendorVisiting ? {
                                borderTopLeftRadius: 10,
                                borderTopRightRadius: 10,
                                borderTopWidth: 5,
                                borderColor: '#2874F0',
                                height: 65,
                                paddingTop: 3,
                                paddingBottom: 3
                            } : { display: "none" },
                            tabBarItemStyle: {
                                borderRadius: 10,
                                marginHorizontal: 5, // optional spacing to see the rounded effect
                                overflow: 'hidden',
                            },
                            tabBarLabelStyle: {
                                marginTop: 3, // space between icon and label
                            },
                        }}
                    >

                        <Tabs.Screen
                            name='Home'
                            options={{
                                tabBarIcon: ({ focused }) => <Image style={{ height: 35, width: 35, tintColor: focused ? 'white' : '' }} source={require('../../assets/images/homeImage.png')} />,
                            }}
                            listeners={{
                              tabPress: (e) => {
                                e.preventDefault();
                                if (isVendorVisiting) {
                                    handleVendorLogout(); // ✅ FIXED
                                } else {
                                    localStorage.removeItem('vendor')
                                    router.push('/Home')
                                }
                              },
                            }}
                        />

                        <Tabs.Screen
                            name='MyOrders'
                            options={{
                                title: 'My Orders',
                                tabBarIcon: ({ focused }) => <Image style={{ height: 35, width: 35, tintColor: focused ? 'white' : '' }} source={require('../../assets/images/myOrdersImage.png')} />,
                            }}
                        />

                        <Tabs.Screen
                            name='MyCart'
                            options={{
                                headerShown: true,
                                title: 'My Cart',
                                tabBarLabel: `₹ ${cartTotal}`,
                                tabBarLabelStyle: { marginTop: 1, textAlign: 'center', fontSize: 12, color: 'black', backgroundColor: '#f5deb3', paddingHorizontal: 5, borderRadius: 5, },
                                tabBarIcon: ({ focused }) => <Image style={{ height: 35, width: 35, tintColor: focused ? 'white' : '' }} source={require('../../assets/images/myCartImage.png')} />,
                                tabBarBadge: cartCount > 0 ? cartCount : null,
                                href: isVendorsScreenOpen ? undefined : null,
                                tabBarBadgeStyle: { backgroundColor: 'black' },
                                headerStyle: { height: 40 },
                                headerLeft: () => {
                                    const vendor = localStorage.getItem('vendor')
                                    return (
                                        <TouchableOpacity onPress={() => router.push(`/Vendors?vendor=${encodeURIComponent(vendor)}`)} style={{ marginLeft: 10 }}>
                                            {/* <Text className='text-[25px] mr-[10px]' >🔙</Text> */}
                                            <Image style={{ height: 25, width: 25 }} className='mr-[10px]' source={require('../../assets/images/arrowLeftImage.png')} />
                                        </TouchableOpacity>
                                    );
                                },
                                headerRight: () => {
                                    return (
                                        <Text className='text-primary p-[10px] text-[14px]' >Total: <Text className='font-bold text-[16px]' >₹
                                            {/* {selectedDeliveryMode === 'homeDelivery' ? Number(vendorFullData?.freeDeliveryAboveAmount || 0) === 0 ? cartTotal + Number(vendorFullData.deliveryCharge) : Number(vendorFullData?.freeDeliveryAboveAmount || 0) - cartTotal > 0 ? cartTotal + Number(vendorFullData.deliveryCharge) : cartTotal : cartTotal} */}
                                            {finalAmount}
                                        </Text></Text>
                                    )
                                }
                            }}
                        />

                        <Tabs.Screen
                            name='Vendors'
                            options={{
                                // tabBarIcon: ({ focused }) => <Image style={{ height: 35, width: 35, tintColor: focused ? 'white' : '' }} source={require('../../assets/images/homeImage.png')} />,
                                href: null
                            }}
                        />

                        <Tabs.Screen
                            name='SubMenu'
                            options={{
                                tabBarIcon: ({ focused }) => <Image style={{ height: 35, width: 35, tintColor: focused ? 'white' : '' }} source={require('../../assets/images/menuImage.png')} />,
                                title: 'Menu'
                            }}
                            listeners={{
                                tabPress: (e) => {
                                    e.preventDefault();
                                    openSubMenuModal();
                                },
                            }}
                        />

                    </Tabs>
                    <BottomSheet
                        ref={addressSheetRef}
                        snapPoints={snapPointsForAddressSheet}
                        enableDynamicSizing={false}
                        enablePanDownToClose
                        backgroundStyle={{ borderTopWidth: 5, borderTopColor: '#2874F0', backgroundColor: '#2874F0' }}
                        index={-1}
                        backdropComponent={renderBackdrop}
                        handleComponent={() => null}
                    >
                        <AddressSheet onClose={() => addressSheetRef.current?.close()} />
                    </BottomSheet>
                </AddressSheetProvider>
            </View>
        </>
    )
}

export default TabsLayout;