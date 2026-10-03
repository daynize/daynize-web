import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBb2MTf5I7vPG0GC9FnIEnMoSRSP3b0vJI",
    authDomain: "dayniz.firebaseapp.com",
    projectId: "dayniz",
    storageBucket: "dayniz.firebasestorage.app",
    messagingSenderId: "8643668939",
    appId: "1:8643668939:web:43fe9dcfd80d5425e2a44e",
    measurementId: "G-QPN4BSK34H"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
