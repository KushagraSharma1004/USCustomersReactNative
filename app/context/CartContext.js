// context/CartContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { decryptData } from "./hashing";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { customerMobileNumber } = useAuth();
  const [cartItems, setCartItems] = useState({});
  const [cartCount, setCartCount] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  const fetchCartItems = async () => {
    const vendorMobileNumber = localStorage.getItem("vendor")
      ? decryptData(localStorage.getItem("vendor"))
      : null;
  
    if (!customerMobileNumber || !vendorMobileNumber) return;
  
    try {
      const cartRef = collection(
        db,
        "customers",
        customerMobileNumber,
        "cart",
        vendorMobileNumber,
        "items"
      );
      const cartSnap = await getDocs(cartRef);
  
      const items = {};
      let totalQty = 0;
      let totalAmount = 0; // Add this line
      
      cartSnap.forEach((doc) => {
        items[doc.id] = doc.data();
        totalQty += doc.data().quantity || 0;
        totalAmount += (doc.data().price || 0) * (doc.data().quantity || 0); // Add this line
      });
  
      setCartItems(items);
      setCartCount(totalQty);
      setCartTotal(totalAmount); // Add this line
    } catch (err) {
      console.error("Error fetching cart items:", err);
    }
  };

  const subscribeToCartItems = () => {
    const vendorMobileNumber = localStorage.getItem("vendor")
      ? decryptData(localStorage.getItem("vendor"))
      : null;
  
    if (!customerMobileNumber || !vendorMobileNumber) return () => {};
  
    const cartRef = collection(
      db,
      "customers",
      customerMobileNumber,
      "cart",
      vendorMobileNumber,
      "items"
    );
  
    const unsubscribe = onSnapshot(
      cartRef,
      (cartSnap) => {
        const items = {};
        let totalQty = 0;
        let totalAmount = 0;
  
        cartSnap.forEach((doc) => {
          items[doc.id] = doc.data();
          totalQty += doc.data().quantity || 0;
          totalAmount += (doc.data().price || 0) * (doc.data().quantity || 0);
        });
  
        setCartItems(items);
        setCartCount(totalQty);
        setCartTotal(totalAmount);
      },
      (error) => {
        console.error("Error in cart realtime listener:", error);
      }
    );
  
    return unsubscribe; // caller should cleanup
  };

  useEffect(() => {
    if (!customerMobileNumber) return;
  
    // Call fetchCartItems once initially
    fetchCartItems();
  
    // Setup live subscription for real-time updates
    const unsubscribe = subscribeToCartItems();
  
    // Custom event listener for vendor changes to re-subscribe
    const handleVendorChange = () => {
      fetchCartItems();
    };
    document.addEventListener("vendorChanged", handleVendorChange);
  
    return () => {
      // Clean up listener on unmount
      unsubscribe && unsubscribe();
      document.removeEventListener("vendorChanged", handleVendorChange);
    };
  }, [customerMobileNumber]);
  
  return (
    <CartContext.Provider value={{ cartItems, cartCount, cartTotal, fetchCartItems }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};