import { View, Text, Modal, TouchableOpacity, Image } from 'react-native'
import React from 'react'

const ConfirmationModal = ({ setIsConfirmModalVisible, confirmationMessage, onConfirm, confirmText = 'YES', cancelText = 'Cancel' }) => {
    return (
        <Modal className='' animationType='slide' visible={true} transparent={true} >
            <View className='h-full w-full bg-[#00000080] items-center justify-center' >
                <View className='p-[20px] bg-white w-[90%] rounded-[10px] items-center justify-center gap-[30px] self-center' >
                    <Image style={{ height: 70, width: 70 }} source={require('../../assets/images/warning.png')} />
                    <Text className='text-[15px] text-primaryRed text-center' >{confirmationMessage}</Text>
                    <View className='flex-row items-center justify-between w-full gap-[10px]' >
                        <TouchableOpacity className='p-[10px] bg-primary rounded-[10px] flex-1' ><Text className='text-white font-bold text-center' onPress={onConfirm}>{confirmText}</Text></TouchableOpacity>
                        <TouchableOpacity className='p-[10px] bg-primaryRed rounded-[10px] flex-1' ><Text className='text-white font-bold text-center' onPress={() => setIsConfirmModalVisible(false)} >{cancelText}</Text></TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

export default ConfirmationModal