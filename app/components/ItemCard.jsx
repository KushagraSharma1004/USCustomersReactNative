import { View, Text, Image, TouchableOpacity, Modal, ScrollView, FlatList } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Shadow } from 'react-native-shadow-2';

const ItemCard = ({ item, cartItem, onAddToCart, onIncrement, onDecrement, isStockVisible = true, offerBadge }) => {
  const [isItemImageModalVisible, setIsItemImageModalVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState(item?.images ? item?.images?.[0] : null)
  const [selectedVariant, setSelectedVariant] = useState(item?.variants?.[item?.variants?.length - 1] || null);
  const quantity = cartItem?.quantity || 0;
  const mrp = selectedVariant ? selectedVariant.prices[0].variantMrp : item.prices[0].mrp || 0;
  const sellingPrice = selectedVariant ? selectedVariant.prices[0].variantSellingPrice : item.prices[0].sellingPrice || 0;
  const discountPercentage =
    mrp > 0 ? (((mrp - sellingPrice) / mrp) * 100).toFixed(0) : 0;
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  useEffect(() => {
    if (item?.variants && item.variants.length > 0) {
      // Filter variants with non-zero stock
      const availableVariants = item.variants.filter((variant) => Number(variant?.variantStock || 0) !== 0);

      // Find the currently selected variant among available variants, or fallback to the first available variant
      const currentVariant = availableVariants.find(
        (variant) => variant.variantName === selectedVariant?.variantName
      ) || availableVariants[0] || null;

      setSelectedVariant(currentVariant);
    } else {
      setSelectedVariant(null);
    }
  }, [item, selectedVariant?.variantName]);

  return (
    <View className="flex-row justify-between items-center border-[1px] rounded-[7px] p-[10px] mb-[5px] bg-[#ffffffd9] max-h-[140px] relative">

      {/* Out of stock overlay */}
      {(selectedVariant ? selectedVariant.variantStock : item.stock) === 0 && (
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

      {offerBadge && (
        <View className='absolute top-[5px] right-[5px] bg-primaryGreen px-[5px] py-[2px] rounded-[5px]'>
          <Text className='text-white text-[10px]'>Offer</Text>
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
              item?.images
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
          {isStockVisible && <Text className="text-[12px] text-[#8B8000]">Stk: {selectedVariant ? selectedVariant.variantStock : item.stock}</Text>}
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
            <Text className="text-[12px]">{selectedVariant ? selectedVariant.prices[0].variantMeasurement : item.prices[0].measurement}</Text>
          </Text>
          <View className='flex-row' >
            {item?.variants?.length > 0 && (
              <View className="mr-[5px] rounded-[5px] border border-primary items-center justify-center min-w-[60px] max-w-[60px]">
                <TouchableOpacity
                  onPress={() => setIsDropdownVisible(true)}
                  className="bg-white rounded-[5px] justify-between items-center flex-row flex-1 w-full px-[3px]"
                >
                  <Text className="text-[10px] text-black">
                    {selectedVariant ? selectedVariant.variantName.slice(0, 10) + (selectedVariant.variantName.length > 10 ? '...' : '') : item?.name}
                  </Text>
                  <Text className='text-[14px]' >{'>'}</Text>
                </TouchableOpacity>
                <Modal
                  visible={isDropdownVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setIsDropdownVisible(false)}
                >
                  <TouchableOpacity
                    className="flex-1 bg-[rgba(0,0,0,0.5)] justify-center items-center"
                    onPress={() => setIsDropdownVisible(false)}
                  >
                    <View className="bg-white rounded-[5px] w-[80%] max-h-[200px] p-[10px]">
                      <FlatList
                        data={item.variants || []}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item: variant }) => (
                          <TouchableOpacity
                            // disabled={Number(variant?.variantStock) === 0}
                            onPress={() => {
                              if (Number(variant?.variantStock) === 0) {
                                return
                              }
                              // if (variant.value === item?.name) {
                              //   setSelectedVariant(null);
                              // } else {
                              setSelectedVariant(variant);
                              // }
                              setIsDropdownVisible(false);
                            }}
                            className={`py-[8px] px-[10px] border-b border-gray-200 ${Number(variant?.variantStock) === 0 ? 'opacity-30' : ''}`}
                          >
                            <Text className={`text-[16px] font-bold text-center text-black ${Number(variant?.variantStock) === 0 && 'line-through'}`}>
                              {variant.variantName}
                            </Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            )}
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
            className={`bg-white w-[95%] rounded-xl border-y-4 border-primary ${(selectedVariant ? selectedVariant?.variantDescription : item?.description) && (selectedVariant ? selectedVariant?.variantDescription : item?.description) !== "" ? 'max-h-[95%]' : 'max-h-[70%]'}`}
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
              {Array.from({ length: item?.images ? item?.images?.length : 0 }).map((_, idx) => (
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
            {(selectedVariant ? selectedVariant?.variantDescription : item?.description) && (selectedVariant ? selectedVariant?.variantDescription : item?.description) !== "" && (
              <>
                <Text className="text-center font-bold text-base">Description</Text>
                <View className="border border-gray-300 rounded-xl w-full p-3">
                  <Text className="text-sm text-gray-700">{(selectedVariant ? selectedVariant?.variantDescription : item?.description)}</Text>
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
