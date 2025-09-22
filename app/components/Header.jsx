import { View, Text, Image, Dimensions, TouchableOpacity } from 'react-native'
import React from 'react'
import { useAuth } from '../context/AuthContext'
import { useAddressSheet } from '../context/AddressSheetContext';

const screenWidth = Dimensions.get('window').width;

const Header = ({setIsMyVendorsListModalVisible}) => {
  const { customerFullData, customerAddress } = useAuth()
  const { openAddressSheet } = useAddressSheet()

  return (
    <View className='bg-white w-[98%] border-b-[5px] border-primary rounded-b-[10px] p-[5px] self-center flex-row justify-between items-center gap-[5px]'>
      <View className='flex-1 gap-[3px]'>
        <Text className='font-bold text-primary text-[15px]' >👋 {customerFullData?.customerName ?? 'Guest'}</Text>
        <TouchableOpacity className='flex-row gap-[2px] items-center' onPress={openAddressSheet}>
          <Text className='text-[22px]' >📍</Text>
          <Text className='text-[13px]' >{customerAddress?.customerPlotNumber}, {customerAddress?.customerComplexNameOrBuildingName},  {customerAddress?.customerLandmark}, {customerAddress?.customerRoadNameOrStreetName}, {customerAddress?.customerVillageNameOrTownName}, {customerAddress?.customerCity}, {customerAddress?.customerState} - {customerAddress?.customerPincode}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => setIsMyVendorsListModalVisible(true)} className='items-center justify-center gap-[2px]'>
        <Image style={{ height: 40, width: 40 }} source={require('../../assets/images/vendorIconImage.png')} />
        <Text className='text-[12px]'>My Vendors</Text>
      </TouchableOpacity>
    </View>
  )
}

export default Header
