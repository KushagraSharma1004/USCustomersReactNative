import { View, Text, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { decryptData, encryptData } from './context/hashing';

const Index = () => {
  const { setCustomerFullData, setCustomerMobileNumber, setCustomerPassword } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const params = useLocalSearchParams();
  const oldMethod_FromQR = params.fromQR === 'true' ? true : false
  const oldMethod_VendorMobileNumberFromQR = params.vendorMobileNumberFromQR || ''
  const [isChecked, setIsChecked] = useState(false)

  useEffect(() => {
    // Mark router as ready after initial mount
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (oldMethod_FromQR && oldMethod_VendorMobileNumberFromQR.length === 10) {
      router.replace(`/Vendors/?vendor=${encodeURIComponent(encryptData(oldMethod_VendorMobileNumberFromQR))}&fromQR=true`)
      return
    }
    setIsChecked(true)
  }, [oldMethod_FromQR, oldMethod_VendorMobileNumberFromQR, isReady])

  useEffect(() => {
    const redirect = async () => {
      if (!isReady) return; // Only redirect when router is ready
      if (!isChecked) return
      try {
        // if(oldMethod_FromQR && oldMethod_VendorMobileNumberFromQR.length === 10){
        //   router.replace(`/Vendors/?vendor=${encodeURIComponent(oldMethod_VendorMobileNumberFromQR)}&fromQR=true`)
        //   return
        // }
        const customerMobileNumber = typeof window !== "undefined" ? decryptData(localStorage.getItem('customerMobileNumber')) || '' : '';
        const customerPassword = typeof window !== "undefined" ? decryptData(localStorage.getItem('customerPassword')) || '' : '';

        if (customerMobileNumber.length === 10 && customerPassword.length > 0) {
          const customerRef = doc(db, 'customers', customerMobileNumber);
          const customerDocRef = await getDoc(customerRef);
          if (customerDocRef.exists()) {
            const dbPassword = customerDocRef.data().customerPassword;
            if (customerPassword === dbPassword) {
              await setCustomerFullData(customerDocRef.data());
              await setCustomerMobileNumber(customerMobileNumber);
              await setCustomerPassword(customerPassword);
              router.replace('/(tabs)/Home');
              return;
            }
          }
        }
        router.replace('/Login');
      } catch (error) {
        router.replace('/Login');
      }
    };
    redirect();
  }, [isReady, router, setCustomerFullData, setCustomerMobileNumber, setCustomerPassword, isChecked]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2874F0' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={{ color: 'white', marginTop: 10 }}>Loading...</Text>
    </View>
  );
};

export default Index;
