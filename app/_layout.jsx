import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthProvider } from "./context/AuthContext";
import "./global.css"
import { CartProvider } from "./context/CartContext";
import { AddressSheetProvider } from "./context/AddressSheetContext";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import AddressSheet from "./components/AddressSheet";
import { useCallback, useMemo, useRef } from "react";

export default function RootLayout() {
  const addressSheetRef = useRef(null)
  const snapPointsForAddressSheet = useMemo(() => [1, '90%'], [])

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
    addressSheetRef.current?.snapToIndex(1)
  }

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
            <Stack>
              <Stack.Screen name="Login" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="SignUp" options={{ headerShown: false }} />
              <Stack.Screen name="ForgotPassword" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="Profile" options={{ headerShown: false }} />
              <Stack.Screen name="MyReferrals" options={{ headerShown: false }} />
              <Stack.Screen name="Settings" options={{ headerShown: false }} />
            </Stack>
            <BottomSheet
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
            </BottomSheet>
          </AddressSheetProvider>
        </CartProvider>
      </AuthProvider>
    </SafeAreaView>
  )
}
