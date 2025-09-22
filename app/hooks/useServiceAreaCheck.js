// hooks/useServiceAreaCheck.js
import { useState, useEffect, useCallback } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { isInServiceArea } from '../utils/location';
import { useAuth } from '../context/AuthContext';

export const useServiceAreaCheck = (vendorMobileNumber) => {
  const {customerMobileNumber} = useAuth()
  const [isInServiceAreaState, setIsInServiceAreaState] = useState(false);
  const [isCheckingServiceArea, setIsCheckingServiceArea] = useState(false);
  const [serviceAreaError, setServiceAreaError] = useState(null);
  const [customerLocation, setCustomerLocation] = useState(null);
  const [serviceAreaPolygons, setServiceAreaPolygons] = useState([]);
  const [hasServiceArea, setHasServiceArea] = useState(false);

  // Load vendor's service area from Firestore
  const loadVendorServiceArea = useCallback(async () => {
    if (!vendorMobileNumber) return [];

    try {
      const vendorRef = doc(db, 'users', vendorMobileNumber);
      const vendorDoc = await getDoc(vendorRef);

      if (vendorDoc.exists() && vendorDoc.data().serviceArea) {
        const serviceAreaData = vendorDoc.data().serviceArea;

        // NEW: Check if vendor has any service area defined
        const vendorHasServiceArea = Array.isArray(serviceAreaData) && serviceAreaData.length > 0;
        setHasServiceArea(vendorHasServiceArea);

        if (vendorHasServiceArea) {
          // Convert Firestore GeoPoints to regular objects
          const polygons = serviceAreaData.map(polygonObj =>
            Array.isArray(polygonObj.points)
              ? polygonObj.points.map(geoPoint => ({
                latitude: geoPoint.latitude,
                longitude: geoPoint.longitude
              }))
              : []
          );
          setServiceAreaPolygons(polygons);
          return polygons;
        }
      }

      // Vendor has no service area
      setHasServiceArea(false);
      setServiceAreaPolygons([]);
      return [];
    } catch (error) {
      console.error('Error loading vendor service area:', error);
      setServiceAreaError('Failed to load service area');
      setHasServiceArea(false); // Assume no service area on error
      return [];
    }
  }, [vendorMobileNumber]);

  // Check if customer is in service area
  const checkServiceArea = useCallback(async (forceLocationUpdate = false) => {
    setIsCheckingServiceArea(true);
    setServiceAreaError(null);

    try {
      // If vendor has no service area, automatically return true (worldwide delivery)
      if (!hasServiceArea) {
        setIsInServiceAreaState(true);
        return true;
      }

      // Get customer location if not available or force update
      let location = customerLocation;
      if (!location || forceLocationUpdate) {
        try {
          // Check if customerMobileNumber exists before querying
          if (!customerMobileNumber) {
            throw new Error('Customer mobile number is required');
          }

          const locationRefDoc = await getDocs(
            collection(db, 'customers', customerMobileNumber, 'savedAddresses')
          );

          if (locationRefDoc.empty) {
            setServiceAreaError('No saved addresses found. Please add an address.');
            setIsInServiceAreaState(false);
            return false;
          }

          // Find the address where isEnabled is true
          const enabledAddressDoc = locationRefDoc.docs.find(doc =>
            doc.data().isEnabled === true
          );

          if (enabledAddressDoc) {
            const addressData = enabledAddressDoc.data();

            // Safely access nested location data with null checks
            const customerLocationData = addressData.customerLocation;
            if (!customerLocationData ||
              typeof customerLocationData.latitude === 'undefined' ||
              typeof customerLocationData.longitude === 'undefined') {
              throw new Error('Invalid location data in address');
            }

            const latitude = customerLocationData.latitude;
            const longitude = customerLocationData.longitude;
            location = { longitude, latitude };
            setCustomerLocation(location);
          } else {
            throw new Error('No enabled address found');
          }
        } catch (locationError) {
          console.error('Error getting location:', locationError);
          setServiceAreaError('Unable to get your location. Please select an enabled address.');
          setIsInServiceAreaState(false);
          return false;
        }
      }

      // Load service area if not available
      let polygons = serviceAreaPolygons;
      if (polygons.length === 0) {
        polygons = await loadVendorServiceArea();
        
        // If vendor has no service area after loading, return true
        if (!hasServiceArea) {
          setIsInServiceAreaState(true);
          return true;
        }
      }

      // Check if location is in service area
      const inServiceArea = isInServiceArea(location, polygons);
      setIsInServiceAreaState(inServiceArea);

      return inServiceArea;
    } catch (error) {
      console.error('Error checking service area:', error);
      setServiceAreaError('Failed to check service area');
      setIsInServiceAreaState(false);
      return false;
    } finally {
      setIsCheckingServiceArea(false);
    }
  }, [customerLocation, serviceAreaPolygons, loadVendorServiceArea, customerMobileNumber, hasServiceArea]);

  // Initial check when vendor changes
  useEffect(() => {
    if (vendorMobileNumber) {
      // First load the vendor's service area to check if they have one
      loadVendorServiceArea().then(() => {
        // Then check service area (which will handle the no-service-area case)
        checkServiceArea();
      });
    }
  }, [vendorMobileNumber, checkServiceArea, loadVendorServiceArea]);

  return {
    isInServiceArea: isInServiceAreaState,
    isCheckingServiceArea,
    serviceAreaError,
    customerLocation,
    checkServiceArea,
    refreshLocation: () => checkServiceArea(true),
    hasServiceArea // NEW: Expose this information
  };
};