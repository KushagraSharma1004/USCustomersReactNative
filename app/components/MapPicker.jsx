// src/components/MapPicker.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

// Define map options for better control
const mapOptions = {
  disableDefaultUI: false,
  zoomControl: false,
  streetViewControl: true,
  mapTypeControl: true,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  clickableIcons: true,
};

// Map container styles
const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px',
  border: '1px solid #ccc',
  backgroundColor: '#f0f0f0',
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  position: 'relative', // Added for positioning loading/error messages
};

const libraries = ['places', 'marker'];

const MapPicker = ({ onLocationSelect, initialLatitude, initialLongitude, apiKey, mapId }) => {
  const defaultCenter = { lat: 26.9124, lng: 75.7873 }; // Jaipur, Rajasthan, India

  const [markerPosition, setMarkerPosition] = useState({
    lat: initialLatitude || defaultCenter.lat,
    lng: initialLongitude || defaultCenter.lng,
  });
  
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const mapInstanceRef = useRef(null);
  const isInitialLoadRef = useRef(true); // New ref to track initial component mount

  const extractAddressComponents = useCallback((results) => {
    const components = {};
    if (results && results[0] && results[0].address_components) {
      results[0].address_components.forEach(component => {
        const type = component.types[0];
        components[type] = component.long_name;
        if (type === 'postal_code') components.postal_code = component.long_name;
        if (type === 'administrative_area_level_1') components.state = component.long_name;
        if (type === 'locality') components.city = component.long_name;
        if (type === 'route') components.route = component.long_name;
        if (type === 'street_number') components.street_number = component.long_name;
        if (['sublocality', 'neighborhood', 'sublocality_level_1', 'town'].includes(type)) {
            components.village_town = component.long_name;
        }
        if (['point_of_interest', 'establishment', 'landmark'].includes(type)) {
             components.point_of_interest = component.long_name;
        }
      });
    }
    return components;
  }, []);

  const triggerLocationSelect = useCallback(({ lat, lng, formattedAddress, extractedComponents, placeName = '', error = null }) => {
    onLocationSelect({
      latitude: lat,
      longitude: lng,
      address: formattedAddress,
      addressComponents: extractedComponents,
      placeName: placeName,
      error: error
    });
  }, [onLocationSelect]);

  const reverseGeocode = useCallback((lat, lng, callback) => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      console.warn("Google Maps Geocoder not loaded or API not fully initialized.");
      callback({ latitude: lat, longitude: lng, address: '', addressComponents: {}, placeName: 'Coordinates selected', error: 'Geocoder not available' });
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    const latlng = { lat, lng };

    geocoder.geocode({ 'location': latlng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        const extractedComponents = extractAddressComponents(results);
        const placeName = results[0].name || extractedComponents.point_of_interest || extractedComponents.route || extractedComponents.village_town || results[0].formatted_address.split(',')[0];
        callback({ latitude: lat, longitude: lng, address, addressComponents: extractedComponents, placeName, error: null });
      } else {
        console.error('Geocoder failed due to: ' + status);
        callback({ latitude: lat, longitude: lng, address: '', addressComponents: {}, placeName: 'Address not found', error: status });
      }
    });
  }, [extractAddressComponents]);

  const fetchCurrentGeolocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const newPos = { lat, lng };
          setMarkerPosition(newPos);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setCenter(newPos);
            mapInstanceRef.current.setZoom(15);
          }
          reverseGeocode(lat, lng, triggerLocationSelect);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error fetching current location:", error);
          setLocationError(`Error getting location: ${error.message}`);
          setIsLocating(false);
          triggerLocationSelect({
            lat: markerPosition.lat,
            lng: markerPosition.lng,
            formattedAddress: 'Could not fetch current address.',
            extractedComponents: {},
            placeName: '',
            error: `Geolocation error: ${error.message}`
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocationError("Geolocation is not supported by this browser.");
      setIsLocating(false);
      triggerLocationSelect({
        lat: markerPosition.lat,
        lng: markerPosition.lng,
        formattedAddress: 'Geolocation not supported.',
        extractedComponents: {},
        placeName: '',
        error: "Geolocation not supported by this browser."
      });
    }
  }, [reverseGeocode, triggerLocationSelect, markerPosition]);


  // Effect to update marker and map center when initialLatitude/Longitude props change
  useEffect(() => {
    // Only update if map is loaded and there are valid initial coordinates provided
    // that are different from the current marker position.
    if (mapInstanceRef.current && initialLatitude !== null && initialLongitude !== null &&
        (initialLatitude !== markerPosition.lat || initialLongitude !== markerPosition.lng)) {

      const newPos = { lat: initialLatitude, lng: initialLongitude };
      setMarkerPosition(newPos);
      mapInstanceRef.current.setCenter(newPos);
      mapInstanceRef.current.setZoom(15);

      // Perform reverse geocoding to get full address components
      reverseGeocode(newPos.lat, newPos.lng, triggerLocationSelect);
    }
  }, [initialLatitude, initialLongitude, mapInstanceRef, markerPosition.lat, markerPosition.lng, reverseGeocode, triggerLocationSelect]);


  // Callback for when the map loads initially and to add custom controls
  const onMapLoad = useCallback((map) => {
    mapInstanceRef.current = map;

    // Add the "Current Location" button
    const currentLocationButton = document.createElement('button');
    currentLocationButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF">
        <path d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.71 3.52 3.4 6.83 2.94 11H1v2h1.94c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.23-.48 7.53-3.77 7.94-7.94H23v-2h-2.06zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
    `;
    currentLocationButton.title = 'Your Location';
    currentLocationButton.style.backgroundColor = '#EA4335'; // Red color
    currentLocationButton.style.color = 'white';
    currentLocationButton.style.border = 'none';
    currentLocationButton.style.borderRadius = '2px';
    currentLocationButton.style.width = '30px';
    currentLocationButton.style.height = '30px';
    currentLocationButton.style.margin = '10px';
    currentLocationButton.style.cursor = 'pointer';
    currentLocationButton.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    currentLocationButton.style.display = 'flex';
    currentLocationButton.style.alignItems = 'center';
    currentLocationButton.style.justifyContent = 'center';
    currentLocationButton.style.transition = 'background-color 0.2s ease';

    currentLocationButton.onmouseover = () => currentLocationButton.style.backgroundColor = '#C53929';
    currentLocationButton.onmouseout = () => currentLocationButton.style.backgroundColor = '#EA4335';

    currentLocationButton.addEventListener('click', () => {
      fetchCurrentGeolocation();
    });

    map.controls[window.google.maps.ControlPosition.RIGHT_BOTTOM].push(currentLocationButton);

    // --- NEW LOGIC FOR AUTO-CLICK ---
    // Only attempt to auto-click if this is the very initial load of the component
    // AND no initialLatitude/Longitude props were provided (i.e., this is a "new address" scenario).
    if (isInitialLoadRef.current && initialLatitude === null && initialLongitude === null) {
      // Use a timeout to ensure the map and its controls are fully rendered and interactive.
      // A small delay makes the "auto-click" less jarring for the user.
      setTimeout(() => {
        currentLocationButton.click(); // Programmatically click the button
        isInitialLoadRef.current = false; // Prevent subsequent auto-clicks
      }, 500); // 500ms delay
    } else if (isInitialLoadRef.current) {
        // If initialLatitude/Longitude were provided, it's an edit scenario,
        // so we don't auto-click. Just mark initial load as done.
        isInitialLoadRef.current = false;
    }

  }, [initialLatitude, initialLongitude, fetchCurrentGeolocation]); // Dependencies for onMapLoad

  // Reset isInitialLoadRef if initialLatitude/Longitude become null (e.g., switching from edit to add mode)
  useEffect(() => {
    if (initialLatitude === null && initialLongitude === null) {
      isInitialLoadRef.current = true;
    }
  }, [initialLatitude, initialLongitude]);


  const onMapClick = useCallback(async (event) => {
    if (!event.detail || !event.detail.latLng) {
        console.warn("Click event did not provide valid latLng details.");
        return;
    }

    const lat = event.detail.latLng.lat;
    const lng = event.detail.latLng.lng;
    const placeId = event.detail.placeId;

    setMarkerPosition({ lat, lng });

    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (geoResults, geoStatus) => {
        if (geoStatus === 'OK' && geoResults[0]) {
          const formattedAddress = geoResults[0].formatted_address;
          const extractedComponents = extractAddressComponents(geoResults);
          let placeName = '';

          if (placeId && window.google.maps.places && mapInstanceRef.current) {
            const service = new window.google.maps.places.PlacesService(mapInstanceRef.current);
            service.getDetails({
              placeId: placeId,
              fields: ['name']
            }, (place, placeStatus) => {
              if (placeStatus === window.google.maps.places.PlacesServiceStatus.OK && place && place.name) {
                placeName = place.name;
              } else {
                console.warn(`PlacesService.getDetails failed for placeId ${placeId} due to: ${placeStatus}`);
              }
              triggerLocationSelect({
                lat: lat,
                lng: lng,
                formattedAddress: formattedAddress,
                extractedComponents: extractedComponents,
                placeName: placeName,
              });
            });
          } else {
            triggerLocationSelect({
              lat: lat,
              lng: lng,
              formattedAddress: formattedAddress,
              extractedComponents: extractedComponents,
              placeName: '',
            });
          }
        } else {
          console.error(`Geocoder failed for clicked location due to: ${geoStatus}`);
          triggerLocationSelect({
            lat: lat,
            lng: lng,
            formattedAddress: 'Address not found for selected location.',
            extractedComponents: {},
            placeName: '',
            error: `Geocoding failed: ${geoStatus}`
          });
        }
      });
    } else {
      console.warn('Google Maps Geocoder not available yet.');
      triggerLocationSelect({
        lat: lat,
        lng: lng,
        formattedAddress: 'Geocoding service not ready.',
        extractedComponents: {},
        placeName: '',
        error: "Geocoding service not ready."
      });
    }
  }, [extractAddressComponents, triggerLocationSelect]);


  return (
    <APIProvider apiKey={apiKey} libraries={libraries}>
      <Map
        mapContainerStyle={containerStyle}
        defaultCenter={markerPosition} // Center the map on the marker position
        defaultZoom={13}
        options={mapOptions}
        onLoad={onMapLoad}
        onClick={onMapClick}
        mapId={mapId}
      >
        <AdvancedMarker position={markerPosition}>
          <Pin background={'#2874F0'} glyphColor={'#FFF'} borderColor={'#000'} />
        </AdvancedMarker>
      </Map>
      {isLocating && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 15px',
          borderRadius: '5px',
          zIndex: 1000
        }}>
          Fetching current location...
        </div>
      )}
      {locationError && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#dc3545',
          color: 'white',
          padding: '8px 15px',
          borderRadius: '5px',
          zIndex: 1000
        }}>
          {locationError}
        </div>
      )}
    </APIProvider>
  );
};

export default MapPicker;