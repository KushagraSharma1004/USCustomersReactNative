// /**
//  * Check if a point is inside a polygon using ray casting algorithm
//  * @param {Object} point - {latitude: number, longitude: number}
//  * @param {Array} polygon - Array of {latitude: number, longitude: number}
//  * @returns {boolean}
//  */
// export const isPointInPolygon = (point, polygon) => {
//   const { latitude: x, longitude: y } = point;
//   let inside = false;

//   for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
//     const { latitude: xi, longitude: yi } = polygon[i];
//     const { latitude: xj, longitude: yj } = polygon[j];

//     if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
//       inside = !inside;
//     }
//   }

//   return inside;
// };

// /**
//  * Check if a point is inside any of the service area polygons
//  * @param {Object} customerLocation - {latitude: number, longitude: number}
//  * @param {Array} serviceAreaPolygons - Array of polygon arrays
//  * @returns {boolean}
//  */
// export const isInServiceArea = (customerLocation, serviceAreaPolygons) => {
//   if (!customerLocation || !serviceAreaPolygons || serviceAreaPolygons.length === 0) {
//     return false;
//   }

//   // Check if the customer location is inside any of the polygons
//   return serviceAreaPolygons.some(polygon => {
//     if (!Array.isArray(polygon) || polygon.length < 3) {
//       return false;
//     }
//     return isPointInPolygon(customerLocation, polygon);
//   });
// };

// /**
//  * Get customer's current location
//  * @returns {Promise<Object>} - {latitude: number, longitude: number}
//  */
// export const getCurrentLocation = () => {
//   return new Promise((resolve, reject) => {
//     if (!navigator.geolocation) {
//       reject(new Error('Geolocation is not supported by this browser'));
//       return;
//     }

//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         resolve({
//           latitude: position.coords.latitude,
//           longitude: position.coords.longitude
//         });
//       },
//       (error) => {
//         reject(error);
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 10000,
//         maximumAge: 300000 // 5 minutes
//       }
//     );
//   });
// };

// /**
//  * Calculate distance (in km) between two lat/lng coordinates using Haversine formula
//  */
// export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
//   const toRad = (value) => (value * Math.PI) / 180;
//   const R = 6371; // Earth's radius in km
//   const dLat = toRad(lat2 - lat1);
//   const dLon = toRad(lon2 - lon1);
//   const a =
//     Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//     Math.sin(dLon / 2) * Math.sin(dLon / 2);

//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c; // Distance in km
// };

// utils/locationUtils.js

/**
 * Check if a point is inside a polygon using ray casting algorithm
 * @param {Object} point - {latitude: number, longitude: number}
 * @param {Array} polygon - Array of {latitude: number, longitude: number}
 * @returns {boolean}
 */
export const isPointInPolygon = (point, polygon) => {
  const { latitude: x, longitude: y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { latitude: xi, longitude: yi } = polygon[i];
    const { latitude: xj, longitude: yj } = polygon[j];

    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Check if a point is inside any of the service area polygons
 * @param {Object} customerLocation - {latitude: number, longitude: number}
 * @param {Array} serviceAreaPolygons - Array of polygon arrays
 * @returns {boolean}
 */
export const isInServiceArea = (customerLocation, serviceAreaPolygons) => {
  if (!customerLocation || !serviceAreaPolygons || serviceAreaPolygons.length === 0) {
    return false;
  }

  // Check if the customer location is inside any of the polygons
  return serviceAreaPolygons.some(polygon => {
    if (!Array.isArray(polygon) || polygon.length < 3) {
      return false;
    }
    return isPointInPolygon(customerLocation, polygon);
  });
};

/**
 * Get customer's current location
 * @returns {Promise<Object>} - {latitude: number, longitude: number}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};