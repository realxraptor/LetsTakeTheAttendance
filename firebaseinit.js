import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, addDoc, where, deleteDoc }
  from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC2QsiU7Dc8OxNmUqpYlzo4ukaC6Q_7rC0",
    authDomain: "attendancegame.firebaseapp.com",
    projectId: "attendancegame",
    storageBucket: "attendancegame.firebasestorage.app",
    messagingSenderId: "1067777579400",
    appId: "1:1067777579400:web:9253c870df9d100582023d",
    measurementId: "G-8BL3D081CV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Re-export frequently used Firestore helpers so other modules can import them
// Re-export helpers used by other modules so they share the same Firestore instance
export { collection, addDoc, getDocs, query, orderBy, limit, where, deleteDoc, doc };
