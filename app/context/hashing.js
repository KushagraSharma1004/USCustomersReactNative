import CryptoJS from 'crypto-js';

const SECRET_KEY = 'f3a1d4c7e9b02f4a78e35d9c1406afe3b2c67d8901e2f4a59b3c8e7d6f2a9b0c';

function encryptData(data) {
    const encrypted = CryptoJS.AES.encrypt(data, SECRET_KEY).toString();
    return encodeURIComponent(encrypted); // URL safe
}

function decryptData(data) {
    try {
        const decoded = decodeURIComponent(data); // reverse URL encoding
        const bytes = CryptoJS.AES.decrypt(decoded, SECRET_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error('Decryption error:', e);
        return null;
    }
}

export { encryptData, decryptData }