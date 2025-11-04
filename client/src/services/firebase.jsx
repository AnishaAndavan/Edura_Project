import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // firestore
import { getDatabase } from "firebase/database"; // RTDB

const firebaseConfig = {
  apiKey: "AIzaSyDyZirtzpj7sm2IzVR7Za-mxuNQkjTrgM0",
  authDomain: "edura-2d061.firebaseapp.com",
  databaseURL: "https://edura-2d061-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "edura-2d061",
  storageBucket: "edura-2d061.firebasestorage.app",
  messagingSenderId: "356170807277",
  appId: "1:356170807277:web:563920e9ff55ba7705d9e4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // firestore
export const rtdb = getDatabase(app);
