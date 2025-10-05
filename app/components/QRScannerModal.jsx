import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScannerModal({ visible, onScanSuccess, onClose }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    if (!visible) return;

    const requestCameraPermission = async () => {
      try {
        setLoading(true);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasPermission(true);
        stream.getTracks().forEach((track) => track.stop());
        setLoading(false);
      } catch (error) {
        console.error("Camera permission denied:", error);
        setHasPermission(false);
        setLoading(false);
      }
    };

    requestCameraPermission();
  }, [visible]);

  useEffect(() => {
    if (!visible || !hasPermission) return;
    const htmlScanner = new Html5Qrcode("qr-reader");
    setScanner(htmlScanner);

    htmlScanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 280 } },
        (decodedText) => {
          onScanSuccess?.(decodedText);
          htmlScanner.stop().then(() => htmlScanner.clear());
        },
        () => {} // ignore frame errors
      )
      .catch((err) => console.error("Scanner start error:", err));

    return () => {
      htmlScanner.stop().then(() => htmlScanner.clear());
    };
  }, [hasPermission, visible]);

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View
        className="flex-1 items-center justify-center bg-[rgba(0,0,0,0.7)]"
      >
        <View className="bg-white rounded-[20px] p-[20px] w-[90%] items-center">
          <Text className="font-bold text-[22px] text-[#2874F0] mb-[20px]">
            Scan QR Code
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color="#2874F0" />
          ) : hasPermission === false ? (
            <View className="items-center">
              <Text className="text-gray-600 text-[16px] mb-4">
                Camera permission denied.
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="bg-[#2874F0] px-5 py-2 rounded-[8px]"
              >
                <Text className="text-white font-medium">Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            hasPermission && (
              <>
                <View
                  style={{
                    position: "relative",
                    width: 280,
                    height: 280,
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 2,
                    borderColor: "#2874F0",
                    boxShadow: "0 0 10px rgba(40, 116, 240, 0.3)",
                  }}
                >
                  {/* Camera feed */}
                  <View id="qr-reader" style={{ width: "100%", height: "100%" }}></View>

                  {/* Blue laser line */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: 3,
                      background: "linear-gradient(to right, transparent, #2874F0, transparent)",
                      animation: "laserMove 2s ease-in-out infinite",
                      boxShadow: "0 0 12px rgba(40, 116, 240, 0.5)",
                    }}
                  />
                </View>

                <Text className="mt-[20px] text-gray-600">
                  Align the QR inside the box
                </Text>

                <TouchableOpacity
                  onPress={onClose}
                  className="mt-[20px] px-6 py-2 bg-[#2874F0] rounded-[8px]"
                >
                  <Text className="text-white font-medium">Close</Text>
                </TouchableOpacity>
              </>
            )
          )}
        </View>
      </View>

      {/* CSS animation */}
      <style>
        {`
          @keyframes laserMove {
            0% { top: 0; }
            50% { top: 95%; }
            100% { top: 0; }
          }
        `}
      </style>
    </Modal>
  );
}
