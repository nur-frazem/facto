// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Si necesitas Storage:
// import { getStorage } from "firebase/storage";

// Configuración obtenida desde Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBQearlgbhryxrGXdUT3dGAYYdOaJ6Z9C0",
  authDomain: "facto-b4efd.firebaseapp.com",
  projectId: "facto-b4efd",
  storageBucket: "facto-b4efd.appspot.com",
  messagingSenderId: "407426442010",
  appId: "1:407426442010:web:c293561adc47b4c41b02a3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios que uses
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const storage = getStorage(app);
