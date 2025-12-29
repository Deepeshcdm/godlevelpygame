import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import the functions you need from the SDKs you need

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWrQU1Bb5iuF9izBiLATBXXQRds9bNg6o",
  authDomain: "voice-quest-8a194.firebaseapp.com",
  projectId: "voice-quest-8a194",
  storageBucket: "voice-quest-8a194.firebasestorage.app",
  messagingSenderId: "128456021614",
  appId: "1:128456021614:web:cb455ef9ee64394c97387f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
