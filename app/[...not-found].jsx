import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function NotFound() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-center items-center bg-gray-100 p-6">
      <Image
        source={require('../assets/images/404Image.png')} // Replace with your 404 image or use a placeholder
        className="w-40 h-40 mb-6"
        resizeMode="contain"
      />
      <Text className="text-3xl font-bold text-gray-800 mb-4">Page Not Found</Text>
      <Text className="text-base text-gray-600 text-center mb-8">
        Oops! The page you're looking for doesn't exist. Let's get you back on track.
      </Text>
      <TouchableOpacity
        className="bg-primary py-3 px-6 rounded-lg"
        onPress={() => router.replace('/index')}
      >
        <Text className="text-white font-semibold text-base">Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}