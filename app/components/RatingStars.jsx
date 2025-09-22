// RatingStars.jsx

import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { FullStarSVG, EmptyStarSVG, PartialStarSVG } from './StarSVGs';

const getPartialPercentage = (rating, i) => {
  // Returns fill for possible half/partial star, e.g., 4.3 -> 30% for star 5
  return i === Math.ceil(rating) && rating % 1 > 0
    ? (rating % 1) * 100
    : 0;
};

export function RatingStars({ rating, setRating, size = 30 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          activeOpacity={0.7}
        >
          {rating >= i
            ? <FullStarSVG size={size} />
            : rating >= i - 0.5
              ? <PartialStarSVG size={size} fillPercentage={getPartialPercentage(rating, i)} />
              : <EmptyStarSVG size={size} />
          }
        </TouchableOpacity>
      ))}
    </View>
  );
}
