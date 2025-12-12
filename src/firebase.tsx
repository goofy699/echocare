import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCaYsmYCTB2p55PCvK-IXVGU7Y_w4BhC-M",
    authDomain: "echocare-9c2d8.firebaseapp.com",
    projectId: "echocare-9c2d8",
    storageBucket: "echocare-9c2d8.firebasestorage.app",
    messagingSenderId: "525756841232",
    appId: "1:525756841232:web:5cc764ef30e4811710b995",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
