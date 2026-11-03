import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCbw9nnX98jwifnBuUlA_AjqFShMBJyY9s",
  authDomain: "web-truyen-t714-87b90.firebaseapp.com",
  projectId: "web-truyen-t714-87b90",
  storageBucket: "web-truyen-t714-87b90.firebasestorage.app",
  messagingSenderId: "967271987064",
  appId: "1:967271987064:web:193c889acf22d79536f37f",
  measurementId: "G-ZSD73H1S4Y"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
