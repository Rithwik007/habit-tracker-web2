import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCtaz9CXsJNm0AH_TspydSa6bOX9nHmuEE",
  authDomain: "habit-tracker-7c785.firebaseapp.com",
  projectId: "habit-tracker-7c785",
  storageBucket: "habit-tracker-7c785.firebasestorage.app",
  messagingSenderId: "1097004099907",
  appId: "1:1097004099907:web:45a8092e5d4e9203b467f6",
  measurementId: "G-SL25D5LQX6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
