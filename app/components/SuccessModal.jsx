import { View, Text, Modal, Image } from 'react-native'
import React, { useEffect } from 'react'

const SuccessModal = ({ setIsSuccessModalVisible, successMessage, duration = 2000 }) => {
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSuccessModalVisible(false)
    }, Number(duration)) // 3.5 seconds delay

    return () => clearTimeout(timer) // Cleanup on unmount or re-render
  }, [])

  return (
    <Modal animationType='slide' visible={true} transparent={true} >
      <View className='h-full w-full bg-[#00000080] items-center justify-center' >
        <View className='p-[20px] bg-white w-[96%] rounded-[10px] items-center justify-center gap-[30px]' >
          <Image style={{ height: 80, width: 80 }} source={require('../../assets/images/success.png')} />
          <Text className='font-bold text-[18px] text-primaryGreen text-center' >{successMessage}</Text>
        </View>
      </View>
    </Modal>
  )
}

export default SuccessModal
