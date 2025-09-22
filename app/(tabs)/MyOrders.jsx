import { View, Text, FlatList, TouchableOpacity, Linking, Image, ScrollView } from 'react-native'
import React from 'react'
import { useAuth } from '../context/AuthContext'
import { FlashList } from '@shopify/flash-list'
import OrderItemCard from '../components/OrderItemCard'

const MyOrders = () => {
  const { allOrders } = useAuth()
  // const [searchText, setSearchText] = useState('')

  return (
    <View className='pb-[5px] px-[5px] flex-1 gap-[5px]'>
      <View className='flex-row gap-[5px] p-[10px] items-center bg-white rounded-b-[10px]' ><Image source={require('../../assets/images/myOrdersImage.png')} style={{ height: 30, width: 30 }} className='ronuded-full' /><Text>My Orders</Text></View>
      <FlashList
        data={allOrders.sort((a, b) => b.orderTime - a.orderTime)}
        renderItem={({ item, index }) => {
          return (
            <View className={`py-[10px] px-[5px] self-center ${item.orderStatus === 'Pending' ? 'bg-[#FFF3CD]' : item.orderStatus === 'Approved' ? 'bg-[#D4EDDA]' : 'bg-[#F8D7DA]'} rounded-[10px] w-full gap-[10px] mb-[3px] border-y-[5px] border-primary`} >
              <Text className='font-bold text-primary' >Order ID: {item.id}</Text>
              <View className='w-full flex-row' ><Text className='font-bold' >Vendor Name:</Text><Text className='flex-1 text-right' >{item.businessName}</Text></View>
              <View className='w-full flex-row' ><Text className='font-bold' >Vendor Mobile Number:</Text><Text className='flex-1 text-right' >{item.vendorMobileNumber}</Text></View>
              <View className='border-b-[1px] border-[#ccc]' ></View>
              <View className='w-full flex-row' ><Text className='font-bold' >Time:</Text><Text className='flex-1 text-right' >{item.orderTime ? item.orderTime.toDate().toLocaleString() : ''}</Text></View>
              <TouchableOpacity onPress={() => { if (!item.address.customerLocation?.latitude || !item.address.customerLocation?.longitude) { return }; Linking.openURL(`https://www.google.com/maps/place/${item.address.customerLocation.latitude}+${item.address.customerLocation.longitude}/`) }} className='w-full flex-row' >
                <Text className='font-bold' >Address:</Text>
                <View className='flex-1 justify-end items-end' >
                  <Text className='font-bold' >{item.address.nameForAddress}</Text>
                  <Text className='text-right text-[12px]' >{item.address.customerPlotNumber}, {item.address.customerComplexNameOrBuildingName}, {item.address.customerLandmark}, {item.address.customerRoadNameOrStreetName}, {item.address.customerVillageNameOrTownName}</Text>
                  <Text className='text-right text-[12px]' >{item.address.customerCity}, {item.address.customerState} - {item.address.customerPincode}</Text>
                  <Text className='text-right text-[12px]' >Ph no. {item.address.mobileNumberForAddress}</Text>
                </View>
              </TouchableOpacity>
              <View className='border-b-[1px] border-[#ccc]' ></View>
              <View className='w-full flex-row' ><Text className='font-bold' >Delivery Mode:</Text><Text className='flex-1 text-right text-primary font-bold text-[15px]' >{item.deliveryMode}</Text></View>
              {item.deliveryMode === 'Takeaway/Pickup' && item.pickupAddress && <TouchableOpacity onPress={() => { if (!item.pickupCoordinates?.latitude || !item.pickupCoordinates?.longitude) { return }; Linking.openURL(`https://www.google.com/maps/place/${item.pickupCoordinates?.latitude}+${item.pickupCoordinates?.longitude}/`) }} className='w-full flex-row' ><Text className='font-bold' >Pickup Address:</Text><Text className='flex-1 text-right text-primary text-[12px]' >📍 {item.pickupAddress}</Text></TouchableOpacity>}
              <View className='w-full flex-row' ><Text className='font-bold' >Status:</Text><Text className={`flex-1 text-right font-bold ${item.orderStatus === 'Pending' ? '' : item.orderStatus === 'Approved' ? 'text-primaryGreen' : 'text-primaryRed'}`} >{item.orderStatus}</Text></View>
              <View className='w-full flex-row' ><Text className='font-bold' >Delivery Charge:</Text><Text className='flex-1 text-right' >₹{item.deliveryCharge}</Text></View>
              <View className='w-full flex-row bg-primary p-[5px] rounded-[5px]' ><Text className='font-bold text-white' >Total Amount:</Text><Text className='flex-1 text-right font-bold text-white' >₹{item.totalAmount}</Text></View>
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
              {item.customerComment && item.customerComment !== '' && <View className='w-full gap-[5px]' >
                <Text className='font-bold text-[16px] text-primaryRed text-center' >Your Comment</Text>
                <ScrollView className='flex-1 max-h-[150px] bg-[#F0F2F5] rounded-[10px] border-[3px] border-primaryRed' >
                  <Text className='flex-1 p-[5px]' >{item.customerComment.trimEnd()}</Text>
                </ScrollView>
              </View>}
            </View>
          )
        }}
      />
    </View>
  )
}

export default MyOrders