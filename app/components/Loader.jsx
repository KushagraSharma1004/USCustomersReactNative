// app/components/Loader.js (Corrected `interpolate` outputRange)
import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const Loader = () => {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const gradientRotation = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });

    scale.value = withRepeat(
      withTiming(1.85, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    rotate.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );

    gradientRotation.value = withRepeat(
      withTiming(360, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    return () => {
      scale.value = 1;
      rotate.value = 0;
      opacity.value = 0;
      gradientRotation.value = 0;
    };
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => {
    // FIX HERE: Change outputRange to numbers (0, 360) instead of strings ('0deg', '360deg')
    // const interpolatedRotate = interpolate(rotate.value, [0, 360], [0, 360]);
    return {
      transform: [{ scale: scale.value }], // Add 'deg' here
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const animatedGradientBorderStyle = useAnimatedStyle(() => {
    // FIX HERE: Change outputRange to numbers (0, 360) instead of strings ('0deg', '360deg')
    const interpolatedRotate = interpolate(gradientRotation.value, [0, 360], [0, 360]);
    return {
      transform: [{ rotateZ: `${interpolatedRotate}deg` }], // Add 'deg' here
    };
  });


  return (
    <Animated.View style={[styles.overlayWrapper, animatedOverlayStyle]}>
      {/* <BlurView
        intensity={25}
        tint="dark"
        style={StyleSheet.absoluteFill}
      /> */}

      <View style={styles.loaderContent}>
        {/* <View style={styles.logoBorderContainer}> */}
          <Animated.View style={[styles.gradientBorderInner, animatedGradientBorderStyle]}>
            <LinearGradient
              colors={['white', '#2874F0', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{...StyleSheet.absoluteFillObject, borderRadius: 100,}}
            />
          </Animated.View>

          {/* <View style={styles.logoBackground}> */}
            <Animated.View style={animatedLogoStyle} >
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.logo}
              />
            </Animated.View>
          {/* </View> */}
        {/* </View> */}
      </View>
    </Animated.View>
  );
};

const LOGO_SIZE = 90;
const BORDER_THICKNESS = 6;
const LOGO_CONTAINER_SIZE = LOGO_SIZE + (BORDER_THICKNESS * 2);

const styles = StyleSheet.create({
  overlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: 'rgba(40, 116, 240, 0.2)',
  },
  loaderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 20,
    // backgroundColor: 'rgba(0, 0, 0, 0.3)',
    // shadowColor: '#00FFFF',
    // shadowOffset: { width: 0, height: 0 },
    // shadowOpacity: 0.8,
    // shadowRadius: 20,
    // elevation: 10,
  },
  logoBorderContainer: {
    width: LOGO_CONTAINER_SIZE,
    height: LOGO_CONTAINER_SIZE,
    borderRadius: LOGO_CONTAINER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  gradientBorderInner: {
    ...StyleSheet.absoluteFillObject,
  },
  logoBackground: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  logo: {
    width: LOGO_SIZE * 0.7,
    height: LOGO_SIZE * 0.7,
    resizeMode: 'contain',
    borderRadius: 50,
  },
  spinner: {
    marginTop: 10,
  },
});

export default Loader;