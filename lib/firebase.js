import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDMm55JX4FKW1x0-o5ovU7mCuOOINr_kIc",
  authDomain: "v-chat-e20fd.firebaseapp.com",
  projectId: "v-chat-e20fd",
  storageBucket: "v-chat-e20fd.firebasestorage.app",
  messagingSenderId: "329554255598",
  appId: "1:329554255598:web:ae0d813699ec5cb3221dff"
};

// Initialize Firebase
let app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
