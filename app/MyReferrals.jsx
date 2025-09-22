import { View, Text, Image } from 'react-native'
import React from 'react'
import { FlashList } from '@shopify/flash-list';
import { useAuth } from './context/AuthContext';

const MyReferrals = () => {
    const { customerReferrals } = useAuth()
    return (
        <View className='flex-1 px-[10px] pb-[10px]' >
            <View className='rounded-b-[10px] bg-white w-full flex-row items-center justify-center p-[10px] gap-[5px]' >
                <Image style={{ height: 40, width: 40 }} source={require('../assets/images/icon.png')} />
                <Text className='font-bold text-[16px] text-primary' >My Referrals</Text>
            </View>
            <FlashList
                data={customerReferrals.sort((a, b) => b.timestamp - a.timestamp)}
                className='flex-1'
                renderItem={({ item, index }) => {
                    return (
                        <View className='w-full bg-white p-[10px] border-b-[5px] border-r-[2px] rounded-[10px] border-primary mt-[3px] flex-row justify-between items-center gap-[3px]' >
                            <Text className='h-[20px] w-[20px] items-center justify-center leading-[18px] bg-black text-white rounded-full text-center text-[10px]' >{customerReferrals.length - index}</Text>
                            <Text className='flex-1' >{item.customerName}</Text>
                            <Text className='text-[12px] text-[#ccc]' >{item.timestamp.toDate().toLocaleString()}</Text>
                        </View>
                    )
                }}
                keyExtractor={(item, index) => index.toString()}
                ListEmptyComponent={() => (
                    <View className='flex-1 justify-center items-center p-[40px]'>
                        <Text className='font-bold text-[20px] text-primaryRed' >No referrals yet.</Text>
                    </View>
                )}
            />
        </View>
    )
}

export default MyReferrals