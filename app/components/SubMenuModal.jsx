// components/SubMenuModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking, Image } from 'react-native';
import { useRouter } from 'expo-router'; // For navigation from within the modal
import TouchableOpacityComponent from './TouchableOpacity';
import { useAuth } from '../context/AuthContext';
const screenWidth = Dimensions.get('window').width;
const SubMenuModal = ({ isVisible, onClose }) => {
    const router = useRouter();
    const { logout, vendorMobileNumber } = useAuth();
    const handleMenuItemPress = (path) => {
        onClose(); // Close the modal first
        router.push(path); // Navigate to the desired screen
    };

    return (
        <View className='max-w-screen-sm h-full' style={{ display: isVisible ? 'flex' : 'none', zIndex: 9999999 }}>
            <TouchableOpacityComponent className={''} style={styles.overlay} activeOpacity={1} onPress={onClose} innerMaterial={
                <View style={styles.menuContainer}>
                    <Text style={styles.menuTitle}>More Options</Text>
                    <TouchableOpacityComponent className={'flex-row items-center justify-center gap-[5px]'} style={styles.menuItem} onPress={() => handleMenuItemPress('/Profile')} innerMaterial={<><Image source={require('../../assets/images/profileImage.png')} style={{ height: 20, width: 20 }}/><Text style={styles.menuItemText}>Profile</Text></>}/>
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => handleMenuItemPress('/Settings')} innerMaterial={<Text style={styles.menuItemText}>Settings</Text>}/>
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?AboutUs=true")} innerMaterial={<Text style={styles.menuItemText}>About Us</Text>}/>
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?VendorsTermsAndConditions=true")} innerMaterial={<Text style={styles.menuItemText}>Terms & Conditions</Text>}/>
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?PrivacyPolicy=true")} innerMaterial={<Text style={styles.menuItemText}>Privacy Policy</Text>}/>
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={() => Linking.openURL("https://unoshops.com/?ContactUs=true")} innerMaterial={<Text style={styles.menuItemText}>Contact Us</Text>}/>
                    <TouchableOpacityComponent className={''} style={styles.menuItem} onPress={logout} innerMaterial={<Text style={styles.logoutText}>Logout</Text>}/>
                </View>
            }/>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end', // Position the menu at the bottom, above the tab bar
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dim the background
        zIndex: 9999999
    },
    menuContainer: {
        width: screenWidth * 0.9, // 90% of screen width
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 70, // Adjust this to sit just above your tab bar
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
        zIndex: 9999999
    },
    logoutText: {
        fontSize: 16,
        color: 'red', // Or your primary color
        fontWeight: '600',
        zIndex: 9999999
    }
});

export default SubMenuModal;