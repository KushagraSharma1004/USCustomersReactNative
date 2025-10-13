import { View, Text, Image, TouchableOpacity, Linking, ScrollView, Modal } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import TextInputComponent from './components/TextInput'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Loader from './components/Loader.jsx'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth, db } from '@/firebase'
import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, query, where } from 'firebase/firestore'
import MapPicker from './components/MapPicker.jsx'
import { getCurrentLocation } from './utils/location.js'
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { decryptData, encryptData } from './context/hashing.js'

const SignUp = () => {
    const router = useRouter()
    const { setCustomerMobileNumber, setCustomerPassword, setCustomerFullData } = useAuth()
    const [vendorMobileNumberToRegisterUnder, setVendorMobileNumberToRegisterUnder] = useState('')
    const params = useLocalSearchParams();
    const customerMobileNumberToRegister = params.registerCustomer || ''
    const customerMobileNumberFromURL = params.customerMobileNumber || ''
    const [customerMobileNumber, setCustomerMobileNumberThisScreen] = useState('')
    const [isCommonLoaderVisible, setIsCommonLoaderVisible] = useState(false)
    const [customerPassword, setCustomerPasswordThisScreen] = useState('')
    const [confirmCustomerPassword, setConfirmCustomerPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [referralCode, setReferralCode] = useState('')
    const [customerReferralCode, setCustomerReferralCode] = useState('')
    const [otp, setOtp] = useState("");
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isStep2Visible, setIsStep2Visible] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [customerEmailId, setCustomerEmailId] = useState('')
    const [customerFlatHouseNumber, setCustomerFlatHouseNumber] = useState('')
    const [customerComplexBuildingAreaName, setCustomerComplexBuildingAreaName] = useState('')
    const [customerRoadStreetName, setCustomerRoadStreetName] = useState('')
    const [customerVillageTownName, setCustomerVillageTownName] = useState('')
    const [customerLandmark, setCustomerLandmark] = useState('')
    const [customerCity, setCustomerCity] = useState('')
    const [customerState, setCustomerState] = useState('')
    const [customerPincode, setCustomerPincode] = useState('')
    const [inputErrors, setInputErrors] = useState({});
    const [customerLocation, setCustomerLocation] = useState({ latitude: null, longitude: null, address: '', addressComponents: {}, error: null })
    const [initialLatitude, setInitialLatitude] = useState(null)
    const [initialLongitude, setInitialLongitude] = useState(null)
    const [isFetchingLocation, setIsFetchingLocation] = useState(false)
    const [customerImagePreview, setCustomerImagePreview] = useState(null);
    const [showImagePickerOptions, setShowImagePickerOptions] = useState(false);
    const [customerImage, setCustomerImage] = useState(null)
    const registerInVendor = decryptData(localStorage.getItem('registerInVendor')) || ''
    const vendorMobileNumberToRegisterUnderFormURL = params.vendorMobileNumberToRegisterUnderFormURL || ''

    useEffect(() => {
        if (customerMobileNumberToRegister && decryptData(customerMobileNumberToRegister).length === 10) {
            setCustomerMobileNumberThisScreen(decryptData(customerMobileNumberToRegister))
        }
        if (vendorMobileNumberToRegisterUnderFormURL && decryptData(vendorMobileNumberToRegisterUnderFormURL).length === 10) {
            setVendorMobileNumberToRegisterUnder(decryptData(vendorMobileNumberToRegisterUnderFormURL))
        }
    }, [customerMobileNumberToRegister, vendorMobileNumberToRegisterUnderFormURL])


    const uploadCustomerImage = async () => {
        if (!customerImage) return null;

        try {
            // Convert the image URI to a blob
            const blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    resolve(xhr.response);
                };
                xhr.onerror = function () {
                    reject(new TypeError('Network request failed'));
                };
                xhr.responseType = 'blob';
                xhr.open('GET', customerImage, true);
                xhr.send(null);
            });

            const storage = getStorage();
            const storageRef = ref(storage, `customerImages/${customerMobileNumber}/${uuidv4()}.jpeg`);

            // Upload the blob
            await uploadBytes(storageRef, blob);

            // Clean up the blob
            if (blob.close) {
                blob.close();
            }

            const downloadURL = await getDownloadURL(storageRef);
            return downloadURL;
        } catch (error) {
            console.error("Error uploading customer image: ", error);
            setErrorMessage('Failed to upload customer image. Please try again.');
            return null;
        }
    };

    const handleImagePick = (type) => {
        const options = {
            mediaType: 'photo',
            includeBase64: false,
            maxHeight: 200,
            maxWidth: 200,
        };

        const callback = (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.error) {
                console.log('ImagePicker Error: ', response.error);
            } else if (response.assets && response.assets.length > 0) {
                const source = response.assets[0].uri;
                setCustomerImagePreview(source);
                setCustomerImage(source)
                // You can also upload the image to your server here
            }
            setShowImagePickerOptions(false);
        };

        if (type === 'camera') {
            launchCamera(options, callback);
        } else {
            launchImageLibrary(options, callback);
        }
    };

    const fetchCustomerLocation = async () => {
        try {
            setIsFetchingLocation(true);
            const currentLocation = await getCurrentLocation();

            // Set the initial coordinates for the map
            setInitialLatitude(currentLocation.latitude);
            setInitialLongitude(currentLocation.longitude);

            // Set the customer location state
            setCustomerLocation({
                ...customerLocation,
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                error: null
            });

            setIsFetchingLocation(false);
        } catch (error) {
            console.error('Error fetching location:', error);
            setCustomerLocation({
                ...customerLocation,
                error: error.message
            });
            setIsFetchingLocation(false);
        }
    };

    useEffect(() => {
        fetchCustomerLocation();
    }, []);

    useEffect(() => {
        if (customerLocation.latitude && customerLocation.longitude && customerLocation.addressComponents && Object.keys(customerLocation.addressComponents).length > 0) {
            const components = customerLocation.addressComponents;

            // Populate specific address fields
            setCustomerRoadStreetName(components.route || components.street_number || '');
            setCustomerVillageTownName(components.village_town || components.neighborhood || components.sublocality || components.locality || ''); // Use custom 'village_town' from MapPicker
            setCustomerCity(components.city || components.locality || ''); // Use custom 'city' from MapPicker
            setCustomerState(components.state || components.administrative_area_level_1 || ''); // Use custom 'state' from MapPicker
            setCustomerPincode(components.postal_code || '');
            setCustomerLandmark(components.point_of_interest || '');

        } else {
            console.log("Location is incomplete or addressComponents are empty. Clearing fields.");
            // Clear all relevant address fields
            setCustomerRoadStreetName('');
            setCustomerVillageTownName('');
            setCustomerCity('');
            setCustomerState('');
            setCustomerPincode('');
            setCustomerLandmark('');
        }
    }, [customerLocation]);

    useEffect(() => {
        if (customerMobileNumberFromURL && customerMobileNumberFromURL.length === 10) {
            setCustomerMobileNumberThisScreen(customerMobileNumberFromURL);
        }
    }, [customerMobileNumberFromURL]);

    function generateCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';

        let code = '';

        // Add 3 random alphabets
        for (let i = 0; i < 3; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        // Add 3 random numbers
        for (let i = 0; i < 3; i++) {
            code += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }

        // Shuffle the code (Fisher-Yates algorithm)
        const codeArray = code.split('');
        for (let i = codeArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [codeArray[i], codeArray[j]] = [codeArray[j], codeArray[i]];
        }

        return codeArray.join('');
    }

    useEffect(() => {
        const ReferralCodeSetting = async () => {
            let temporarySelfReferralCode;
            let codeExists = true;

            while (codeExists) {
                temporarySelfReferralCode = generateCode() || '0';
                const usersRef = collection(db, 'customers');
                const q = query(usersRef, where('customerReferralCode', '==', temporarySelfReferralCode));
                const querySnapshot = await getDocs(q);
                codeExists = !querySnapshot.empty;
                if (!codeExists) {
                    setCustomerReferralCode(temporarySelfReferralCode);
                } else {
                    console.log('Code already exists, regenerating...');
                    // No need to reload, just let the loop continue and generate a new code.
                }
            }
        };

        if (!customerReferralCode) { // Only generate if not already set
            ReferralCodeSetting();
        }
    }, [customerReferralCode]);

    const fetchIfRegistrationPending = async () => {
        const isRegistrationPendingMobileNumber = localStorage.getItem('customerMobileNumberOfPendingRegistration') || ''
        if (isRegistrationPendingMobileNumber === customerMobileNumber) {
            const customerRef = doc(db, 'customers', isRegistrationPendingMobileNumber)
            const customerDocSnap = await getDoc(customerRef)
            if (customerDocSnap.exists()) {
                return true
            } else {
                return false
            }
        }
        return false
    }

    const validateForm = () => {
        const isMobileNumberValid = customerMobileNumber.length === 10;
        const isPasswordValid = customerPassword.length > 0;
        const isConfirmPasswordValid = customerPassword === confirmCustomerPassword
        return (
            isMobileNumberValid && isPasswordValid && isConfirmPasswordValid
        );
    }

    const validateBlock2 = () => {
        // Check if any of the required fields are empty
        if (
            !customerName ||
            !customerEmailId ||
            !customerFlatHouseNumber ||
            !customerComplexBuildingAreaName ||
            !customerRoadStreetName ||
            !customerVillageTownName ||
            !customerCity ||
            !customerState ||
            !customerLandmark
        ) {
            return false;
        }

        // Check if the pincode has exactly 6 digits
        if (!customerPincode || customerPincode.length !== 6) {
            return false;
        }

        // If all checks pass, the form is valid
        return true;
    }

    const setupRecaptcha = () => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(
                auth,
                "recaptcha-container",
                {
                    size: "invisible",
                    callback: () => console.log("Recaptcha solved."),
                }
            );
            window.recaptchaVerifier.render();
        }
    };

    const handleSendOTP = async () => {
        if (customerMobileNumber.length !== 10) {
            setErrorMessage('Invalid Mobile Number')
            return;
        }
        if (customerPassword.length === 0) {
            setErrorMessage('Invalid Password')
            return;
        }

        if (confirmCustomerPassword !== customerPassword) {
            setErrorMessage('Passwords does not match')
            return;
        }

        setErrorMessage('')
        try {
            setIsCommonLoaderVisible(true)
            const customerDocRef = doc(db, 'customers', customerMobileNumber);
            const customerDocSnap = await getDoc(customerDocRef);
            const customerData = customerDocSnap.data();

            const isRegistrationPending = await fetchIfRegistrationPending()
            if (isRegistrationPending) {
                setIsStep2Visible(true)
                return;
            }

            if (customerData?.customerName) {
                setErrorMessage('Mobile number is already registered. Please login.');
                return;
            }

            if (referralCode) {
                let referralMatch = false;
                if (referralCode) {
                    const usersRef = collection(db, 'customers');
                    const q = query(usersRef, where('customerReferralCode', '==', referralCode));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        referralMatch = true;
                        const referrerDoc = querySnapshot.docs[0];
                        // const referrerMobileNumber = referrerDoc.data().customerMobileNumber;
                        // const referrerName = referrerDoc.data().customerName;

                        try {
                            // await setDoc(doc(db, 'customers', referrerMobileNumber, 'myReferrals', customerMobileNumber), {
                            //     customerMobileNumber: customerMobileNumber,
                            //     customerName: customerName,
                            //     timestamp: new Date(),
                            // });
                        } catch (error) {
                            // console.error("Error adding myReferrals (referrer): ", error);
                            // setErrorMessage('An error occurred. Please try again later.');
                            return;
                        }

                        try {
                            // await setDoc(doc(db, 'customers', customerMobileNumber, 'meReferred', referrerMobileNumber), {
                            //     customerName: referrerName,
                            //     customerMobileNumber: referrerMobileNumber,
                            //     timestamp: new Date(),
                            // });
                        } catch (error) {
                            // console.error("Error adding myReferrals (new user): ", error);
                            // setErrorMessage('An error occurred. Please try again later.');
                            return;
                        }
                    }
                }

                if (referralCode && !referralMatch) {
                    setErrorMessage('Incorrect referral code. Please try again.');
                    setSuccessMessage('');
                    return;
                }
            }

            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, `+91${customerMobileNumber}`, appVerifier);
            setConfirmationResult(confirmation);
            console.log(confirmation)
            setIsCommonLoaderVisible(false);
        } catch (error) {
            setErrorMessage(error.message)
        } finally {
            setIsCommonLoaderVisible(false)
        }
    }

    const verifyOTPAndRegister = async () => {
        if (!otp || otp.length < 6) {
            setErrorMessage("Please enter the correct OTP.");
            return;
        }
        try {
            setIsCommonLoaderVisible(true);
            // Confirm OTP
            await confirmationResult.confirm(otp);

            try {
                const docRef = doc(db, 'customers', customerMobileNumber);

                if (referralCode) {
                    let referralMatch = false;
                    if (referralCode) {
                        const usersRef = collection(db, 'customers');
                        const q = query(usersRef, where('customerReferralCode', '==', referralCode));
                        const querySnapshot = await getDocs(q);

                        if (!querySnapshot.empty) {
                            referralMatch = true;
                        }
                    }

                    if (referralCode && !referralMatch) {
                        setErrorMessage('Incorrect referral code. Please try again.');
                        setSuccessMessage('');
                        return;
                    }
                }

                await setDoc(docRef, {
                    customerMobileNumber,
                    customerPassword: customerPassword.trimEnd(),
                    timestamp: new Date(),
                    customerReferralCode: customerReferralCode,
                    referralCode: referralCode && referralCode.length === 6 ? referralCode : ''
                });

                setErrorMessage('');
                setSuccessMessage('Registered successfully!');
                setConfirmationResult(null)
                setIsStep2Visible(true)
                localStorage.setItem('customerMobileNumberOfPendingRegistration', customerMobileNumber)
                setIsCommonLoaderVisible(false);
            } catch (error) {
                console.error('Error registering :', error);
                setErrorMessage('An error occurred during registration. Please try again.');
                setSuccessMessage('');
                setIsCommonLoaderVisible(false);
            } finally {
                setIsCommonLoaderVisible(false);
            }
        } catch (error) {
            console.error("Error verifying OTP: ", error.message);
            setErrorMessage('Failed to verify OTP. Please try again.');
            setIsCommonLoaderVisible(false);
        } finally {
            setIsCommonLoaderVisible(false);
        }
    }

    const handleCompleteRegistration = async () => {
        if (customerLocation.error) {
            alert('Please enable location from settings.');
            return
        }
        try {
            setIsCommonLoaderVisible(true);
            const newErrors = {};

            // Check each field and set an error flag if it's empty
            if (!customerName) newErrors.customerName = true;
            if (!customerEmailId) newErrors.customerEmailId = true;
            if (!customerFlatHouseNumber) newErrors.customerFlatHouseNumber = true;
            if (!customerComplexBuildingAreaName) newErrors.customerComplexBuildingAreaName = true;
            if (!customerRoadStreetName) newErrors.customerRoadStreetName = true;
            if (!customerVillageTownName) newErrors.customerVillageTownName = true;
            if (!customerCity) newErrors.customerCity = true;
            if (!customerState) newErrors.customerState = true;
            if (!customerLandmark) newErrors.customerLandmark = true;
            if (!customerPincode || customerPincode.length !== 6) newErrors.customerPincode = true;

            // Update the state with the errors
            setInputErrors(newErrors);

            // Check if there are any errors
            if (Object.keys(newErrors).length > 0) {
                setErrorMessage('Please fill in all required fields correctly.');
                return; // Stop the registration process
            }

            const customerRef = doc(db, 'customers', customerMobileNumber)
            const customerDocSnap = await getDoc(customerRef)
            // if (customerDocSnap.exists()) {
            const customerDataForReferral = customerDocSnap.data()
            // }
            const imageUrl = customerImagePreview ? await uploadCustomerImage() : null;
            await updateDoc(customerRef, {
                customerName: customerName.trimEnd(),
                customerMailId: customerEmailId.trimEnd(),
                customerImage: imageUrl
            })

            const referralCode = customerDataForReferral.referralCode !== '' && customerDataForReferral.referralCode.length === 6 ? customerDataForReferral.referralCode : null

            if (referralCode) {
                let referralMatch = false;
                if (referralCode) {
                    const usersRef = collection(db, 'customers');
                    const q = query(usersRef, where('customerReferralCode', '==', referralCode));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        referralMatch = true;
                        const referrerDoc = querySnapshot.docs[0];
                        const referrerMobileNumber = referrerDoc.data().customerMobileNumber;
                        const referrerName = referrerDoc.data().customerName;

                        try {
                            await setDoc(doc(db, 'customers', referrerMobileNumber, 'myReferrals', customerMobileNumber), {
                                customerMobileNumber: customerMobileNumber,
                                customerName: customerName,
                                timestamp: new Date(),
                            });
                        } catch (error) {
                            console.error("Error adding myReferrals (referrer): ", error);
                            setErrorMessage('An error occurred. Please try again later.');
                            return;
                        }

                        try {
                            await setDoc(doc(db, 'customers', customerMobileNumber, 'meReferred', referrerMobileNumber), {
                                customerName: referrerName,
                                customerMobileNumber: referrerMobileNumber,
                                timestamp: new Date(),
                            });
                        } catch (error) {
                            console.error("Error adding myReferrals (new user): ", error);
                            setErrorMessage('An error occurred. Please try again later.');
                            return;
                        }
                    }
                }

                if (referralCode && !referralMatch) {
                    setErrorMessage('Incorrect referral code. Please try again.');
                    setSuccessMessage('');
                    return;
                }
            }

            const savedAddressesDocRef = collection(db, 'customers', customerMobileNumber, 'savedAddresses');
            const savedAddressesDocConvertedRef = doc(savedAddressesDocRef);

            await setDoc(savedAddressesDocConvertedRef, {
                mobileNumberForAddress: customerMobileNumber,
                nameForAddress: customerName.trimEnd(),
                customerPlotNumber: customerFlatHouseNumber.trimEnd(),
                customerComplexNameOrBuildingName: customerComplexBuildingAreaName.trimEnd(),
                customerRoadNameOrStreetName: customerRoadStreetName.trimEnd(),
                customerVillageNameOrTownName: customerVillageTownName.trimEnd(),
                customerLandmark: customerLandmark.trimEnd(),
                customerCity: customerCity.trimEnd(),
                customerState: customerState.trimEnd(),
                customerPincode: customerPincode.trimEnd(),
                createdAt: serverTimestamp(),
                customerLocation: customerLocation,
                isEnabled: true
            });

            const customerNewRef = doc(db, 'customers', customerMobileNumber)
            const customerNewDocSnap = await getDoc(customerNewRef)
            const customerData = customerNewDocSnap.data()

            if (vendorMobileNumberToRegisterUnder.length === 10) {
                const handleAddVendorToMyVendorList = async () => {
                    try {
                        const customerInVendorRef = doc(db, 'customers', customerMobileNumber, 'vendors', vendorMobileNumberToRegisterUnder)
                        const vendorInCustomerRef = doc(db, 'users', vendorMobileNumberToRegisterUnder, 'customers', customerMobileNumber)
                        await setDoc(customerInVendorRef, {
                            addedAt: serverTimestamp(),
                            vendorMobileNumber: vendorMobileNumberToRegisterUnder
                        })
                        await setDoc(vendorInCustomerRef, {
                            addedAt: serverTimestamp(),
                            customerMobileNumber
                        })
                    } catch (error) {
                        console.log('Error adding vendor to vendor list: ', error)
                        alert('Could not add vendor to vendor list. Please try again.')
                    }
                }
                handleAddVendorToMyVendorList()
            }

            await setCustomerFullData(customerData)

            await setCustomerMobileNumber(customerMobileNumber)
            await setCustomerPassword(customerPassword)
            setErrorMessage('');
            if (registerInVendor && registerInVendor.length === 10) {
                const handleAddVendorToMyVendorList = async () => {
                    try {
                        const customerInVendorRef = doc(db, 'customers', customerMobileNumber, 'vendors', registerInVendor)
                        const vendorInCustomerRef = doc(db, 'users', registerInVendor, 'customers', registerInVendor)
                        const customerInVendorDocSnap = await getDoc(customerInVendorRef)
                        const vendorInCustomerDocSnap = await getDoc(vendorInCustomerRef)
                        if (!customerInVendorDocSnap.exists() || !vendorInCustomerDocSnap.exists()) {
                            await setDoc(customerInVendorRef, {
                                addedAt: serverTimestamp(),
                                vendorMobileNumber: registerInVendor
                            })

                            await setDoc(vendorInCustomerRef, {
                                addedAt: serverTimestamp(),
                                customerMobileNumber
                            })

                            localStorage.removeItem('registerInVendor')
                            router.push(`/Vendors/?vendor=${encodeURIComponent(encryptData(registerInVendor))}`)
                        } else {
                            localStorage.removeItem('registerInVendor')
                            router.push(`/Vendors/?vendor=${encodeURIComponent(encryptData(registerInVendor))}`)
                        }
                    } catch (error) {
                        console.log('Error adding vendor to vendor list: ', error)
                        alert('Could not add vendor to vendor list. Please try again.')
                    }
                }
                await handleAddVendorToMyVendorList()
                // router.push(`/(tabs)/Vendors/?vendor=${encodeURIComponent(encryptData(registerInVendor))}`)
                return
            }
            router.replace('/(tabs)/Home')
        } catch (error) {
            console.log('Error Completing Registration: ', error);
            setErrorMessage('An error occurred. Please try again.');
        } finally {
            setIsCommonLoaderVisible(false);
            localStorage.removeItem('customerMobileNumberOfPendingRegistration')
        }
    };

    return (
        <View className='flex-1 bg-primary items-center justify-center gap-2' >
            <View id="recaptcha-container" style={{ zIndex: 10 }} />
            {isCommonLoaderVisible && <Loader />}

            {!isStep2Visible && <>
                <Image style={{ height: 100, width: 100 }} source={require('../assets/images/icon.png')} />
                <Text className='text-white text-2xl font-bold text-center'>Customer Sign Up</Text>
            </>}

            {isStep2Visible && <View className='flex-row items-center justify-center gap-[10px]' >
                <Image style={{ height: 30, width: 30 }} source={require('../assets/images/icon.png')} />
                <Text className='text-white text-2xl font-bold text-center'>Customer Sign Up</Text>
            </View>}

            {/* ---- Block 1 ---- */}
            {!confirmationResult && !isStep2Visible && <View className='bg-white rounded-[10px] p-5 w-[93%] max-w-md items-center justify-center gap-2 flex-col'>
                <TextInputComponent
                    placeholder='Mobile Number'
                    keyboardType='number-pad'
                    value={customerMobileNumber}
                    onChangeText={setCustomerMobileNumberThisScreen}
                    maxLength={10}
                />

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        placeholder='Password'
                        value={customerPassword}
                        onChangeText={setCustomerPasswordThisScreen}
                        secureTextEntry={true}
                        width='49%'
                    />
                    <TextInputComponent
                        placeholder='Re-Enter Password'
                        value={confirmCustomerPassword}
                        onChangeText={setConfirmCustomerPassword}
                        secureTextEntry={true}
                        width='49%'
                    />
                </View>

                <TextInputComponent
                    placeholder='Referral Code (Optional)'
                    value={referralCode}
                    onChangeText={setReferralCode}
                    maxLength={6}
                />

                <View className='flex-row items-center justify-end w-full py-[7px]' >
                    {/* <Text className='text-primary text-sm font-semibold' onPress={() => router.push('/SignUp')}>Sign Up</Text> */}
                    <Text className='text-primary text-sm font-semibold' onPress={() => router.push('/Login')}>Login</Text>
                </View>

                {errorMessage && <View className='w-full border-red-400 border-2 rounded-[10px] p-2 mt-2 bg-red-300' >
                    <Text className='text-[15px] text-white font-semibold text-center'>{errorMessage}</Text>
                </View>}
                <TouchableOpacity className={`${validateForm() ? 'bg-primary' : 'bg-[#ccc]'} w-full rounded-[10px] p-3 items-center justify-center`} onPress={handleSendOTP} ><Text className='text-white text-lg font-semibold' >Send OTP</Text></TouchableOpacity>
            </View>}

            {/* ---- Confirmation Result Block ---- */}
            {confirmationResult && <View className='bg-white rounded-[10px] p-5 w-[93%] max-w-md items-center justify-center gap-2 flex-col'>
                <TextInputComponent
                    placeholder='6-Digit OTP'
                    keyboardType='number-pad'
                    value={otp}
                    onChangeText={setOtp}
                    maxLength={6}
                />
                <Text className='text-primary' >A 6-Digit OTP was sent ✅ on {customerMobileNumber}</Text>
                {errorMessage && <View className='w-full border-red-400 border-2 rounded-[10px] p-2 mt-2 bg-red-300' >
                    <Text className='text-[15px] text-white font-semibold text-center'>{errorMessage}</Text>
                </View>}

                <TouchableOpacity className={`${otp.length === 6 ? 'bg-primary' : 'bg-[#ccc]'} w-full rounded-[10px] p-3 items-center justify-center`} onPress={verifyOTPAndRegister} ><Text className='text-white text-lg font-semibold' >Confirm OTP</Text></TouchableOpacity>
            </View>}

            {/* ---- Block 2 ---- */}
            {isStep2Visible && <ScrollView contentContainerStyle={{ width: '100%', gap: 10 }} className='bg-white rounded-[10px] p-[10px] w-[97%] max-w-md flex-col mb-[7px]'>
                <View className='w-full flex-row items-center justify-between' >

                    <View className='w-[49%] h-[180px] relative'>
                        <TouchableOpacity
                            onPress={() => setShowImagePickerOptions(true)}
                            className="w-full h-full"
                        >
                            {!customerImagePreview ? (
                                <>
                                    <Text className='absolute z-10 text-center w-full bottom-[5px] text-primary'>
                                        Tap to add profile image
                                    </Text>
                                    <Image
                                        resizeMode='cover'
                                        source={require('../assets/images/placeholderImage.png')}
                                        style={{ height: '100%', width: '100%' }}
                                        className='w-full h-full rounded-[10px]'
                                    />
                                </>
                            ) : (
                                <Image
                                    source={{ uri: customerImagePreview }}
                                    className='w-full h-full rounded-[10px]'
                                />
                            )}
                        </TouchableOpacity>

                        {/* Image Picker Options Modal */}
                        {showImagePickerOptions && (
                            <Modal
                                transparent={true}
                                animationType="slide"
                                visible={showImagePickerOptions}
                                onRequestClose={() => setShowImagePickerOptions(false)}
                            >
                                <View className="flex-1 justify-center items-center bg-[#00000080]">
                                    <View className="bg-white rounded-lg p-5 w-80">
                                        <Text className="text-lg font-bold text-center mb-4">
                                            Choose Profile Picture
                                        </Text>

                                        <TouchableOpacity
                                            onPress={() => handleImagePick('camera')}
                                            className="bg-primary py-3 rounded-lg mb-3"
                                        >
                                            <Text className="text-white text-center font-semibold">
                                                Take Photo
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => handleImagePick('gallery')}
                                            className="bg-primary py-3 rounded-lg mb-3"
                                        >
                                            <Text className="text-white text-center font-semibold">
                                                Choose from Gallery
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            onPress={() => setShowImagePickerOptions(false)}
                                            className="bg-gray-500 py-3 rounded-lg"
                                        >
                                            <Text className="text-white text-center font-semibold">
                                                Cancel
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </Modal>
                        )}
                    </View>

                    <View className='w-[49%] h-[180px]' >
                        {initialLatitude && initialLongitude &&
                            <MapPicker
                                onLocationSelect={({ latitude, longitude, address, addressComponents }) => {
                                    setCustomerLocation({
                                        latitude,
                                        longitude,
                                        address,
                                        addressComponents,
                                        error: null
                                    });
                                }}
                                initialLatitude={initialLatitude}
                                initialLongitude={initialLongitude}
                                apiKey="AIzaSyAlsboNdLoq6B6O5oPyPPnpbMT6FIOvPhE"
                                mapId="GoogleMapsAPIKeyForAdmin"
                            />
                        }
                    </View>

                </View>

                {customerLocation.address && (
                    <View className='border-[3px] border-primary p-[10px] rounded-[10px]' >
                        <Text className='font-bold' >Selected Address</Text>
                        <Text>{customerLocation.address}</Text>
                    </View>
                )}

                <TextInputComponent
                    placeholder='Name'
                    value={customerName}
                    onChangeText={setCustomerName}
                    hasError={inputErrors.customerName}
                />

                <TextInputComponent
                    placeholder='Email Id'
                    value={customerEmailId}
                    onChangeText={setCustomerEmailId}
                    keyboardType={'email-address'}
                    hasError={inputErrors.customerEmailId}
                />

                <TextInputComponent
                    placeholder='Flat/House Number'
                    value={customerFlatHouseNumber}
                    onChangeText={setCustomerFlatHouseNumber}
                    hasError={inputErrors.customerFlatHouseNumber}
                />

                <TextInputComponent
                    placeholder='Complex/Building/Area Name'
                    value={customerComplexBuildingAreaName}
                    onChangeText={setCustomerComplexBuildingAreaName}
                    hasError={inputErrors.customerComplexBuildingAreaName}
                />

                <TextInputComponent
                    placeholder='Road/Street Name'
                    value={customerRoadStreetName}
                    onChangeText={setCustomerRoadStreetName}
                    hasError={inputErrors.customerRoadStreetName}
                />

                <TextInputComponent
                    placeholder='Village/Town Name'
                    value={customerVillageTownName}
                    onChangeText={setCustomerVillageTownName}
                    hasError={inputErrors.customerVillageTownName}
                />

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        placeholder='City'
                        value={customerCity}
                        onChangeText={setCustomerCity}
                        width='49%'
                        hasError={inputErrors.customerCity}
                    />
                    <TextInputComponent
                        placeholder='State'
                        value={customerState}
                        onChangeText={setCustomerState}
                        width='49%'
                        hasError={inputErrors.customerState}
                    />
                </View>

                <View className='flex-row items-center justify-between w-full' >
                    <TextInputComponent
                        placeholder='Landmark'
                        value={customerLandmark}
                        onChangeText={setCustomerLandmark}
                        width='49%'
                        hasError={inputErrors.customerLandmark}
                    />
                    <TextInputComponent
                        placeholder='Pincode'
                        value={customerPincode}
                        onChangeText={setCustomerPincode}
                        keyboardType={'number-pad'}
                        maxLength={6}
                        width='49%'
                        hasError={inputErrors.customerPincode}
                    />
                </View>
                {errorMessage && <View className='w-full border-red-400 border-2 rounded-[10px] p-2 bg-red-300' >
                    <Text className='text-[15px] text-white font-semibold text-center'>{errorMessage}</Text>
                </View>}
                <TouchableOpacity className={`${validateBlock2() ? 'bg-primary' : 'bg-[#ccc]'} w-full rounded-[10px] p-3 items-center justify-center`} onPress={handleCompleteRegistration} ><Text className='text-white text-lg font-semibold' >Submit</Text></TouchableOpacity>
            </ScrollView>}

            {errorMessage === 'Mobile number is already registered. Please login.' &&
                <Modal animationType='slide' transparent={true} visible={true}>
                    <View className={"h-screen bg-[#00000080] w-screen items-center justify-center"} >
                        <View className='bg-white h-[40%] w-[95%] rounded-[10px] p-[10px] items-center justify-center gap-[10px]' >
                            <TouchableOpacity
                                onPress={() => setErrorMessage('')}
                                className='absolute top-2 right-2 z-50'
                            >
                                <Image
                                    source={require('../assets/images/crossImage.png')}
                                    style={{ height: 30, width: 30 }}
                                />
                            </TouchableOpacity>
                            <Text className='text-center text-[18px]' ><Text className='font-bold text-[20px] color-primary' >{customerMobileNumber}</Text> is already registered.</Text>
                            <Text className='text-center text-[18px]' >Do you want to login?</Text>

                            <TouchableOpacity onPress={() => {
                                router.push(`/Login/?customerMobileNumber=${customerMobileNumber}`)
                                setErrorMessage('')
                            }} className='w-[80%] rounded-[10px] p-[10px] bg-primary mt-[50px]' ><Text className='text-white text-center text-[18px]' >Yes</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            }

        </View>
    )
}

export default SignUp