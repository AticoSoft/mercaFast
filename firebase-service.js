// firebase-service.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ⚠️ REEMPLAZA ESTOS DATOS CON LOS DE TU PROYECTO EN LA CONSOLA DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyA4_pj3gSGh1oSr0nkfW3XGfXNz61oav7Q",
  authDomain: "fastshop-3ace2.firebaseapp.com",
  projectId: "fastshop-3ace2",
  storageBucket: "fastshop-3ace2.firebasestorage.app",
  messagingSenderId: "390258105229",
  appId: "1:390258105229:web:3659f53c092d63f1913bc4",
  measurementId: "G-1B33KW7G3H"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencia fija al documento del mercado (puedes usar un ID fijo para tu lista global)
const docRef = doc(db, "mercado", "lista_principal");

/**
 * Escucha los cambios de la base de datos en tiempo real.
 * Cada vez que algo cambie en Firebase, ejecutará el callback que le pasemos.
 */
export function escucharDatos(alCambiarDatos) {
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            alCambiarDatos(docSnap.data());
        } else {
            // Si la base de datos está vacía por primera vez, mandamos la estructura base
            alCambiarDatos(null);
        }
    });
}

/**
 * Guarda el estado completo de los datos directamente en Firestore.
 */
export async function guardarDatosEnNube(nuevosDatos) {
    try {
        await setDoc(docRef, nuevosDatos);
    } catch (error) {
        console.error("Error al guardar en Firebase: ", error);
    }
}