import { View, Text, Image, TouchableOpacity, Modal, ScrollView, FlatList } from 'react-native'
import React, { useState, useEffect, useRef } from 'react'
import { Shadow } from 'react-native-shadow-2';
import { encryptData } from '../context/hashing';

const ItemCard = ({ item, cartItems, onAddToCart, onIncrement, onDecrement, isStockVisible = true, offerBadge, isVariantsSelectorDisabled = false, variantId, itemIdForItemDetailModal = null, setItemIdForItemDetailModal, vendorFullData }) => {
  // const [isItemImageModalVisible, setIsItemImageModalVisible] = useState(false)
  const [isItemDetailsModalVisible, setIsItemDetailsModalVisible] = useState(false)
  const [selectedImage, setSelectedImage] = useState(item?.images ? item?.images?.[0] : null)
  const [selectedVariant, setSelectedVariant] = useState();
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

  useEffect(() => {
    if (!itemIdForItemDetailModal) return;

    // Check if this item matches the itemIdForItemDetailModal
    const shouldOpenModal =
      // Case 1: This is a regular item and ID matches
      item.id === itemIdForItemDetailModal ||
      // Case 2: This item has variants and one of them matches
      (item?.variants?.some(variant => variant.id === itemIdForItemDetailModal));

    if (shouldOpenModal) {
      // If it's a variant, set the selected variant
      if (item?.variants?.length > 0) {
        const targetVariant = item.variants.find(variant => variant.id === itemIdForItemDetailModal);
        if (targetVariant) {
          setSelectedVariant(targetVariant);
        }
      }
      setIsItemDetailsModalVisible(true);

      // Reset the parent state after opening modal
      if (setItemIdForItemDetailModal) {
        setTimeout(() => setItemIdForItemDetailModal(null), 100);
      }
    }
  }, [itemIdForItemDetailModal, item]);

  // Add proper cleanup when modal closes
  const handleCloseItemDetailsModal = () => {
    setIsItemDetailsModalVisible(false);
    setSelectedImage(item?.images?.[0] || null);

    // Also reset the parent state
    if (setItemIdForItemDetailModal) {
      setItemIdForItemDetailModal(null);
    }
  };

  const getCartItemId = () => {
    if (selectedVariant) {
      return selectedVariant.id;
    } else {
      return item.id;
    }
  };

  // const handleShare = async () => {
  //   try {
  //     const currentUrl = new URL(window.location.href);
  //     const vendorParam = currentUrl.searchParams.get('vendor');
  //     const vendorLink = `https://customers.unoshops.com/Vendors?vendor=${vendorParam}&itemCard=${encryptData(item?.variants?.length > 0 ? selectedVariant?.id : item.id)}`;

  //     const imageUrl = item?.images?.[0];

  //     if (!imageUrl) {
  //       throw new Error("No image available to share");
  //     }

  //     // Fetch image and convert to Blob
  //     const response = await fetch(imageUrl);
  //     if (!response.ok) throw new Error("Failed to fetch image");
  //     const blob = await response.blob();

  //     // Create File with proper name and type
  //     const file = new File([blob], `${item.name.replace(/\s+/g, '_')}.jpg`, {
  //       type: blob.type || 'image/jpeg',
  //     });

  //     // NOW check if sharing files is supported
  //     const shareData = {
  //       title: item.name,
  //       text: `Check out this product: ${item.name} on UnoShops.`,
  //       url: vendorLink,
  //       files: [file],
  //     };

  //     const canShareFiles = navigator.share && navigator.canShare && navigator.canShare(shareData);

  //     if (canShareFiles) {
  //       await navigator.share(shareData);
  //     } else {
  //       // Fallback: Share without file
  //       await navigator.share({
  //         title: item.name,
  //         text: `Check out this product: ${item.name} on UnoShops.`,
  //         url: vendorLink,
  //       });
  //     }
  //   } catch (error) {
  //     console.error('Sharing failed:', error);

  //     // Final fallback: Copy link
  //     const vendorLink = `${window.location.origin}${window.location.pathname}?itemCard=${encryptData(item.id)}`;
  //     if (navigator.clipboard) {
  //       await navigator.clipboard.writeText(vendorLink);
  //       alert("Link copied to clipboard!");
  //     } else {
  //       alert("Sharing not supported. Link: " + vendorLink);
  //     }
  //   }
  // };

  const shortenUrl = async (longUrl, timeoutMs = 8000) => {
    // CORRECT LIVE URL (as of your latest deploy)
    const API_URL = "https://shortener-rvt7os5vva-uc.a.run.app/api/shorten";

    // Your secret API key from shortener.js
    const API_KEY = "9m3ee5n2a0k0s0h3i6_0ravi";  // Change this to a strong key!

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({ url: longUrl }),
        signal: controller.signal,
        mode: "cors"
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn("Shortener API error:", response.status, errorText);
        return longUrl;
      }

      const data = await response.json();

      if (data.success && data.shortUrl) {
        console.log("Shortened:", data.shortUrl);
        return data.shortUrl; // e.g., https://go.unoshops.com/aB3k9m
      } else {
        console.warn("Shortener returned invalid data:", data);
        return longUrl;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        console.warn("Shorten request timed out after", timeoutMs + "ms");
      } else {
        console.warn("Failed to shorten URL:", error.message);
      }

      return longUrl; // Always fall back safely
    }
  };

  const handleShare = async () => {
    try {
      const currentUrl = new URL(window.location.href);
      const vendorParam = currentUrl.searchParams.get('vendor');
      const itemId = item?.variants?.length > 0 ? selectedVariant?.id : item.id;
      const encryptedId = encryptData(itemId);

      const imageUrl = item?.images?.[0];

      if (!imageUrl) {
        throw new Error("No image available to share");
      }

      // Extract image path from Firebase Storage URL
      let imagePath = '';
      try {
        const urlObj = new URL(imageUrl);
        if (urlObj.pathname.includes('/o/')) {
          const pathPart = urlObj.pathname.split('/o/')[1];
          imagePath = decodeURIComponent(pathPart);
        } else {
          imagePath = imageUrl;
        }
      } catch (e) {
        imagePath = imageUrl;
      }

      // Create share URL with ALL necessary parameters for Firebase function
      const shareUrl = `https://dl.unoshops.com/share?path=${encodeURIComponent(imagePath)}&itemname=${encodeURIComponent(item.name)}&vendor=${encodeURIComponent(vendorParam)}&itemId=${encodeURIComponent(itemId)}&encryptedId=${encodeURIComponent(encryptedId)}`;
      const shortUrl = await shortenUrl(shareUrl);
      const shareData = {
        title: item.name,
        text: `${item?.name}\n*Get it for only ₹${item?.variants?.length > 0 ? selectedVariant?.prices?.[0]?.variantSellingPrice : item?.prices?.[0]?.sellingPrice} /* ${item?.variants?.length > 0 ? selectedVariant?.prices?.[0]?.variantMeasurement : item?.prices?.[0]?.measurement}\nSold by: ${vendorFullData?.businessName}.【 T&C 】\n`,
        url: shortUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Share link copied to clipboard!");
      } else {
        alert(`Share this link: ${shareUrl}`);
      }
    } catch (error) {
      console.error('Sharing failed:', error);

      // Error fallback
      const currentUrl = new URL(window.location.href);
      const vendorParam = currentUrl.searchParams.get('vendor');
      const itemId = item?.variants?.length > 0 ? selectedVariant?.id : item.id;
      const encryptedId = encryptData(itemId);
      const fallbackUrl = `https://customers.unoshops.com/Vendors?vendor=${vendorParam}&itemCard=${encryptedId}`;

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fallbackUrl);
        alert("Direct link copied to clipboard!");
      } else {
        alert(`Share this link: ${fallbackUrl}`);
      }
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
      <TouchableOpacity onPress={() => { setIsItemDetailsModalVisible(true) }} >
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
          {/* <View className='flex-row gap-[2px]' > */}
          <View className='max-w-[65%]'>
            <Text className="text-[16px] items-center">
              {item.name}
            </Text>
          </View>
          {/* </View> */}
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
          <View className="flex-row justify-between items-center w-full px-[7px]">
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

      <Modal
        animationType="slide"
        transparent={true}
        visible={isItemDetailsModalVisible}
        onRequestClose={handleCloseItemDetailsModal}
      >
        <View
          // onPress={handleCloseItemDetailsModal}
          className="flex-1 bg-[#00000060] items-center justify-center"
        // activeOpacity={1}
        >
          <FlatList
            data={[0]} // dummy data just to enable rendering
            keyExtractor={() => "dummy"}
            scrollEnabled={true}
            stickyHeaderIndices={[0]}
            ListHeaderComponent={() => (
              <View className='w-full items-center justify-between bg-white rounded-b-[5px] min-w-[100%] z-50'>
                <View className='w-full flex-row justify-end items-center gap-[20px]' >
                  <TouchableOpacity onPress={handleShare} className=''>
                    <Image source={require('../../assets/images/shareImage2.png')} style={{ width: 30, height: 30 }} className="w-[30px] h-[30px] rounded-[5px]" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCloseItemDetailsModal}
                    className="bg-white rounded-full p-[3px] z-50"
                  >
                    <Image
                      source={require("../../assets/images/crossImage.png")}
                      style={{ height: 30, width: 30 }}
                    />
                  </TouchableOpacity>
                </View>
                <Text className="text-center text-[18px] font-semibold text-black flex-1">
                  {item?.name}
                </Text>
              </View>
            )}
            className="bg-white w-[95%] max-h-[98%] p-[10px] pt-[0px] rounded-xl border-y-4 border-primary"
            renderItem={() => (
              <View
                className="gap-[5px] items-center justify-center"
              >

                {/* Main Image */}
                <Image
                  style={{ height: 300, width: 300 }}
                  className="rounded-xl"
                  source={selectedImage ? { uri: selectedImage } : require("../../assets/images/icon.png")}
                  resizeMode="cover"
                />

                {/* Thumbnails Row */}
                {item?.images && item.images.length > 1 && (
                  <View className="w-full flex-row justify-between flex-wrap">
                    {item.images.map((image, idx) => (
                      <TouchableOpacity
                        key={idx}
                        className="w-[22.5%] mb-2"
                        onPress={() => setSelectedImage(image)}
                      >
                        <Image
                          source={{ uri: image }}
                          className={`rounded-md h-20 ${selectedImage === image ? "border-2 border-primary" : ""}`}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Variants Selection */}
                {item?.variants && item.variants.length > 0 && (
                  <View className="w-full">
                    {item.variants
                      .filter(variant => variant.hidden === false)
                      .map((variant, index) => {
                        const variantQuantity = getQuantityForParticularItem(variant.id);
                        const isSelected = selectedVariant?.id === variant.id;
                        const isOutOfStock = Number(variant.variantStock) === 0;

                        return (
                          <View
                            key={variant.id}
                            className={`p-[5px] mb-[3px] rounded-lg gap-[2px] border-2 ${isSelected ? 'border-primary bg-blue-50' : 'border-gray-200'} ${isOutOfStock ? 'border-primaryRed bg-[#ccc]' : ''}`}
                          >
                            {isOutOfStock && <Text className='text-[24px] absolute self-center text-white font-bold top-[30%]' >Out Of Stock</Text>}
                            <Text className={`text-[16px] font-bold ${isSelected ? 'text-primary' : 'text-black'} ${isOutOfStock ? 'line-through' : ''} w-full text-center`}>
                              {variant.variantName}
                            </Text>

                            <View className="flex-row justify-between items-center w-full">
                              <Text className="text-[12px] line-through text-primaryRed">
                                MRP: ₹{variant.prices[0].variantMrp}
                              </Text>
                              <Text className={`text-[12px] ${isOutOfStock ? 'text-red-500' : 'text-[#8B8000]'}`}>
                                Stock: {variant.variantStock}
                              </Text>
                            </View>

                            <View className="flex-row justify-between items-center w-full">
                              <Text className="text-[16px] font-bold text-primary">
                                ₹{variant.prices[0].variantSellingPrice}
                                <Text className="text-[12px]">/{variant.prices[0].variantMeasurement}</Text>
                              </Text>
                              <View className="flex-row items-center gap-2">
                                {/* Selection Radio Button */}
                                <TouchableOpacity
                                  disabled={isOutOfStock}
                                  onPress={() => {
                                    if (!isOutOfStock) {
                                      setSelectedVariant(variant);
                                    }
                                  }}
                                  className={`w-6 h-6 rounded-full border-2 ${isSelected ? 'bg-primary border-primary' : 'border-gray-400'
                                    } ${isOutOfStock ? 'border-gray-300' : ''}`}
                                >
                                  {isSelected && (
                                    <View className="w-3 h-3 bg-white rounded-full m-auto" />
                                  )}
                                </TouchableOpacity>

                                {/* Cart Controls */}
                                {!isOutOfStock && (
                                  variantQuantity === 0 ? (
                                    <TouchableOpacity
                                      onPress={() => onAddToCart(item, variant)}
                                      className="bg-primary rounded-[5px] p-[5px] min-w-[80px]"
                                    >
                                      <Text className="text-white text-sm font-bold text-center">Add +</Text>
                                    </TouchableOpacity>
                                  ) : (
                                    <View className="flex-row items-center bg-primary rounded-[5px] justify-center gap-[15px] px-[8px]">
                                      <TouchableOpacity
                                        onPress={() => onDecrement(variant.id, variantQuantity)}
                                        className=""
                                      >
                                        <Text className="text-white text-lg">–</Text>
                                      </TouchableOpacity>
                                      <Text className="text-white text-sm font-bold ">
                                        {variantQuantity}
                                      </Text>
                                      <TouchableOpacity
                                        onPress={() => onIncrement(variant.id)}
                                        className=""
                                      >
                                        <Text className="text-white text-lg">+</Text>
                                      </TouchableOpacity>
                                    </View>
                                  )
                                )}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                  </View>
                )}

                {/* For items without variants */}
                {(!item?.variants || item.variants.length === 0) && (
                  <View className="w-full mt-3">
                    {/* Price Information */}
                    <View className="w-full flex-row justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <View>
                        <Text className="text-lg font-bold text-primary">
                          ₹{item.prices[0].sellingPrice}
                          <Text className="text-sm">/{item.prices[0].measurement}</Text>
                        </Text>
                        {item.prices[0].mrp > item.prices[0].sellingPrice && (
                          <Text className="text-sm line-through text-gray-500">
                            MRP: ₹{item.prices[0].mrp}
                          </Text>
                        )}
                        <Text className={`text-xs ${item.stock === 0 ? 'text-red-500' : 'text-green-600'}`}>
                          Stock: {item.stock}
                        </Text>
                      </View>

                      {/* Cart Controls for non-variant items */}
                      {item.stock > 0 && (
                        <View className='flex-row'>
                          {quantity === 0 ? (
                            <TouchableOpacity
                              onPress={() => {
                                onAddToCart(item, null);
                                handleCloseItemDetailsModal();
                              }}
                              className="bg-primary rounded-[5px] px-4 py-2"
                            >
                              <Text className="text-white text-sm font-bold">Add to Cart</Text>
                            </TouchableOpacity>
                          ) : (
                            <View className="flex-row items-center bg-primary rounded-[5px]">
                              <TouchableOpacity
                                onPress={() => onDecrement(item.id, quantity)}
                                className="px-3 py-2"
                              >
                                <Text className="text-white text-lg">–</Text>
                              </TouchableOpacity>
                              <Text className="text-white text-sm font-bold px-3">
                                {quantity}
                              </Text>
                              <TouchableOpacity
                                onPress={() => onIncrement(item.id)}
                                className="px-3 py-2"
                              >
                                <Text className="text-white text-lg">+</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Description */}
                {(selectedVariant ? selectedVariant?.variantDescription : item?.description) && (
                  (selectedVariant ? selectedVariant?.variantDescription : item?.description) !== "" && (
                    <>
                      <Text className="text-center font-bold text-base w-full">Description</Text>
                      <View className="border border-gray-300 rounded-xl w-full p-3">
                        <Text className="text-sm text-gray-700">
                          {selectedVariant ? selectedVariant?.variantDescription : item?.description}
                        </Text>
                      </View>
                    </>
                  )
                )}
              </View>
            )}
          />
        </View>
      </Modal>

    </View>
  );
};

export default ItemCard;
