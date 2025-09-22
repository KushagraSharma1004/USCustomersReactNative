import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Animated, Easing, StyleSheet } from 'react-native';

const TextInputComponent = ({
    placeholder,
    keyboardType,
    className,
    maxLength,
    editable,
    value,
    onChangeText,
    secureTextEntry,
    labelColor = '#ccc',
    focusedLabelColor = '#2874F0',
    borderColor = '#ccc',
    focusedBorderColor = '#2874F0',
    inputTextColor = '#333',
    fontSize,
    width = '100%',
    hasError = false
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const animatedIsFocused = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(animatedIsFocused, {
            toValue: (isFocused || (value && value.length > 0)) ? 1 : 0,
            duration: 200,
            easing: Easing.ease,
            useNativeDriver: false,
        }).start();
    }, [isFocused, value, animatedIsFocused]);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    const verticalPadding = 13;
    const topPadding = 15;
    const bottomPadding = 10;

    // Interpolate label position (vertical movement)
    const labelStyle = {
        top: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [verticalPadding, -8], // Adjusted vertical movement
        }),
        fontSize: animatedIsFocused.interpolate({
            inputRange: [0, 1],
            outputRange: [fontSize !== undefined ? fontSize : 15, 13],
        }),
        color: (isFocused || (value && value.length > 0)) ? focusedLabelColor : labelColor,
    };

    // Style for the input container border
    const inputContainerStyle = {
        borderColor: hasError ? '#F44336' : isFocused ? focusedBorderColor : borderColor,
        borderWidth: hasError ? 2 : isFocused ? 2 : 1,
    };

    // Use a function to create dynamic styles based on props
    const styles = StyleSheet.create({
        container: {
            width: width,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
            backgroundColor: (value && value !== '') || isFocused ? '#e8f0fe' : 'white',
        },
        animatedPlaceholder: {
            position: 'absolute',
            left: 12,
            backgroundColor: (value && value !== '') || isFocused ? '#e8f0fe' : 'white',
            paddingHorizontal: 4,
            borderRadius: 5,
        },
        textInput: {
            fontSize: 15,
            paddingVertical: 0,
            height: 20,
            minHeight: undefined,
            textAlignVertical: 'center',
            color: inputTextColor,
            outlineWidth: 0,
            outlineColor: 'transparent',
            outlineStyle: 'none',
        },
    });

    return (
        <View style={[styles.container, inputContainerStyle]} className={className}>
            <Animated.Text
                style={[styles.animatedPlaceholder, labelStyle]}
                pointerEvents="none"
            >
                {placeholder}
            </Animated.Text>
            <TextInput
                // Set placeholder to empty string as we are using an Animated.Text for the floating label
                placeholder=""
                style={[styles.textInput, { color: inputTextColor }]}
                keyboardType={keyboardType || 'default'}
                maxLength={maxLength || 99}
                editable={editable !== undefined ? editable : true}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry !== undefined ? secureTextEntry : false}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        </View>
    );
};

export default TextInputComponent;