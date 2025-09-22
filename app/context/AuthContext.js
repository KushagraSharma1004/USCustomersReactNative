import React, { createContext, useState, useEffect, useContext } from 'react';
import { collection, doc, getDocs, query, where, getDoc, limit, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '@/firebase';
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'f3a1d4c7e9b02f4a78e35d9c1406afe3b2c67d8901e2f4a59b3c8e7d6f2a9b0c';

function encryptData(data) {
  const encrypted = CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
  return encodeURIComponent(encrypted); // URL safe
}

function decryptData(data) {
  try {
    const decoded = decodeURIComponent(data); // reverse URL encoding
    const bytes = CryptoJS.AES.decrypt(decoded, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('Decryption error:', e);
    return null;
  }
}

export const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const router = useRouter();
  const [customerFullData, setCustomerFullData] = useState(null);
  const [customerMobileNumber, setCustomerMobileNumber] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [customerAddress, setCustomerAddress] = useState(null); // Store a single address or null
  const [categoriesThoseHaveVendor, setCategoriesThoseHaveVendor] = useState([])
  const [allVendors, setAllVendors] = useState([])
  const [allOrders, setAllOrders] = useState(null)
  const [myVendors, setMyVendors] = useState(null)
  // Restore auth state from localStorage on mount

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const encryptedMobile = localStorage.getItem('customerMobileNumber') || '';
      const encryptedPassword = localStorage.getItem('customerPassword') || '';
      const storedMobileNumber = decryptData(encryptedMobile);
      const storedPassword = decryptData(encryptedPassword);
      if (storedMobileNumber.length === 10 && storedPassword.length > 0) {
        setCustomerMobileNumber(storedMobileNumber);
        setCustomerPassword(storedPassword);
      }
    }
  }, []);

  // Fetch customer data when mobile number changes
  const fetchCustomerData = async () => {
    try {
      if (customerMobileNumber.length !== 10) {
        setCustomerFullData(null);
        setCustomerPassword('');
        setCustomerAddress(null);
        return;
      }
      const customerRef = doc(db, 'customers', customerMobileNumber);
      const customerDocSnap = await getDoc(customerRef);

      if (customerDocSnap.exists()) {
        const customerData = { ...customerDocSnap.data(), id: customerDocSnap.id };
        setCustomerFullData(customerData);

        // If password in DB differs, sync it
        if (customerPassword !== customerData.customerPassword) {
          setCustomerPassword(customerData.customerPassword);
        }
      } else {
        setCustomerFullData(null);
        setCustomerPassword('');
        setCustomerAddress(null);
        console.log('No such customer document exists!');
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setCustomerFullData(null);
      setCustomerPassword('');
      setCustomerAddress(null);
    }
  };

  // Fetch enabled customer address when mobile number changes
  const fetchCustomerAddress = async () => {
    try {
      if (customerMobileNumber.length !== 10) {
        setCustomerAddress(null);
        return;
      }
      const customerAddressRef = collection(db, 'customers', customerMobileNumber, 'savedAddresses');
      const q = query(customerAddressRef, where('isEnabled', '==', true));
      const querySnapshot = await getDocs(q);

      const enabledAddresses = [];
      querySnapshot.forEach((doc) => {
        enabledAddresses.push({ id: doc.id, ...doc.data() });
      });

      // Set first enabled address or null
      setCustomerAddress(enabledAddresses.length > 0 ? enabledAddresses[0] : null);
    } catch (error) {
      console.error('Error fetching enabled addresses:', error);
      setCustomerAddress(null);
    }
  };

  const fetchAllCategoriesThoseHaveVendor = async () => {
    try {
      // Fetch all vendors (users)
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      const vendorCategoriesSet = new Set();

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.category) {
          vendorCategoriesSet.add(data.category);
        }
      });

      // Fetch all categories
      const categoriesRef = collection(db, 'categories');
      const categoriesSnapshot = await getDocs(categoriesRef);
      const categoriesWithVendors = [];

      categoriesSnapshot.forEach((doc) => {
        const categoryData = { id: doc.data().categoryName, ...doc.data() };
        if (vendorCategoriesSet.has(doc.data().categoryName)) {
          categoriesWithVendors.push(categoryData);
        }
      });

      setCategoriesThoseHaveVendor(categoriesWithVendors);
    } catch (error) {
      console.error('Error fetching categories with vendors:', error);
    }
  };

  const fetchAllVendors = async () => {
    try {
      const vendorRef = collection(db, 'users')
      const querySnapshot = await getDocs(vendorRef)
      const vendors = await Promise.all(
        querySnapshot.docs.map(async (doc) => {
          const vendorData = { id: doc.id, ...doc.data() }

          // Check if vendor has products
          let vendorHasProducts = true
          const vendorProductsRef = collection(db, 'users', vendorData.vendorMobileNumber, 'list')
          const vendorProductsDocSnap = await getDocs(vendorProductsRef)
          if (vendorProductsDocSnap.empty) {
            vendorHasProducts = false
          }

          // Fetch first saved address of vendor
          const addressesRef = collection(db, 'users', vendorData.vendorMobileNumber, 'savedAddresses')
          const addressesQuery = query(addressesRef, limit(1))
          const addressesSnapshot = await getDocs(addressesQuery)
          let firstAddress = null
          if (!addressesSnapshot.empty) {
            const addressDoc = addressesSnapshot.docs[0]
            firstAddress = { id: addressDoc.id, ...addressDoc.data() }
          }

          // Fetch ratings for this vendor
          const ratingsRef = collection(db, 'ratings')
          const ratingsQuery = query(ratingsRef, where('vendorId', '==', vendorData.vendorMobileNumber))
          const ratingsSnapshot = await getDocs(ratingsQuery)
          let totalRating = 0
          let ratingCount = 0
          ratingsSnapshot.forEach((ratingDoc) => {
            const ratingValue = ratingDoc.data().rating
            if (typeof ratingValue === 'number') {
              totalRating += ratingValue
              ratingCount++
            }
          })
          const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0

          vendorData.isVendorActive = vendorData.balance > 12 && vendorHasProducts
          vendorData.vendorAddress = firstAddress
          vendorData.averageRating = averageRating
          vendorData.ratingCount = ratingCount

          return vendorData
        })
      )
      setAllVendors(vendors)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchAllOrders = () => {
    try {
      const customerOrdersRef = collection(db, 'customers', customerMobileNumber, 'myOrders');
      const unsubscribe = onSnapshot(customerOrdersRef, (querySnapshot) => {
        const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllOrders(orders);
      });
      return unsubscribe; // return unsubscribe for cleanup
    } catch (error) {
      console.log('Error fetching Orders: ', error);
    }
  };

  const fetchMyVendors = async () => {
    try {
      const myVendorRef = collection(db, 'customers', customerMobileNumber, 'vendors')
      const myVendorSnap = await getDocs(myVendorRef)
      const myVendors = myVendorSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setMyVendors(myVendors)
    } catch (error) {
      console.log('Error fetching my vendors: ', error)
    }
  }

  const logout = () => {
    setCustomerMobileNumber('');
    setCustomerPassword('');
    setCustomerFullData(null);
    setCustomerAddress(null);
    setAllOrders(null)
    localStorage.removeItem('customerMobileNumber');
    localStorage.removeItem('customerPassword');
    router.replace('/');
  };

  // When customerMobileNumber changes, fetch data and address
  useEffect(() => {
    if (customerMobileNumber.length !== 10) return;
    fetchCustomerData();
    fetchCustomerAddress();
    fetchAllCategoriesThoseHaveVendor();
    fetchAllVendors()
    fetchMyVendors()
    // fetchAllOrders()
    const unsubscribeOrders = fetchAllOrders();
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [customerMobileNumber]);

  // When mobile number or password changes, sync localStorage and refetch data
  useEffect(() => {
    if (customerMobileNumber.length !== 10 || customerPassword.length === 0) return;
    localStorage.setItem('customerMobileNumber', encryptData(customerMobileNumber));
    localStorage.setItem('customerPassword', encryptData(customerPassword));
    fetchCustomerData();
    fetchCustomerAddress();
    fetchAllCategoriesThoseHaveVendor();
    fetchAllVendors();
    fetchMyVendors()
    // fetchAllOrders()
    const unsubscribeOrders = fetchAllOrders();
    return () => {
      if (unsubscribeOrders) unsubscribeOrders();
    };
  }, [customerMobileNumber, customerPassword]);

  const contextValue = {
    customerMobileNumber,
    setCustomerMobileNumber,
    customerPassword,
    setCustomerPassword,
    customerFullData,
    setCustomerFullData,
    customerAddress,
    setCustomerAddress,
    categoriesThoseHaveVendor,
    setCategoriesThoseHaveVendor,
    allVendors,
    setAllVendors,
    logout,
    allOrders,
    setAllOrders,
    fetchAllOrders,
    myVendors,
    setMyVendors,
    fetchMyVendors
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
