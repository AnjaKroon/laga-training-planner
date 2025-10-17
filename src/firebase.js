import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4sn61nJvmF5LH2rHqgcImtPtFlO3jVro",
  authDomain: "laga-training-planner.firebaseapp.com",
  projectId: "laga-training-planner",
  storageBucket: "laga-training-planner.firebasestorage.app",
  messagingSenderId: "327256041233",
  appId: "1:327256041233:web:dd130d5a6a3f6bed71ceb0",
  measurementId: "G-XF2K5REVZE"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Export Firestore instance
export const db = getFirestore(app);