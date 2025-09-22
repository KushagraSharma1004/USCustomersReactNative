import { View, Text, Modal, TouchableOpacity, Image, TextInput } from 'react-native'
import React, { useEffect, useState } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'expo-router'
import { encryptData } from '../context/hashing'

const MyVendorsListModal = ({ isMyVendorsListModalVisible, setIsMyVendorsListModalVisible, setIsRemoveVendorFromMyVendorsListConfirmationModalVisible, setVendorMobileNumberToRemoveFromMyVendorsList, vendorMobileNumber }) => {
    const { myVendors, allVendors } = useAuth()
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    const [filteredVendors, setFilteredVendors] = useState(myVendors);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredVendors(myVendors);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = myVendors.filter(item => {
                const vendorRef = allVendors.find(v => v.vendorMobileNumber === item.vendorMobileNumber);
                if (!vendorRef) return false;

                return (
                    vendorRef.vendorMobileNumber.toLowerCase().includes(term) ||
                    vendorRef.businessName.toLowerCase().includes(term) ||
                    vendorRef.vendorName.toLowerCase().includes(term) ||
                    vendorRef.category.toLowerCase().includes(term) ||
                    vendorRef.vendorAddress?.vendorBusinessCity.toLowerCase().includes(term) ||
                    vendorRef.vendorAddress?.vendorBusinessPincode.toLowerCase().includes(term)
                );
            });
            setFilteredVendors(filtered);
        }
    }, [searchTerm, myVendors, allVendors]);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isMyVendorsListModalVisible}
            onRequestClose={() => setIsMyVendorsListModalVisible(false)}
        >
            <TouchableOpacity onPress={() => setIsMyVendorsListModalVisible(false)} className='flex-1 bg-[#00000060] items-end pt-[75px] pb-[70px]' >
                <View className='bg-wheat p-[5px] w-[80%] rounded-[10px] gap-[5px] max-h-[88%] border-b-[5px] border-primary' >
                    <TouchableOpacity>
                        <TextInput
                            value={searchTerm}
                            onChangeText={setSearchTerm}
                            placeholder='Search...'
                            className='p-[10px] rounded-[5px] border border-[#ccc] outline-none bg-white'
                        />
                    </TouchableOpacity>
                    <FlashList
                        data={filteredVendors}
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
                                <TouchableOpacity onPress={() => {
                                    if (isVendorActive) {
                                        router.push(`/Vendors/?vendor=${encodeURIComponent(encryptData(item.vendorMobileNumber))}`);
                                        setIsMyVendorsListModalVisible(false)
                                    } else {
                                        alert('Vendor is currently unavailable.')
                                        return
                                    }
                                }}
                                    className='flex-row items-center' >
                                    <View className={`${vendorMobileNumber === item.vendorMobileNumber ? 'bg-wheat' : ''} ${isVendorActive ? '' : 'bg-white'} flex-1 rounded-[5px] p-[5px] flex-row mb-[3px] gap-[5px]`} >
                                        {isVendorActive && vendorMobileNumber !== item.vendorMobileNumber && (
                                            <Image
                                                resizeMode="stretch"
                                                className="absolute top-0 left-0"
                                                source={require('../../assets/images/vendorCardBackgroundImage.png')}
                                                style={{ height: '100%', width: '100%', borderRadius: 7 }}
                                            />
                                        )}
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
                        ListEmptyComponent={() => {
                            return (
                                <View>
                                    <Text className='font-bold text-primaryRed text-center text-[20px]' >No ❤️ Vendors</Text>
                                </View>
                            )
                        }}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    )
}

export default MyVendorsListModal