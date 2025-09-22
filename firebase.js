// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAwnyDtmSyiegQSdWO9v95Ai3EhuNMkspI",
    authDomain: "kstech-52469.firebaseapp.com",
    projectId: "kstech-52469",
    storageBucket: "kstech-52469.firebasestorage.app",
    messagingSenderId: "385469798085",
    appId: "1:385469798085:web:3b36051545b42ed5e102ac",
    measurementId: "G-V5E1N60Y7G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, firebaseConfig, auth }