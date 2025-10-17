import { View, Text, FlatList } from 'react-native'
import React, { useEffect, useState } from 'react'
import ToggleButton from './components/ToggleButton'
import { useAuth } from './context/AuthContext'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { decryptData } from './context/hashing'

const Settings = () => {
  const { customerFullData, customerMobileNumber, setCustomerFullData } = useAuth()
  const [isVendorAllowed, setIsVendorAllowed] = useState(false)
  const [isAnyVendorSelected, setIsAnyVendorSelected] = useState(false)
  const [selectedVendorFullData, setSelectedVendorFullData] = useState(null)

  const fetchSelectedVendorFullData = async () => {
    try {
      const selectedVendor = decryptData(localStorage.getItem('vendor'))
      if (!selectedVendor || selectedVendor.length !== 10) return

      const selectedVendorRef = doc(db, 'users', selectedVendor)
      const selectedVendorDoc = await getDoc(selectedVendorRef)
      if (selectedVendorDoc.exists()) {
        setSelectedVendorFullData(selectedVendorDoc.data())
      }
    } catch (error) {
      console.error('Error fetching selected vendor data: ', error)
    }
  }

  useEffect(() => {
    const selectedVendor = decryptData(localStorage.getItem('vendor')) || ''
    setIsAnyVendorSelected(selectedVendor.length === 10)
  }, [])

  useEffect(() => {
    if (isAnyVendorSelected) {
      fetchSelectedVendorFullData()
    }
  }, [isAnyVendorSelected])

  useEffect(() => {
    if (customerFullData?.allowedVendors && isAnyVendorSelected) {
      const selectedVendor = decryptData(localStorage.getItem('vendor')) || ''
      const allowedVendor = customerFullData.allowedVendors.find(
        (vendor) => vendor?.vendorMobileNumber === selectedVendor
      )
      setIsVendorAllowed(!!allowedVendor)
    }
  }, [customerFullData, isAnyVendorSelected])

  const handleChangeIsVendorAllowed = async () => {
    try {
      const selectedVendor = decryptData(localStorage.getItem('vendor')) || ''
      const customerRef = doc(db, 'customers', customerMobileNumber)

      if (isVendorAllowed) {
        // Remove vendor from allowed list
        const updatedAllowedVendors = customerFullData?.allowedVendors?.filter(
          (vendor) => vendor?.vendorMobileNumber !== selectedVendor
        ) || []

        await updateDoc(customerRef, { allowedVendors: updatedAllowedVendors })
        setCustomerFullData({
          ...customerFullData,
          allowedVendors: updatedAllowedVendors
        })
        setIsVendorAllowed(false)
      } else {
        // Add vendor to allowed list
        const newAllowedVendor = {
          vendorMobileNumber: selectedVendor,
          businessName: selectedVendorFullData?.businessName || '',
          addedDate: new Date().toISOString()
        }
        const updatedAllowedVendors = [
          ...(customerFullData?.allowedVendors || []),
          newAllowedVendor
        ]

        await updateDoc(customerRef, { allowedVendors: updatedAllowedVendors })
        setCustomerFullData({
          ...customerFullData,
          allowedVendors: updatedAllowedVendors
        })
        setIsVendorAllowed(true)
      }
    } catch (error) {
      console.error('Error changing vendor allowance:', error)
    }
  }

  const handleChangeIsVendorAllowedFromAllowedVendorsList = async (vendorMobileNumber) => {
    try {
      const customerRef = doc(db, 'customers', customerMobileNumber)

      if (customerFullData?.allowedVendors?.some(v => v.vendorMobileNumber === vendorMobileNumber)) {
        // Remove vendor from allowed list
        const updatedAllowedVendors = customerFullData.allowedVendors.filter(
          (vendor) => vendor.vendorMobileNumber !== vendorMobileNumber
        )

        await updateDoc(customerRef, { allowedVendors: updatedAllowedVendors })
        setCustomerFullData({
          ...customerFullData,
          allowedVendors: updatedAllowedVendors
        })
      } else {
        // Add vendor to allowed list
        const vendorRef = doc(db, 'users', vendorMobileNumber)
        const vendorDoc = await getDoc(vendorRef)

        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data()
          const newAllowedVendor = {
            vendorMobileNumber: vendorMobileNumber,
            businessName: vendorData?.businessName || '',
            addedDate: new Date().toISOString()
          }
          const updatedAllowedVendors = [
            ...(customerFullData?.allowedVendors || []),
            newAllowedVendor
          ]

          await updateDoc(customerRef, { allowedVendors: updatedAllowedVendors })
          setCustomerFullData({
            ...customerFullData,
            allowedVendors: updatedAllowedVendors
          })
        }
      }
    } catch (error) {
      console.error('Error changing vendor allowance from list:', error)
    }
  }

  return (
    <View className='flex-1'>
      <View className='p-[10px] w-full border-b-[3px] border-primary rounded-[10px]'>
        <Text className='text-[16px] font-bold text-center'>Settings</Text>
      </View>
      <View className='flex-1 p-[10px]'>
        {isAnyVendorSelected && selectedVendorFullData && (
          <View className='flex-row items-center justify-between'>
            <Text className='flex-1 mr-2'>
              Allow "{selectedVendorFullData.businessName}" to login your account:
            </Text>
            <ToggleButton
              active="ON"
              inactiveText="OFF"
              value={isVendorAllowed}
              onPress={handleChangeIsVendorAllowed}
              textFontSize={12}
            />
          </View>
        )}
        {!isAnyVendorSelected && (
          <FlatList
            data={customerFullData?.allowedVendors}
            renderItem={({ item, index }) => {
              return (
                <View className='flex-row items-center justify-between mb-[5px]'>
                  <Text className='flex-1 mr-2'>
                    Allow "{item.businessName}" to login your account:
                  </Text>
                  <ToggleButton
                    active="ON"
                    inactiveText="OFF"
                    value={true} // Always true since it's in allowed list
                    onPress={() => handleChangeIsVendorAllowedFromAllowedVendorsList(item.vendorMobileNumber)}
                    textFontSize={12}
                  />
                </View>
              )
            }}
          />
        )}
      </View>
    </View>
  )
}

export default Settings