import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform, Modal, Image
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { db } from '@/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp, writeBatch, getDoc
} from 'firebase/firestore';
import MapPicker from './MapPicker';
import TextInputComponent from './TextInput';
import ConfirmationModal from './ConfirmationModal';
import SuccessModal from './SuccessModal';

const AddressSheet = ({ onClose }) => {
    const { customerMobileNumber, setCustomerAddress } = useAuth();
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);
    const [initialLatitude, setInitialLatitude] = useState(null);
    const [initialLongitude, setInitialLongitude] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('')
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false)
    const [isSetAsPrimarySuccessModalVisible, setIsSetAsPrimarySuccessModalVisible] = useState(false)
    const [setAsPrimarySuccessMessage, setSetAsPrimarySuccessMessage] = useState('')
    const [addressIdToDelete, setAddressIdToDelete] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        nameForAddress: '',
        mobileNumberForAddress: '',
        customerPlotNumber: '',
        customerComplexNameOrBuildingName: '',
        customerLandmark: '',
        customerRoadNameOrStreetName: '',
        customerVillageNameOrTownName: '',
        customerCity: '',
        customerState: '',
        customerPincode: '',
        customerLocation: { latitude: null, longitude: null },
        isEnabled: false
    });

    const [inputErrors, setInputErrors] = useState({});

    const customerAddressesCollectionRef = useCallback(() => {
        if (!customerMobileNumber) return null;
        return collection(db, 'customers', customerMobileNumber, 'savedAddresses');
    }, [customerMobileNumber]);

    const fetchAddresses = useCallback(async () => {
        if (!customerMobileNumber) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const q = query(customerAddressesCollectionRef());
            const querySnapshot = await getDocs(q);
            const fetchedAddresses = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Sort addresses: primary (enabled) first
            const sortedAddresses = fetchedAddresses.sort((a, b) => {
                if (a.isEnabled && !b.isEnabled) return -1;
                if (!a.isEnabled && b.isEnabled) return 1;
                return 0;
            });

            setAddresses(sortedAddresses);
        } catch (err) {
            console.error('Error fetching addresses:', err);
            setError('Failed to load addresses.');
        } finally {
            setLoading(false);
        }
    }, [customerMobileNumber, customerAddressesCollectionRef]);

    useEffect(() => {
        fetchAddresses();
    }, [fetchAddresses]);

    const fetchCustomerLocation = () => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setInitialLatitude(position.coords.latitude);
                setInitialLongitude(position.coords.longitude);
                setFormData(prev => ({
                    ...prev,
                    customerLocation: {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }
                }));
            },
            (error) => {
                setInitialLatitude(null);
                setInitialLongitude(null);
            }
        );
    };

    useEffect(() => {
        fetchCustomerLocation();
    }, []);

    const addAddress = async (newAddressData) => {
        if (!customerMobileNumber) {
            throw new Error('Customer mobile number is not available.');
        }

        const newErrors = {};

        // Check each field and set an error flag if it's empty
        if (!newAddressData.nameForAddress) newErrors.nameForAddress = true;
        if (!newAddressData.mobileNumberForAddress || newAddressData.mobileNumberForAddress.length !== 10) newErrors.mobileNumberForAddress = true;
        if (!newAddressData.customerPlotNumber) newErrors.customerPlotNumber = true;
        if (!newAddressData.customerComplexNameOrBuildingName) newErrors.customerComplexNameOrBuildingName = true;
        if (!newAddressData.customerLandmark) newErrors.customerLandmark = true;
        if (!newAddressData.customerRoadNameOrStreetName) newErrors.customerRoadNameOrStreetName = true;
        if (!newAddressData.customerVillageNameOrTownName) newErrors.customerVillageNameOrTownName = true;
        if (!newAddressData.customerCity) newErrors.customerCity = true;
        if (!newAddressData.customerState) newErrors.customerState = true;
        if (!newAddressData.customerPincode || newAddressData.customerPincode.length !== 6) newErrors.customerPincode = true;

        // Update the state with the errors
        setInputErrors(newErrors);

        if (newErrors.mobileNumberForAddress) {
            setErrorMessage('Please enter a valid 10-Digit mobile number.')
            return;
        }

        if (newErrors.customerPincode) {
            setErrorMessage('Please enter a valid 6-Digit pincode.')
            return;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrorMessage('Please fill in all required fields correctly.');
            return; // Stop the registration process
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const addressesRef = customerAddressesCollectionRef();
            const newAddressRef = doc(addressesRef);

            // If this new address should be enabled, disable all others first
            if (newAddressData.isEnabled) {
                const q = query(addressesRef, where('isEnabled', '==', true));
                const snapshot = await getDocs(q);

                const batch = writeBatch(db);

                snapshot.docs.forEach((docSnap) => {
                    batch.update(doc(addressesRef, docSnap.id), { isEnabled: false });
                });
                await batch.commit();
            }

            await setDoc(newAddressRef, {
                ...newAddressData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            setErrorMessage('')
            await fetchAddresses();
            return true;
        } catch (err) {
            console.error('Error adding address:', err);
            setError('Failed to add address.');
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateAddress = async (addressId, updatedData) => {
        if (!customerMobileNumber) {
            throw new Error('Customer mobile number is not available.');
        }

        const newErrors = {};

        // Check each field and set an error flag if it's empty
        if (!updatedData.nameForAddress) newErrors.nameForAddress = true;
        if (!updatedData.mobileNumberForAddress || updatedData.mobileNumberForAddress.length !== 10) newErrors.mobileNumberForAddress = true;
        if (!updatedData.customerPlotNumber) newErrors.customerPlotNumber = true;
        if (!updatedData.customerComplexNameOrBuildingName) newErrors.customerComplexNameOrBuildingName = true;
        if (!updatedData.customerLandmark) newErrors.customerLandmark = true;
        if (!updatedData.customerRoadNameOrStreetName) newErrors.customerRoadNameOrStreetName = true;
        if (!updatedData.customerVillageNameOrTownName) newErrors.customerVillageNameOrTownName = true;
        if (!updatedData.customerCity) newErrors.customerCity = true;
        if (!updatedData.customerState) newErrors.customerState = true;
        if (!updatedData.customerPincode || updatedData.customerPincode.length !== 6) newErrors.customerPincode = true;

        // Update the state with the errors
        setInputErrors(newErrors);

        if (newErrors.mobileNumberForAddress) {
            setErrorMessage('Please enter a valid 10-Digit mobile number.')
            return;
        }

        if (newErrors.customerPincode) {
            setErrorMessage('Please enter a valid 6-Digit pincode.')
            return;
        }

        console.log(newErrors)

        if (Object.keys(newErrors).length > 0) {
            setErrorMessage('Please fill in all required fields correctly.');
            return; // Stop the registration process
        }

        setIsSubmitting(true);
        setError(null);
        try {
            const addressDocRef = doc(customerAddressesCollectionRef(), addressId);

            // If this address is being set to enabled, disable all others first
            if (updatedData.isEnabled) {
                const addressesRef = customerAddressesCollectionRef();
                const q = query(addressesRef, where('isEnabled', '==', true));
                const snapshot = await getDocs(q);

                const batch = writeBatch(db);

                snapshot.docs.forEach((docSnap) => {
                    if (docSnap.id !== addressId) {
                        batch.update(doc(addressesRef, docSnap.id), { isEnabled: false });
                    }
                });
                await batch.commit();
            }

            await updateDoc(addressDocRef, {
                ...updatedData,
                updatedAt: serverTimestamp(),
            });
            setErrorMessage('')
            await fetchAddresses();
            return true;
        } catch (err) {
            console.error('Error updating address:', err);
            setError('Failed to update address.');
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteAddress = async (addressId) => {
        if (!customerMobileNumber) {
            throw new Error('Customer mobile number is not available.');
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const addressDocRef = doc(customerAddressesCollectionRef(), addressId);
            await deleteDoc(addressDocRef);
            await fetchAddresses(); // This will refresh the list
            return true;
        } catch (err) {
            console.error('Error deleting address:', err);
            setError('Failed to delete address.');
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const setEnabledAddress = async (addressId) => {
        if (!customerMobileNumber) {
            throw new Error('Customer mobile number is not available.');
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const addressesRef = customerAddressesCollectionRef();
            const batch = writeBatch(db);

            // Disable all other addresses
            const q = query(addressesRef, where('isEnabled', '==', true));
            const snapshot = await getDocs(q);
            snapshot.docs.forEach((docSnap) => {
                if (docSnap.id !== addressId) {
                    batch.update(doc(addressesRef, docSnap.id), { isEnabled: false });
                }
            });

            // Enable the selected address
            batch.update(doc(addressesRef, addressId), { isEnabled: true });

            await batch.commit();
            await fetchAddresses();

            // Update the context with the new enabled address
            const enabledAddress = addresses.find(addr => addr.id === addressId);
            if (enabledAddress) {
                setCustomerAddress(enabledAddress);
            }

            setIsSetAsPrimarySuccessModalVisible(true)
            setSetAsPrimarySuccessMessage('Address Set As Primary Successfully')

            return true;
        } catch (err) {
            console.error('Error setting enabled address:', err);
            setError('Failed to set enabled address.');
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddNewClick = () => {
        setEditingAddress(null);
        setFormData({
            nameForAddress: '',
            mobileNumberForAddress: customerMobileNumber || '',
            customerPlotNumber: '',
            customerComplexNameOrBuildingName: '',
            customerLandmark: '',
            customerRoadNameOrStreetName: '',
            customerVillageNameOrTownName: '',
            customerCity: '',
            customerState: '',
            customerPincode: '',
            customerLocation: {
                latitude: initialLatitude,
                longitude: initialLongitude
            },
            isEnabled: false
        });
        setShowForm(true);
    };

    const handleEditClick = (address) => {
        setEditingAddress(address);
        setFormData({
            nameForAddress: address.nameForAddress || '',
            mobileNumberForAddress: address.mobileNumberForAddress || customerMobileNumber || '',
            customerPlotNumber: address.customerPlotNumber || '',
            customerComplexNameOrBuildingName: address.customerComplexNameOrBuildingName || '',
            customerLandmark: address.customerLandmark || '',
            customerRoadNameOrStreetName: address.customerRoadNameOrStreetName || '',
            customerVillageNameOrTownName: address.customerVillageNameOrTownName || '',
            customerCity: address.customerCity || '',
            customerState: address.customerState || '',
            customerPincode: address.customerPincode || '',
            customerLocation: address.customerLocation || {
                latitude: initialLatitude,
                longitude: initialLongitude
            },
            isEnabled: address.isEnabled || false
        });
        setShowForm(true);
    };

    const handleDeleteClick = async (addressId) => {
        try {
            await deleteAddress(addressId);
        } catch (err) {
            alert('Error', err.message || 'Error deleting address.');
        }
    };

    const handleSetEnabledClick = async (addressId) => {
        try {
            await setEnabledAddress(addressId);
            onClose();
        } catch (err) {
            alert('Error', err.message || 'Error setting primary address.');
        }
    };

    const handleFormSubmit = async () => {
        try {
            let success;
            if (editingAddress) {
                success = await updateAddress(editingAddress.id, formData);
            } else {
                success = await addAddress(formData);
            }
            if (success) {
                setShowForm(false);
                setEditingAddress(null);
                // alert('Success', `Address ${editingAddress ? 'updated' : 'added'} successfully!`);
            }
        } catch (err) {
            alert('Error', err.message || 'Error saving address.');
        }
    };

    const AddressCard = ({ address, onEdit, onSetEnabled, isSelected }) => (
        <View className={`${isSelected && 'pt-[15px]'}`} >
            {isConfirmModalVisible &&
                <ConfirmationModal
                    setIsConfirmModalVisible={setIsConfirmModalVisible}
                    confirmationMessage={`Are you sure you want to DELETE this address?`}
                    onConfirm={async () => {
                        setIsConfirmModalVisible(false)
                        if (addressIdToDelete) {
                            await handleDeleteClick(addressIdToDelete); // delete correct ID
                            setSuccessMessage('Address Deleted Successfully');
                            setIsSuccessModalVisible(true);
                            setAddressIdToDelete(null); // reset after delete
                        }
                    }}
                />
            }
            {isSuccessModalVisible &&
                <SuccessModal
                    setIsSuccessModalVisible={setIsSuccessModalVisible}
                    successMessage={successMessage}
                    duration={3000}
                />
            }
            {isSelected && (
                <View className="bg-primary px-2 py-1 rounded-full absolute top-[3px] right-[3px] z-50">
                    <Text className="text-white text-xs font-bold">Selected</Text>
                </View>
            )}
            <View
                className={`rounded-lg p-4 mb-[10px] relative ${isSelected ? 'bg-[#E6F0FF] border-2 border-blue-400 shadow-md shadow-blue-300' : 'bg-gray-50 border border-gray-500'}`}
                style={isSelected ? { elevation: 4 } : {}} // for Android shadow
            >
                <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-base font-bold">{address.nameForAddress}</Text>
                </View>

                <Text className="text-sm mb-1 leading-5">
                    {address.customerPlotNumber && `${address.customerPlotNumber}, `}
                    {address.customerComplexNameOrBuildingName && `${address.customerComplexNameOrBuildingName}, `}
                    {address.customerLandmark && `${address.customerLandmark}, `}
                    {address.customerRoadNameOrStreetName && `${address.customerRoadNameOrStreetName}, `}
                    {address.customerVillageNameOrTownName && `${address.customerVillageNameOrTownName}`}
                </Text>
                <Text className="text-sm mb-1 leading-5">
                    {address.customerCity && `${address.customerCity}, `}
                    {address.customerState && `${address.customerState} - `}
                    {address.customerPincode}
                </Text>

                <Text className="text-sm text-gray-500 mb-3">
                    Ph no. {address.mobileNumberForAddress}
                </Text>

                <View className="flex-row w-full justify-between items-center gap-[5px]">
                    <TouchableOpacity
                        className="bg-blue-500 p-[10px] rounded flex-1"
                        onPress={() => onEdit(address)}
                    >
                        <Text className="text-white text-[12px] font-bold text-center">Edit</Text>
                    </TouchableOpacity>
                    {!isSelected && <TouchableOpacity
                        className="bg-red-500 p-[10px] rounded flex-1"
                        onPress={() => {
                            // showConfirmationPopup(address.id, 'Are you you sure want to DELETE this address?')
                            setAddressIdToDelete(address.id)
                            setIsConfirmModalVisible(true)
                        }}
                    >
                        <Text className="text-white text-[12px] font-bold text-center">Delete</Text>
                    </TouchableOpacity>}
                    {!isSelected && (
                        <TouchableOpacity
                            className="bg-green-500 py-[2.5px] px-[10px] rounded flex-1"
                            onPress={() => onSetEnabled(address.id)}
                        >
                            <Text className="text-white text-[12px] font-bold text-center">Set as</Text>
                            <Text className="text-white text-[12px] font-bold text-center">Primary</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );

    const renderForm = () => (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
        >
            <ScrollView contentContainerStyle={{ gap: 8 }} className="p-[10px]">
                <Text className="text-lg font-bold text-center text-primary">
                    {editingAddress ? 'Edit Address' : 'Add New Address'}
                </Text>

                <View className='w-full rounded-[10px] p-[5px] border-[2px] border-[#c1d1f0] gap-[5px]' >
                    <Text className='text-center font-bold text-[15px]' >Select A Location On Map</Text>
                    <View className='w-full h-[180px]' >
                        {formData.customerLocation.latitude && formData.customerLocation.longitude &&
                            <MapPicker
                                onLocationSelect={({ latitude, longitude, address, addressComponents }) => {
                                    setFormData({
                                        ...formData,
                                        customerLocation: {
                                            latitude: latitude,
                                            longitude: longitude
                                        },
                                        address,
                                        addressComponents
                                    });
                                }}
                                initialLatitude={formData.customerLocation.latitude}
                                initialLongitude={formData.customerLocation.longitude}
                                apiKey="AIzaSyAlsboNdLoq6B6O5oPyPPnpbMT6FIOvPhE"
                                mapId="GoogleMapsAPIKeyForAdmin"
                            />
                        }
                    </View>
                    {formData.address && formData.address !== '' && <View className='p-[10px] border-[3px] border-[#ccc] rounded-[10px]' >
                        <Text>{formData.address}</Text>
                    </View>}
                </View>

                <TextInputComponent
                    className="border border-gray-300 rounded p-3"
                    placeholder="Full Name"
                    value={formData.nameForAddress}
                    onChangeText={(text) => setFormData({ ...formData, nameForAddress: text })}
                    hasError={inputErrors.nameForAddress}
                />

                <TextInputComponent
                    className="border border-gray-300 rounded p-3 "
                    placeholder="Alternate Mobile Number"
                    value={formData.mobileNumberForAddress}
                    onChangeText={(text) => setFormData({ ...formData, mobileNumberForAddress: text })}
                    keyboardType="phone-pad"
                    maxLength={10}
                    hasError={inputErrors.mobileNumberForAddress}
                />

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="Plot/Shop Number"
                        value={formData.customerPlotNumber}
                        onChangeText={(text) => setFormData({ ...formData, customerPlotNumber: text })}
                        hasError={inputErrors.customerPlotNumber}
                    />
                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        fontSize={14}
                        placeholder="Complex/Building Name"
                        value={formData.customerComplexNameOrBuildingName}
                        onChangeText={(text) => setFormData({ ...formData, customerComplexNameOrBuildingName: text })}
                        hasError={inputErrors.customerComplexNameOrBuildingName}
                    />
                </View>

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="Landmark"
                        value={formData.customerLandmark}
                        onChangeText={(text) => setFormData({ ...formData, customerLandmark: text })}
                        hasError={inputErrors.customerLandmark}
                    />
                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="Road/Street Name"
                        value={formData.customerRoadNameOrStreetName}
                        onChangeText={(text) => setFormData({ ...formData, customerRoadNameOrStreetName: text })}
                        hasError={inputErrors.customerRoadNameOrStreetName}
                    />
                </View>

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="Village/Town Name"
                        value={formData.customerVillageNameOrTownName}
                        onChangeText={(text) => setFormData({ ...formData, customerVillageNameOrTownName: text })}
                        hasError={inputErrors.customerVillageNameOrTownName}
                    />

                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="City"
                        value={formData.customerCity}
                        onChangeText={(text) => setFormData({ ...formData, customerCity: text })}
                        hasError={inputErrors.customerCity}
                    />
                </View>

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="State"
                        value={formData.customerState}
                        onChangeText={(text) => setFormData({ ...formData, customerState: text })}
                        hasError={inputErrors.customerState}
                    />

                    <TextInputComponent
                        className="border border-gray-300 rounded p-3 w-[49%]"
                        placeholder="Pincode"
                        value={formData.customerPincode}
                        onChangeText={(text) => setFormData({ ...formData, customerPincode: text })}
                        keyboardType="number-pad"
                        maxLength={6}
                        hasError={inputErrors.customerPincode}
                    />
                </View>

                {/* {!formData.isEnabled && <View className="flex-row items-center self-center">
                    <TouchableOpacity
                        className="mr-2"
                        onPress={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                    >
                        <View className={`w-6 h-6 border border-gray-400 rounded justify-center items-center ${formData.isEnabled ? 'bg-blue-500 border-blue-500' : ''}`}>
                            {formData.isEnabled && <Text className="text-white font-bold">✓</Text>}
                        </View>
                    </TouchableOpacity>
                    <Text className="text-base">Set as primary address</Text>
                </View>} */}

                {errorMessage && <View className='w-full border-red-400 border-2 rounded-[10px] p-2 bg-red-300' >
                    <Text className='text-[15px] text-white font-semibold text-center'>{errorMessage}</Text>
                </View>}

                <View className="flex-row justify-between items-center w-full">
                    <TouchableOpacity
                        className="bg-blue-500 py-3 rounded w-[49%] items-center"
                        onPress={handleFormSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-white font-bold">
                                {editingAddress ? 'Update Address' : 'Add Address'}
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="bg-gray-500 py-3 rounded w-[49%] items-center"
                        onPress={() => setShowForm(false)}
                        disabled={isSubmitting}
                    >
                        <Text className="text-white font-bold">Cancel</Text>
                    </TouchableOpacity>
                </View>

                {error && <Text className="text-red-500 text-center mt-3">{error}</Text>}
            </ScrollView>
        </KeyboardAvoidingView>
    );

    const renderAddressList = () => (
        <View className="flex-1 p-4">
            <TouchableOpacity
                className="bg-green-500 py-3 rounded items-center"
                onPress={handleAddNewClick}
            >
                <Text className="text-white font-bold">+ Add New Address</Text>
            </TouchableOpacity>

            {loading ? (
                <ActivityIndicator size="large" color="#2874F0" className="my-5" />
            ) : error ? (
                <Text className="text-red-500 text-center">{error}</Text>
            ) : addresses.length === 0 ? (
                <Text className="text-gray-500 text-center mt-5">
                    No addresses saved yet. Click "Add New Address" to add one.
                </Text>
            ) : (
                <ScrollView>
                    {addresses.map((address) => (
                        <AddressCard
                            key={address.id}
                            address={address}
                            onEdit={handleEditClick}
                            // onDelete={() => handleDeleteClick(address.id)}
                            onSetEnabled={handleSetEnabledClick}
                            isSelected={address.isEnabled}
                        />
                    ))}
                </ScrollView>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-white">
            <View className="bg-primary flex-row justify-between items-center p-4 pt-0 pb-[5px]">
                <Text className="text-white text-lg font-bold">
                    {showForm ? (editingAddress ? 'Edit Address' : 'Add New Address') : 'Manage Your Addresses'}
                </Text>
                <TouchableOpacity
                    onPress={showForm ? () => setShowForm(false) : onClose}
                >
                    <Text className="text-white text-3xl font-bold">×</Text>
                </TouchableOpacity>
            </View>

            <View className="flex-1">
                {showForm ? renderForm() : renderAddressList()}
            </View>

            {isSetAsPrimarySuccessModalVisible &&
                <SuccessModal
                    successMessage={setAsPrimarySuccessMessage}
                    setIsSuccessModalVisible={setIsSetAsPrimarySuccessModalVisible}
                    duration={3000}
                />
            }
        </View>
    );
};

export default AddressSheet;