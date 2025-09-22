import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import { Shadow } from 'react-native-shadow-2';
import { useAuth } from '../context/AuthContext';

const MultipleItemsCard = ({ item, innerIndex, cartItem, onAddToCart, onIncrement, onDecrement }) => {
    const quantity = cartItem?.quantity || 0;

    const mrp = item?.prices?.[0]?.mrp || 0;
    const sellingPrice = item?.prices?.[0]?.sellingPrice || 0;
    const discountPercentage =
        mrp > 0 ? (((mrp - sellingPrice) / mrp) * 100).toFixed(0) : 0;

    return (
        <View className="flex-col justify-between items-center border-b-[1px] border-r-[1px] rounded-[7px] p-[10px] mb-[3px] bg-[#ffffffd9] relative max-w-[170px] gap-[5px]">
            {
                item.stock === 0 &&
                <View style={{ width: '100%', height:'100%' }} className={`bg-[rgba(0,0,0,0.5)] absolute z-20 justify-center items-center top-0 left-0 bottom-0 rounded-[7px]`}>
                    <Text className='text-white text-[24px] font-bold'>Out of Stock</Text>
                </View>
            }
            <Text className="absolute bg-primary rounded-tr-[7px] rounded-bl-[7px] text-white text-center text-[10px] px-[5px] py-[3px] leading-none top-[0px] right-[0px] z-10">
                {innerIndex}
            </Text>

            {discountPercentage > 0 && (
                <View className="absolute top-0 left-0 bg-primaryGreen rounded-tl-[7px] rounded-br-[7px] px-[8px] py-[4px] z-30">
                    <Text className="text-white text-[12px] font-bold">
                        {discountPercentage}% OFF
                    </Text>
                </View>
            )}

            <Shadow distance={5} startColor={'rgba(0,0,0,0.1)'} offset={[0, 3]} style={{ borderRadius: 7 }}>
                <Image
                    source={item?.images?.[0] ? { uri: item.images[0] } : require('../../assets/images/placeholderImage.png')}
                    className="rounded-[5px]"
                    style={{ height: 150, width: 150 }}
                />
            </Shadow>

            <View style={{ width: '100%' }} className="flex-col justify-between items-center gap-[5px]">
                <View className="flex-row justify-center items-center w-full px-[7px]">
                    <Text className="text-[22px] font-bold text-primary">
                        ₹{item.prices[0].sellingPrice}/
                        <Text className="text-[12px]">{item.prices[0].measurement}</Text>
                    </Text>
                </View>

                <View className="flex-row justify-between items-center w-full px-[7px]">
                    <Text className="text-[12px] line-through text-red-500">MRP: ₹{item.prices[0].mrp}</Text>
                    <Text className="text-[12px] text-[#8B8000]">Stk: {item.stock}</Text>
                </View>

                <View className="flex-row justify-center items-center w-full px-[7px]">
                    {quantity !== 0 && <Text className="text-[12px] text-[#28a745] font-bold"><Text className='text-[10px] font-normal' >Sub Total:</Text> ₹{quantity * item.prices[0].sellingPrice}</Text>}
                    {quantity === 0 && <Text className="text-[12px] text-[#28a745] font-bold"><Text className='text-[10px] font-normal' >Sub Total:</Text> ₹0</Text>}
                </View>

                {/* Add to cart button section */}
                <View className="flex-row justify-center items-center w-full px-[7px]">
                    {quantity === 0 ? (
                        <TouchableOpacity
                            onPress={() => onAddToCart(item)}
                            className="bg-primary rounded-[5px] px-[12px] py-[5px] w-full items-center"
                        >
                            <Text className="text-[15px] font-bold text-white">Add +</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="flex-row items-center bg-primary rounded-[5px] w-full justify-between">
                            <TouchableOpacity
                                onPress={() => onDecrement(item.id, quantity)}
                                className="px-[10px] py-[5px]"
                            >
                                <Text className="text-white text-[16px]">–</Text>
                            </TouchableOpacity>
                            <Text className="text-white text-[14px] font-bold px-[8px]">{quantity}</Text>
                            <TouchableOpacity
                                onPress={() => onIncrement(item.id)}
                                className="px-[10px] py-[5px]"
                            >
                                <Text className="text-white text-[16px]">+</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    )
}

export default MultipleItemsCard