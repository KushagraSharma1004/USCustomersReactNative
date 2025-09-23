// components/SubMenuModal.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, Image, Modal, TouchableOpacity } from 'react-native';
import { useFocusEffect, useRouter, useSegments } from 'expo-router'; // For navigation from within the modal
import TouchableOpacityComponent from './TouchableOpacity';
import { useAuth } from '../context/AuthContext';
import { decryptData } from '../context/hashing';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase'
import { ScrollView } from 'react-native-gesture-handler';
import BouncyCheckbox from "react-native-bouncy-checkbox";
import { useGlobalSearchParams } from 'expo-router'

const SubMenuModal = ({ isVisible, onClose }) => {
    const { vendor } = useGlobalSearchParams();
    const vendorMobileNumber = decryptData(vendor);
    const [vendorFullData, setVendorFullData] = useState(null)
    const segments = useSegments();
    const isVendorsScreenOpen = segments.includes('Vendors');
    const isMyCartScreenOpen = segments.includes('MyCart');
    const router = useRouter();
    const { logout } = useAuth();
    const [isVendorTermsAndConditionsModalVisible, setIsVendorTermsAndConditionsModalVisible] = useState(false)

    const handleMenuItemPress = (path) => {
        onClose();
        router.push(path);
    };

    const fetchVendorFullData = async (val) => {
        try {
            const vendorRef = doc(db, 'users', val && val.length === 10 ? val : vendorMobileNumber)
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
        if (!vendorMobileNumber || vendorMobileNumber.length !== 10) {
            return;
        }
        fetchVendorFullData()
    }, [vendorMobileNumber])

    useEffect(() => {
        const interval = setInterval(() => {
            const val = decryptData(localStorage.getItem('vendor')) || '';
            fetchVendorFullData(val);
        }, 500); // check every 500ms

        return () => clearInterval(interval);
    }, []);

    return (
        <View className='h-full' style={{ display: isVisible ? 'flex' : 'none', zIndex: 9999999 }}>
            {isVendorTermsAndConditionsModalVisible &&
                <Modal animationType='slide' transparent={true} visible={isVendorTermsAndConditionsModalVisible}>
                    <View className='flex-1 bg-[#00000060] items-center justify-center' >
                        <View className='bg-white p-[10px] w-[90%] h-[90%] rounded-[10px]' >
                            <TouchableOpacity className='absolute top-[10px] right-[10px] z-50' onPress={() => { setIsVendorTermsAndConditionsModalVisible(false) }} ><Image style={{ height: 30, width: 30 }} source={require('../../assets/images/crossImage.png')} /></TouchableOpacity>
                            <View className='p-[10px] w-full rounded-[10px] max-w-[90%]' ><Text className='text-center text-primaryRed text-[15px]' ><Text className='text-[#E48108FD] font-bold' >{vendorFullData?.businessName}'s</Text> Terms and Condition*</Text></View>
                            <ScrollView className='max-h-[85%] p-[5px] border border-[#ccc] rounded-[10px]' >
                                <Text>{vendorFullData?.termsAndConditions}</Text>
                            </ScrollView>
                            <View className='flex-row items-center justify-center gap-[5px] p-[10px]' >
                                <BouncyCheckbox
                                    isChecked={true}
                                    disableText
                                    fillColor="green"
                                    size={25}
                                    iconComponent={<Image style={{height:15, width:15}} source={require('../../assets/images/checkImage.png')} />}
                                    useBuiltInState={false}
                                    iconStyle={{ borderRadius: 5 }}        // outer icon container radius
                                    innerIconStyle={{ borderRadius: 5 }}   // inner icon radius (important)
                                    onPress={async () => {
                                    }}
                                />
                                <Text className='text-[15px] leading-none' >I Agree</Text>
                            </View>
                        </View>
                    </View>
                </Modal>
            }
            <TouchableOpacityComponent className={''} style={styles.overlay} activeOpacity={1} onPress={onClose} innerMaterial={
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>More Options</Text>
                    <TouchableOpacityComponent className={'flex-row items-center justify-center gap-[5px]'} style={styles.menuItem} onPress={() => handleMenuItemPress('/Profile')} innerMaterial={<><Image source={require('../../assets/images/profileImage.png')} style={{ height: 20, width: 20 }} /><Text style={styles.menuItemText}>Profile</Text></>} />
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => handleMenuItemPress('/Settings')} innerMaterial={<Text style={styles.menuItemText}>Settings</Text>} />
                    {isVendorsScreenOpen || isMyCartScreenOpen ? <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => { setIsVendorTermsAndConditionsModalVisible(true); onClose() }} innerMaterial={<Text style={styles.menuItemText}><Text className='text-[#E48108F5]' >{vendorFullData?.businessName}</Text>'s Terms & Conditions</Text>} /> : null}
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?AboutUs=true")} innerMaterial={<Text style={styles.menuItemText}>About Us</Text>} />
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?VendorsTermsAndConditions=true")} innerMaterial={<Text style={styles.menuItemText}>Terms & Conditions</Text>} />
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?PrivacyPolicy=true")} innerMaterial={<Text style={styles.menuItemText}>Privacy Policy</Text>} />
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?ContactUs=true")} innerMaterial={<Text style={styles.menuItemText}>Contact Us</Text>} />
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={logout} innerMaterial={<Text style={styles.logoutText}>Logout</Text>} />
                </View>
            } />
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end', // Position the menu at the bottom, above the tab bar
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Dim the background
        zIndex: 9999999
    },
    menuContainer: {
        width: '90%', // 90% of screen width
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20, // Adjust this to sit just above your tab bar
        alignItems: 'center',
        elevation: 5, // Android shadow
        shadowColor: '#000', // iOS shadow
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        zIndex: 9999999
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
        zIndex: 9999999
    },
    menuItem: {
        width: '100%',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
        zIndex: 9999999
    },
    menuItemText: {
        fontSize: 16,
        color: '#2874F0', // Or your primary color
        fontWeight: '600',
        zIndex: 9999999,
        textAlign: 'center'
    },
    logoutText: {
        fontSize: 16,
        color: 'red', // Or your primary color
        fontWeight: '600',
        zIndex: 9999999
    }
});

export default SubMenuModal;