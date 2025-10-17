import { View, Text, FlatList, TouchableOpacity, Linking, Image, ScrollView, TextInput } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FlashList } from '@shopify/flash-list'
import OrderItemCard from '../components/OrderItemCard'

// 🔹 HighlightText Component
const HighlightText = ({ text, highlight }) => {
  if (!highlight.trim()) return <Text>{text}</Text>;

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = String(text).split(regex);

  return (
    <Text>
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

// 🔹 Helper: flatten values for searching
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

const MyOrders = () => {
  const { allOrders } = useAuth()
  const [filteredOrders, setFilteredOrders] = useState(allOrders)
  const [searchText, setSearchText] = useState('')

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
      <View className='flex-row gap-[5px] p-[10px] items-center bg-white rounded-b-[10px]' >
        <Image source={require('../../assets/images/myOrdersImage.png')} style={{ height: 30, width: 30 }} className='ronuded-full' /><Text>My Orders</Text>
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
              <TouchableOpacity onPress={() => { if (!item.address.customerLocation?.latitude || !item.address.customerLocation?.longitude) { return }; Linking.openURL(`https://www.google.com/maps/place/${item.address.customerLocation.latitude}+${item.address.customerLocation.longitude}/`) }} className='w-full flex-row' >
                <Text className='font-bold' >Address:</Text>
                <Text className='flex-1 justify-end items-end text-right flex flex-col' >
                  <HighlightText text={`${item.address.nameForAddress}, ${item.address.customerPlotNumber}, ${item.address.customerComplexNameOrBuildingName}, ${item.address.customerLandmark}, ${item.address.customerRoadNameOrStreetName}, ${item.address.customerVillageNameOrTownName}, ${item.address.customerCity}, ${item.address.customerState} - ${item.address.customerPincode}`} highlight={searchText} />
                  <HighlightText text={`Ph no. ${item.address.mobileNumberForAddress}`} highlight={searchText} />
                </Text>
              </TouchableOpacity>
              <View className='border-b-[1px] border-[#ccc]' ></View>
              <View className='w-full flex-row' >
                <Text className='font-bold' >Delivery Mode:</Text>
                <Text className='flex-1 text-right text-primary font-bold text-[15px]' >
                  <HighlightText text={item.deliveryMode} highlight={searchText} />
                </Text>
              </View>
              {item.deliveryMode === 'Takeaway/Pickup' && item.pickupAddress &&
                <TouchableOpacity onPress={() => { if (!item.pickupCoordinates?.latitude || !item.pickupCoordinates?.longitude) { return }; Linking.openURL(`https://www.google.com/maps/place/${item.pickupCoordinates?.latitude}+${item.pickupCoordinates?.longitude}/`) }} className='w-full flex-row' >
                  <Text className='font-bold' >Pickup Address:</Text>
                  <Text className='flex-1 text-right text-primary text-[12px]' >
                    📍 <HighlightText text={item.pickupAddress} highlight={searchText} />
                  </Text>
                </TouchableOpacity>
              }
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
                    text={`₹${(Number((item.totalAmount ?? 0) - (item.deliveryCharge ?? 0) + (item.appliedOffers?.[0]?.discount ?? 0))).toFixed(2)}`}
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

              {Number(item.deliveryCharge) !== 0 && <View className='w-full flex-row' >
                <Text className='font-bold text-primaryRed' >Delivery Charge:</Text>
                <Text className='flex-1 text-right text-primaryRed' >
                  <HighlightText text={`₹${item.deliveryCharge}`} highlight={searchText} />
                </Text>
              </View>}

              <View className='w-full flex-row' >
                <Text className='font-bold text-primary text-[16px]' >Total Amount:</Text>
                <Text className='flex-1 text-right font-bold text-primary text-[16px]' >
                  <HighlightText text={`₹${item.totalAmount.toFixed(2)}`} highlight={searchText} />
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

export default MyOrders
