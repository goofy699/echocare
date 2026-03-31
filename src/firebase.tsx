import { initializeApp } from "firebase/app";
import { getAuth, inMemoryPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCaYsmYCTB2p55PCvK-IXVGU7Y_w4BhC-M",
    authDomain: "echocare-9c2d8.firebaseapp.com",
    projectId: "echocare-9c2d8",
    storageBucket: "echocare-9c2d8.appspot.com",
    messagingSenderId: "525756841232",
    appId: "1:525756841232:web:5cc764ef30e4811710b995",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const functions = getFunctions(app, "us-central1");
if (import.meta.env.VITE_USE_FUNCTIONS_EMULATOR === "true") {
    connectFunctionsEmulator(functions, "localhost", 5001);
}

// Export Firebase services
export const auth = getAuth(app);
void setPersistence(auth, inMemoryPersistence).catch((error) => {
    console.error("Failed to set auth persistence:", error);
});
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://echocare-9c2d8.appspot.com");
export { app, functions };
