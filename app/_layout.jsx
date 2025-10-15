import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./global.css"
import { CartProvider } from "./context/CartContext";
import { AddressSheetProvider } from "./context/AddressSheetContext";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import AddressSheet from "./components/AddressSheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function RootLayout() {
  const addressSheetRef = useRef(null)
  const snapPointsForAddressSheet = useMemo(() => [1, '90%'], [])
  const [isAddressSheetVisible, setIsAddressSheetVisible] = useState(false);

  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  )

  const openAddressSheet = () => {
    setIsAddressSheetVisible(true);
    setTimeout(() => {
      addressSheetRef.current?.snapToIndex(1);
    }, 50); // small timeout to ensure sheet ref is ready
  };

  const closeAddressSheet = () => {
    addressSheetRef.current?.close();
    setTimeout(() => setIsAddressSheetVisible(false), 300); // wait for close animation
  };

  // const ProtectedRoute = ({ children }) => {
  //   const { customerMobileNumber } = useAuth();
  //   const router = useRouter();
  //   const pathname = usePathname();
  //   const [isMounted, setIsMounted] = useState(false);
  
  //   useEffect(() => {
  //     setIsMounted(true); // Mark component as mounted
  //   }, []);
  
  //   useEffect(() => {
  //     if (!isMounted) return; // Skip navigation until mounted
  
  //     const publicRoutes = ['/Login', '/index', '/SignUp', '/[...not-found]'];
  //     if (!publicRoutes.includes(pathname)) {
  //       if (!customerMobileNumber || customerMobileNumber.length !== 10) {
  //         router.replace('/Login');
  //       }
  //     }
  //   }, [customerMobileNumber, pathname, router, isMounted]);
  
  //   return children;
  // };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar
        animated={true}
        backgroundColor="#2874F0"
        barStyle="light-content"
      />
      <AuthProvider>
        <CartProvider>
          <AddressSheetProvider openAddressSheet={openAddressSheet}>
            {/* <ProtectedRoute> */}
              <Stack>
                <Stack.Screen name="Login" options={{ headerShown: false }} />
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="SignUp" options={{ headerShown: false }} />
                <Stack.Screen name="ForgotPassword" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="Profile" options={{ headerShown: false }} />
                <Stack.Screen name="MyReferrals" options={{ headerShown: false }} />
                <Stack.Screen name="Settings" options={{ headerShown: false }} />
                <Stack.Screen name="[...not-found]" options={{ headerShown: false }} />
              </Stack>
            {/* </ProtectedRoute> */}
            {/* <BottomSheet
              ref={addressSheetRef}
              snapPoints={snapPointsForAddressSheet}
              enableDynamicSizing={false}
              enablePanDownToClose
              backgroundStyle={{ borderTopWidth: 5, borderTopColor: '#2874F0', backgroundColor: '#2874F0' }}
              index={-1}
              backdropComponent={renderBackdrop}
              handleComponent={() => null}
            >
              <AddressSheet onClose={() => addressSheetRef.current?.close()} />
            </BottomSheet> */}
            {isAddressSheetVisible && (
              <BottomSheet
                ref={addressSheetRef}
                snapPoints={snapPointsForAddressSheet}
                enableDynamicSizing={false}
                enablePanDownToClose
                backgroundStyle={{
                  borderTopWidth: 5,
                  borderTopColor: "#2874F0",
                  backgroundColor: "#2874F0",
                }}
                index={-1} // start closed
                backdropComponent={renderBackdrop}
                handleComponent={() => null}
                onClose={closeAddressSheet}
              >
                <AddressSheet onClose={closeAddressSheet} />
              </BottomSheet>
            )}
          </AddressSheetProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaView>
  )
}
