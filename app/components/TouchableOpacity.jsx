// app/components/TouchableOpacity.jsx

import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native'; // Import View and Text

const TouchableOpacityComponent = ({className, onPress, innerMaterial, style, activeOpacity, disabled}) => {
   return (
      <TouchableOpacity
        style={style}
        className={className !== undefined ? className : 'bg-primary w-full rounded-[10px] p-3 items-center justify-center'}
        onPress={onPress}
        activeOpacity={activeOpacity !== undefined ? activeOpacity : 1}
        disabled={disabled !== undefined ? disabled : false}
      >
        {/*
          This is the crucial change:
          If innerMaterial is a string, wrap it in <Text>.
          If it's already a React element (like <Text> or <View>), render it directly.
        */}
        {typeof innerMaterial === 'string' ? <Text>{innerMaterial}</Text> : innerMaterial}
      </TouchableOpacity>
   );
};

export default TouchableOpacityComponent;