import { View, Text, Image, TouchableOpacity, TextInput, Modal } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { useAddressSheet } from './context/AddressSheetContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase'
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const EditButton = ({ isEditing, onPress }) => {
  if (isEditing === false) {
    return (
      <TouchableOpacity onPress={onPress} className='rounded-full h-[30px] w-[30px] items-center justify-center bg-primary absolute top-[3px] right-[3px] z-50' ><Text className='text-center text-white text-[14px] leading-none' >✎</Text></TouchableOpacity>
    )
  }
  return null
}

const Profile = () => {
  const { customerFullData, customerAddress, customerMobileNumber, setCustomerFullData } = useAuth()
  const { openAddressSheet } = useAddressSheet()
  const [isEditingBox1, setIsEditingBox1] = useState(false)
  const [isEditingBox2, setIsEditingBox2] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState(customerFullData?.customerName)
  const [newCustomerPassword, setNewCustomerPassword] = useState(customerFullData?.customerPassword)
  const [customerImagePreview, setCustomerImagePreview] = useState(null);
  const [showImagePickerOptions, setShowImagePickerOptions] = useState(false);
  const [customerImage, setCustomerImage] = useState(null)

  const handleSaveChangesOfBox1 = async () => {
    try {
      const customerRef = doc(db, 'customers', customerMobileNumber)
      if (newCustomerName === '' || newCustomerPassword === '') {
        alert('Please fill the details properly.')
        return
      }
      await updateDoc(customerRef, {
        customerName: newCustomerName.trimEnd(),
        customerPassword: newCustomerPassword
      })
      setIsEditingBox1(!isEditingBox1)

      setCustomerFullData({
        ...customerFullData,
        customerName: newCustomerName.trimEnd(),
        customerPassword: newCustomerPassword
      })

      alert('Changes saved successfully.')
    } catch (error) {
      console.log('Error updating box 1: ', error)
    }
  }

  const uploadCustomerImage = async () => {
    if (!customerImage) return null;

    try {
      // Convert the image URI to a blob
      const blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function () {
          reject(new TypeError('Network request failed'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', customerImage, true);
        xhr.send(null);
      });

      const storage = getStorage();
      const storageRef = ref(storage, `customerImages/${customerMobileNumber}/${uuidv4()}.jpeg`);

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Clean up the blob
      if (blob.close) {
        blob.close();
      }

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading customer image: ", error);
      setErrorMessage('Failed to upload customer image. Please try again.');
      return null;
    }
  };

  const handleSaveNewCustomerImage = async () => {
    try {
      const imageUrl = await uploadCustomerImage();
      await updateDoc(doc(db, 'customers', customerMobileNumber), {
        customerImage: imageUrl
      })
      setCustomerFullData({
        ...customerFullData,
        customerImage: imageUrl
      })
      setCustomerImagePreview(null);
      setCustomerImage(null)
      setShowImagePickerOptions(false);
      alert('Image saved successfully.')
    } catch (error) {
      console.log('Error updating image: ', error)
      alert('Error updating image. Please try again.')
    }
  }

  const handleImagePick = (type) => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 200,
      maxWidth: 200,
    };

    const callback = (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.assets && response.assets.length > 0) {
        const source = response.assets[0].uri;
        setCustomerImagePreview(source);
        setCustomerImage(source)
        // You can also upload the image to your server here
      }
      setShowImagePickerOptions(false);
    };

    if (type === 'camera') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  return (
    <View className='flex-1 p-[10px] gap-[5px]'>

      <View className='flex-row w-full bg-white rounded-t-[10px] h-[110px] p-[10px]' >
        <TouchableOpacity className='absolute z-50' onPress={() => setShowImagePickerOptions(true)} ><Image style={{ height: 100, width: 100 }} className='rounded-[5px] border-[2px] border-primary' source={customerImagePreview ? {uri: customerImagePreview} : customerFullData?.customerImage ? { uri: customerFullData?.customerImage } : require('../assets/images/icon.png')} /></TouchableOpacity>
        <View className='flex-1 h-[30px] flex-row gap-[5px] items-center justify-center mt-[10px]' ><Image style={{ height: 30, width: 30 }} source={require('../assets/images/profileImage.png')} /><Text className='font-bold text-primary text-[16px]' >Profile</Text></View>
      </View>

      <View className='p-[10px] border-b-[5px] border-primary rounded-b-[10px] bg-white gap-[5px] mt-[-5px]' >
        <EditButton isEditing={isEditingBox1} onPress={() => setIsEditingBox1(!isEditingBox1)} />
        <View className='flex-row gap-[5px] items-center' ><Text className='font-bold' >Name:</Text>{isEditingBox1 ? <TextInput className='p-[10px] rounded-[5px] border border-[#ccc] flex-1' value={newCustomerName} onChangeText={setNewCustomerName} /> : <Text>{customerFullData.customerName}</Text>}</View>
        <View className='flex-row gap-[5px] items-center' ><Text className='font-bold' >Password:</Text>{isEditingBox1 ? <TextInput className='p-[10px] rounded-[5px] border border-[#ccc] flex-1' value={newCustomerPassword} onChangeText={setNewCustomerPassword} /> : <Text>{customerFullData.customerPassword}</Text>}</View>
        {isEditingBox1 && <View className='flex-row w-full gap-[10px]' >
          <TouchableOpacity onPress={handleSaveChangesOfBox1} className='p-[10px] rounded-[10px] bg-primaryGreen flex-1' ><Text className='text-white font-bold text-[16px] text-center' >Save Changes</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => { setIsEditingBox1(!isEditingBox1); setNewCustomerName(customerFullData.customerName); setNewCustomerPassword(customerFullData.customerPassword); }} className='p-[10px] rounded-[10px] bg-primaryRed flex-1' ><Text className='text-white font-bold text-[16px] text-center' >Cancel</Text></TouchableOpacity>
        </View>}
      </View>

      <TouchableOpacity onPress={openAddressSheet} className='p-[10px] border-b-[5px] border-primary rounded-[10px] bg-white gap-[5px]' >
        <EditButton isEditing={isEditingBox2} onPress={() => openAddressSheet()} />
        <View className='flex-row gap-[5px]' ><Text className='font-bold' >Delivery Address:</Text></View>
        <View className='flex-col gap-[3px]' >
          <Text className='font-bold' >{customerAddress.nameForAddress}</Text>
          <Text className='text-[12px]' >{customerAddress.customerPlotNumber}, {customerAddress.customerComplexNameOrBuildingName}, {customerAddress.customerRoadNameOrStreetName}, {customerAddress.customerLandmark}</Text>
          <Text className='text-[12px]' >{customerAddress.customerVillageNameOrTownName}, {customerAddress.customerCity}, {customerAddress.customerState} - {customerAddress.customerPincode}</Text>
          <Text>Ph no. {customerAddress.mobileNumberForAddress}</Text>
        </View>
      </TouchableOpacity>

      <View className='p-[10px] border-b-[5px] border-primary rounded-[10px] bg-white gap-[5px]' >
        <View className='flex-row gap-[5px] justify-between' ><Text className='font-bold' >Mobile Number:</Text><Text>{customerFullData.customerMobileNumber}</Text></View>
        <View className='flex-row gap-[5px] justify-between' ><Text className='font-bold' >Referral Code:</Text><Text>{customerFullData.referralCode || 'No referral code'}</Text></View>
      </View>

      <View className='p-[10px] border-b-[5px] border-primary rounded-[10px] bg-white gap-[5px]' >
        <TouchableOpacity className='p-[10px] rounded-[10px] bg-primary w-full' ><Text className='text-white font-bold text-[16px] text-center' >My Referrals</Text></TouchableOpacity>
      </View>

      {showImagePickerOptions && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showImagePickerOptions}
          onRequestClose={() => setShowImagePickerOptions(false)}
        >
          <View className="flex-1 justify-center items-center bg-[#00000080]">
            <View className="bg-white rounded-lg p-5 w-80">
              <Text className="text-lg font-bold text-center mb-4">
                Choose Profile Picture
              </Text>

              <TouchableOpacity
                onPress={() => handleImagePick('camera')}
                className="bg-primary py-3 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-semibold">
                  Take Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleImagePick('gallery')}
                className="bg-primary py-3 rounded-lg mb-3"
              >
                <Text className="text-white text-center font-semibold">
                  Choose from Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowImagePickerOptions(false)}
                className="bg-gray-500 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {customerImagePreview && (
        <Modal animationType='slide' transparent={true} visible={true} >
          <View className='flex-1 justify-center items-center bg-[#00000080]' >
            <View className='bg-white rounded-[10px] p-[10px] w-[90%] gap-[5px] items-center justify-center' >
              <Image resizeMode='stretch ' style={{ height: 300, width: 300 }} source={customerImagePreview} />
              <View className='flex-row gap-[10px] w-full' >
                <TouchableOpacity onPress={() => handleSaveNewCustomerImage()} className='p-[10px] rounded-[10px] flex-1 bg-primary'><Text className='text-white font-bold text-center' >Save</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => {setCustomerImagePreview(null); setCustomerImage(null); setShowImagePickerOptions(false);}} className='p-[10px] rounded-[10px] flex-1 bg-primaryRed'><Text className='text-white font-bold text-center' >Cancel</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

export default Profile