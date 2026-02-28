import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBz1mYFXYLUlZCEcKGPxj0xo09RQNLbErw",
  authDomain: "local-helplink.firebaseapp.com",
  projectId: "local-helplink",
  storageBucket: "local-helplink.firebasestorage.app",
  messagingSenderId: "1075835588588",
  appId: "1:1075835588588:web:98cee886e701d75aa2bac9",
  measurementId: "G-ZZJW7BN09R"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
