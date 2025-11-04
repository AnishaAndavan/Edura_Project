// client/src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

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

const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

// ✅ Re-export Firestore helpers explicitly
export { auth, db, rtdb, doc, getDoc, collection, getDocs };
