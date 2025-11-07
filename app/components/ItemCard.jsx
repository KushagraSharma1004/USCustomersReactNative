import { View, Text, Image, TouchableOpacity, Modal, ScrollView, FlatList } from 'react-native'
import React, { useState, useEffect } from 'react'
import { Shadow } from 'react-native-shadow-2';

const ItemCard = ({ item, cartItems, onAddToCart, onIncrement, onDecrement, isStockVisible = true, offerBadge, isVariantsSelectorDisabled = false, variantId }) => {
  const [isItemImageModalVisible, setIsItemImageModalVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState(item?.images ? item?.images?.[0] : null)
  const [selectedVariant, setSelectedVariant] = useState(
    // variantId ? item?.variants.filter((variant) => variant.hidden === false)?.find(variant => variant.id === variantId) || [] : item?.variants?.[item?.variants?.length - 1] || []
  );

  const getQuantity = () => {
    if (!cartItems || Object.keys(cartItems).length === 0) {
      return 0;
    }

    const cartItemsArray = Object.values(cartItems);

    if (selectedVariant) {
      // For variants, look for cart item with matching variant ID
      const variantCartItem = cartItemsArray.find(
        cart => cart?.variantId === selectedVariant.id
      );
      return variantCartItem?.quantity || 0;
    } else {
      // For regular items, look for cart item with base item ID and no variant
      const regularCartItem = cartItemsArray.find(
        cart => cart?.id === item.id && (!cart?.variantId || cart?.variantId === '')
      );
      return regularCartItem?.quantity || 0;
    }
  };

  const getQuantityForParticularItem = (itemId) => {
    if (!cartItems || Object.keys(cartItems).length === 0) {
      return 0;
    }

    const cartItemsArray = Object.values(cartItems);

    if (itemId) {
      // For variants, look for cart item with matching variant ID
      const variantCartItem = cartItemsArray.find(
        cart => cart?.variantId === itemId
      );
      return variantCartItem?.quantity || 0;
    }
  };

  const quantity = getQuantity();

  const [mrp, setMrp] = useState(item?.prices?.[0]?.mrp || 0)
  const [sellingPrice, setSellingPrice] = useState(item?.prices?.[0]?.sellingPrice || 0)
  const [discountPercentage, setDiscountPercentage] = useState(mrp > 0 ? (((mrp - sellingPrice) / mrp) * 100).toFixed(0) : 0)
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  useEffect(() => {
    if (selectedVariant) {
      const variantPrice = selectedVariant.prices?.[0] || {};
      const newMrp = variantPrice.variantMrp || 0;
      const newSellingPrice = variantPrice.variantSellingPrice || 0;

      setMrp(newMrp);
      setSellingPrice(newSellingPrice);
      setDiscountPercentage(
        newMrp > 0 ? (((newMrp - newSellingPrice) / newMrp) * 100).toFixed(0) : 0
      );
    }
  }, [selectedVariant]);

  useEffect(() => {
    if (item?.variants && item.variants.length > 0) {
      const availableVariants = item.variants.filter((variant) =>
        variant.hidden === false && Number(variant.variantStock) > 0
      );

      let selectedVariantData = null;

      if (availableVariants.length === 0) {
        // No available variants, use the first variant regardless of stock
        selectedVariantData = item.variants.find(variant => variant.hidden === false) || item.variants[0];
      } else if (availableVariants.length === 1) {
        selectedVariantData = availableVariants[0];
      } else if (variantId) {
        selectedVariantData = availableVariants.find((variant) => variant.id === variantId) || availableVariants[0];
      } else {
        selectedVariantData = availableVariants[0] || item.variants[0];
      }

      if (selectedVariantData) {
        const variantPrice = selectedVariantData.prices?.[0] || {};
        const newMrp = variantPrice.variantMrp || 0;
        const newSellingPrice = variantPrice.variantSellingPrice || 0;

        setSelectedVariant(selectedVariantData);
        setMrp(newMrp);
        setSellingPrice(newSellingPrice);
        setDiscountPercentage(
          newMrp > 0 ? (((newMrp - newSellingPrice) / newMrp) * 100).toFixed(0) : 0
        );
      }
    }
  }, [item, variantId])

  const getCartItemId = () => {
    if (selectedVariant) {
      return selectedVariant.id;
    } else {
      return item.id;
    }
  };

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

        {/* Name + Variant */}
        <View className="flex-row justify-between items-center w-full px-[7px]">
          <Text className="text-[16px] max-w-[65%]">{item.name}</Text>
          {item?.variants?.length > 0 && (
            <View className="rounded-[5px] border border-primary items-center justify-center min-w-[70px] max-w-[70px] py-[5px]">
              <TouchableOpacity
                disabled={isVariantsSelectorDisabled}
                onPress={() => setIsDropdownVisible(true)}
                className={`bg-white rounded-[5px] ${isVariantsSelectorDisabled ? 'justify-center' : 'justify-between'} items-center flex-row flex-1 w-full px-[3px]`}
              >
                <Text className="text-[10px] text-black">
                  {selectedVariant ? selectedVariant.variantName.slice(0, 8) + (selectedVariant.variantName.length > 8 ? '...' : '') : item?.name}
                </Text>
                {!isVariantsSelectorDisabled && <Text className='text-[14px]' >{'>'}</Text>}
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
                  <View className="bg-white rounded-[5px] w-[90%] max-h-[90%] p-[10px]">
                    <FlatList
                      data={item.variants.filter((variant) => variant.hidden === false) || []}
                      keyExtractor={(item, index) => index.toString()}
                      ListHeaderComponent={() => <Text className='text-center pb-[5px] border-b-[3px] border-primary rounded-[10px] font-bold text-[20px] text-primary' >{item?.name}</Text>}
                      renderItem={({ item: variant }) => (
                        <TouchableOpacity
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
                          className="py-[8px] border-b border-gray-200 items-center"
                        >
                          <View className='w-full flex-row justify-between' >
                            <View className='gap-[2px]' >
                              <Text className={`text-[12px] ${selectedVariant?.id === variant?.id ? 'text-primary' : 'text-black'} leading-none ${Number(variant.variantStock) === 0 ? 'text-primaryRed line-through' : ''}`}>{variant?.prices?.[0].variantSellingPrice}/{variant?.prices?.[0]?.variantMeasurement}</Text>
                              <Text className={`text-[12px] ${selectedVariant?.id === variant?.id ? 'text-primary' : 'text-[#8B8000]'} leading-none ${Number(variant.variantStock) === 0 ? 'text-primaryRed line-through' : ''}`}>Stk: {variant.variantStock}</Text>
                            </View>
                            <Text className={`text-[16px] ${selectedVariant?.id === variant?.id ? 'text-primary' : 'text-black'} text-center flex-1 font-bold ${Number(variant.variantStock) === 0 ? 'text-primaryRed line-through' : ''} flex-1`}>
                              {variant.variantName}
                            </Text>
                            <>
                              {getQuantityForParticularItem(variant?.id) === 0 ? (
                                <TouchableOpacity
                                  disabled={Number(variant?.variantStock) === 0}
                                  onPress={() => onAddToCart(item, variant)}
                                  className={`${Number(variant?.variantStock) === 0 ? 'bg-[#ccc]' : 'bg-primary'} rounded-[5px] px-[12px] py-[5px] z-[50px]`}
                                >
                                  <Text className="text-[15px] font-bold text-white">Add +</Text>
                                </TouchableOpacity>
                              ) : (
                                <View className="flex-row items-center bg-primary rounded-[5px]">
                                  <TouchableOpacity
                                    disabled={Number(variant?.variantStock) === 0}
                                    onPress={() => onDecrement(variant?.id, getQuantityForParticularItem(variant?.id))}
                                    className="px-[10px] py-[5px]"
                                  >
                                    <Text className="text-white text-[16px]">–</Text>
                                  </TouchableOpacity>
                                  <Text className="text-white text-[14px] font-bold px-[8px]">
                                    {getQuantityForParticularItem(variant?.id)}
                                  </Text>
                                  <TouchableOpacity
                                    disabled={Number(variant?.variantStock) === 0}
                                    onPress={() => onIncrement(variant?.id)}
                                    className="px-[10px] py-[5px]"
                                  >
                                    <Text className="text-white text-[16px]">+</Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </>
                          </View>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          )}
          {!item?.variants?.length > 0 && (
            <>
              {isStockVisible && <Text className="text-[12px] text-[#8B8000]">Stk: {selectedVariant ? selectedVariant.variantStock : item.stock}</Text>}
            </>
          )}
        </View>

        {/* Stock */}
        {item?.variants?.length > 0 && (
          <View className="flex-row justify-end items-center w-full px-[7px]">
            {isStockVisible && <Text className="text-[12px] text-[#8B8000]">Stk: {selectedVariant ? selectedVariant.variantStock : item.stock}</Text>}
          </View>
        )}

        {/* MRP + Sub-total */}
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
            {quantity === 0 ? (
              <TouchableOpacity
                onPress={() => onAddToCart(item, selectedVariant)}
                className="bg-primary rounded-[5px] px-[12px] py-[5px] z-[50px]"
              >
                <Text className="text-[15px] font-bold text-white">Add +</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center bg-primary rounded-[5px]">
                <TouchableOpacity
                  onPress={() => onDecrement(getCartItemId(), quantity)}
                  className="px-[10px] py-[5px]"
                >
                  <Text className="text-white text-[16px]">–</Text>
                </TouchableOpacity>
                <Text className="text-white text-[14px] font-bold px-[8px]">
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => onIncrement(getCartItemId())}
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
            className={`bg-white w-[95%] rounded-xl border-y-4 border-primary ${(selectedVariant ? selectedVariant?.variantDescription : item?.description) && (selectedVariant ? selectedVariant?.variantDescription : item?.description) !== "" ? 'max-h-[95%]' : 'max-h-[70%]'}`}
            contentContainerStyle={{
              alignItems: "center",
              justifyContent: "center",
              padding: 10,
              gap: 5,
            }}
          >
            
            <View className='w-full' >
              <Text className="text-center text-lg font-semibold text-black bg-white p-[5px] w-screen">{item?.name}</Text>
              <Image style={{ height: 30, width: 30 }} className="w-[20px] h-[20px] absolute top-[0px] right-[20px] bg-white rounded-full" source={require("../../assets/images/crossImage.png")} ></Image>
            </View>

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
                  className="w-[22.5%]"
                  onPress={() => setSelectedImage(item?.images?.[idx])}
                >
                  {item?.images?.[idx] ? (
                    <Image
                      source={{ uri: item?.images?.[idx] }}
                      className={`rounded-md h-20 ${selectedImage === item?.images?.[idx] ? "border-2 border-primary" : ""}`}
                      resizeMode="cover"
                    />
                  ) : (
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
