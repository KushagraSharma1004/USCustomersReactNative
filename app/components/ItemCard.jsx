import { View, Text, Image, TouchableOpacity, Modal, ScrollView } from 'react-native'
import React, { useState } from 'react'
import { Shadow } from 'react-native-shadow-2';

const ItemCard = ({ item, cartItem, onAddToCart, onIncrement, onDecrement, isStockVisible = true }) => {
  const [isItemImageModalVisible, setIsItemImageModalVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState(item?.images?.[0] || null)
  const quantity = cartItem?.quantity || 0;

  const mrp = item?.prices?.[0]?.mrp || 0;
  const sellingPrice = item?.prices?.[0]?.sellingPrice || 0;
  const discountPercentage =
    mrp > 0 ? (((mrp - sellingPrice) / mrp) * 100).toFixed(0) : 0;

  return (
    <View className="flex-row justify-between items-center border-b-[1px] border-r-[1px] rounded-[7px] p-[10px] mb-[5px] bg-[#ffffffd9] max-h-[140px] relative">

      {/* Out of stock overlay */}
      {item.stock === 0 && (
        <View className="h-[140px] bg-[rgba(0,0,0,0.5)] absolute z-20 justify-center items-center top-0 left-0 bottom-0 rounded-[7px] w-full">
          <Text className="text-white text-[24px] font-bold">Out of Stock</Text>
        </View>
      )}

      {/* Discount badge */}
      {discountPercentage > 0 && (
        <View className="absolute top-0 left-0 bg-primaryGreen rounded-tl-[7px] rounded-br-[7px] px-[8px] py-[4px] z-30">
          <Text className="text-white text-[12px] font-bold">
            {discountPercentage}% OFF
          </Text>
        </View>
      )}

      {/* Product Image */}
      <TouchableOpacity onPress={() => { setIsItemImageModalVisible(true) }} >
        <Shadow
          distance={5}
          startColor={'rgba(0,0,0,0.1)'}
          offset={[0, 3]}
          style={{ borderRadius: 7 }}
        >
          <Image
            source={
              item?.images?.[0]
                ? { uri: item.images[0] }
                : require('../../assets/images/placeholderImage.png')
            }
            className="rounded-[5px]"
            style={{ height: 120, width: 120 }}
          />
        </Shadow>
      </TouchableOpacity>

      {/* Details Section */}
      <View className="flex-col justify-between items-center h-[120px] flex-1">
        {/* Name + Stock */}
        <View className="flex-row justify-between items-center w-full px-[7px]">
          <Text className="text-[16px] max-w-[75%]">{item.name}</Text>
          {isStockVisible && <Text className="text-[12px] text-[#8B8000]">Stk: {item.stock}</Text>}
        </View>

        {/* MRP + Subtotal */}
        <View className="flex-row justify-between items-center w-full px-[7px]">
          <Text className="text-[12px] line-through text-red-500">MRP: ₹{mrp}</Text>
          {quantity !== 0 ? (
            <Text className="text-[12px] text-[#28a745] font-bold">
              <Text className="text-[10px] font-normal">Sub Total:</Text> ₹
              {quantity * sellingPrice}
            </Text>
          ) : (
            <Text className="text-[12px] text-[#28a745] font-bold">
              <Text className="text-[10px] font-normal">Sub Total:</Text> ₹0
            </Text>
          )}
        </View>

        {/* Price + Cart Controls */}
        <View className="flex-row justify-between items-center w-full px-[7px]">
          <Text className="text-[22px] font-bold text-primary">
            ₹{sellingPrice}/
            <Text className="text-[12px]">{item.prices[0].measurement}</Text>
          </Text>
          {quantity === 0 ? (
            <TouchableOpacity
              onPress={() => onAddToCart(item)}
              className="bg-primary rounded-[5px] px-[12px] py-[5px] z-[50px]"
            >
              <Text className="text-[15px] font-bold text-white">Add +</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row items-center bg-primary rounded-[5px]">
              <TouchableOpacity
                onPress={() => onDecrement(item.id, quantity)}
                className="px-[10px] py-[5px]"
              >
                <Text className="text-white text-[16px]">–</Text>
              </TouchableOpacity>
              <Text className="text-white text-[14px] font-bold px-[8px]">
                {quantity}
              </Text>
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

      <Modal animationType="slide" transparent={true} visible={isItemImageModalVisible}>
        <TouchableOpacity
          onPress={() => setIsItemImageModalVisible(false)}
          className="flex-1 bg-[#00000060] items-center justify-center"
          activeOpacity={1}
        >

          <ScrollView
            stickyHeaderIndices={[0]}
            // StickyHeaderComponent={() => <Text className="text-center text-lg font-semibold text-black mb-2 ">{item?.name}</Text>}
            className={`bg-white w-[95%] rounded-xl border-y-4 border-primary ${item?.description && item?.description !== "" ? 'max-h-[95%]' : 'max-h-[70%]'}`}
            contentContainerStyle={{
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
              gap: 5,
            }}
          >
            <Text className="text-center text-lg font-semibold text-black bg-white p-[5px] w-screen">{item?.name}</Text>
            {/* Main Image */}
            <Image
              style={{ height: 300, width: 300 }}
              className="rounded-xl"
              source={selectedImage ? { uri: selectedImage } : require("../../assets/images/icon.png")}
              resizeMode="cover"
            />

            {/* Thumbnails Row */}
            <View className="w-full flex-row justify-between">
              {Array.from({ length: item?.images.length }).map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  className="w-[22.5%] "
                  onPress={() => setSelectedImage(item?.images?.[idx])}
                >
                  {item?.images?.[idx] ? (
                    <Image
                      source={{ uri: item?.images?.[idx] }}
                      className={`rounded-md h-20 ${selectedImage === item?.images?.[idx] ? "border-2 border-primary" : ""}`}
                      resizeMode="cover"
                    />
                  ) : (
                    // <View className="h-20 w-full rounded-md bg-primaryLight items-center justify-center">
                    //   <Text className="text-xl text-white font-bold">+</Text>
                    // </View>
                    <></>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            {item?.description && item?.description !== "" && (
              <>
                <Text className="text-center font-bold text-base">Description</Text>
                <View className="border border-gray-300 rounded-xl w-full p-3">
                  <Text className="text-sm text-gray-700">{item?.description}</Text>
                </View>
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

export default ItemCard;
