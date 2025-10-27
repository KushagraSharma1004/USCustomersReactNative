import { View, Text, Image } from 'react-native'
import React from 'react'
import { Shadow } from 'react-native-shadow-2'

const OrderItemCard = ({ item, index }) => {
    return (
        <View className="flex-row justify-between items-center border-b-[1px] border-r-[1px] rounded-[7px] p-[5px] mb-[5px] bg-[#ffffffd9] max-h-[140px] relative">

            {/* Discount badge */}
            {/* {discountPercentage > 0 && (
                          <View className="absolute top-0 left-0 bg-primaryGreen rounded-tl-[7px] rounded-br-[7px] px-[8px] py-[4px] z-30">
                            <Text className="text-white text-[12px] font-bold">
                              {discountPercentage}% OFF
                            </Text>
                          </View>
                        )} */}
            <Text className='rounded-tl-[7px] rounded-br-[7px] bg-primary text-white absolute top-[0px] left-[0px] p-[5px] z-10 text-[12px]' >{index + 1}</Text>

            {/* Product Image */}
            <Shadow
                distance={5}
                startColor={'rgba(0,0,0,0.1)'}
                offset={[0, 3]}
                style={{ borderRadius: 7 }}
            >
                <Image
                    source={
                        item?.imageURL
                            ? { uri: item.imageURL }
                            : require('../../assets/images/placeholderImage.png')
                    }
                    className="rounded-[5px]"
                    style={{ height: 120, width: 120 }}
                />
            </Shadow>

            {/* Details Section */}
            <View className="flex-col justify-between items-center h-[120px] flex-1">
                {/* Name + QTY */}
                <View className="flex-row justify-between items-center w-full px-[7px]">
                    <Text className="flex-1 text-[15px]">{item.name}</Text>
                    {item?.variantName && item?.variantName !== '' && <Text className='p-[3px] rounded-[5px] border border-primary text-center' >{item.variantName || ''}</Text>}
                </View>

                {/* MRP + Subtotal */}
                <View className="flex-row justify-between items-center w-full px-[7px]">
                    <Text className="text-[12px] line-through text-red-500">MRP: ₹{item.price?.[0].mrp}</Text>
                    <Text className="text-[11px]">QTY: {item.quantity}</Text>
                </View>

                {/* Price */}
                <View className="flex-row justify-between items-center w-full px-[7px]">
                    <Text className="text-[22px] font-bold text-primary">
                        ₹{item.price?.[0].sellingPrice}/
                        <Text className="text-[12px]">{item.price?.[0].measurement}</Text>
                    </Text>
                    <Text className="text-[14px] text-[#28a745] font-bold">
                        <Text className="text-[10px] font-normal">Sub Total:</Text> ₹
                        {item.quantity * item.price?.[0].sellingPrice}
                    </Text>
                </View>
            </View>
        </View>
    )
}

export default OrderItemCard