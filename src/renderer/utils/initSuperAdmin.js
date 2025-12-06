/**
 * Script para inicializar el usuario Super Admin en Firestore
 *
 * INSTRUCCIONES DE USO:
 *
 * Opción 1 - Desde la consola del navegador (después de iniciar sesión):
 * 1. Inicia la aplicación normalmente
 * 2. Inicia sesión con tu cuenta (francozanetti@live.cl)
 * 3. Abre las herramientas de desarrollo (F12)
 * 4. En la consola, ejecuta:
 *    await window.initSuperAdmin()
 *
 * Opción 2 - Manualmente en Firebase Console:
 * 1. Ve a Firebase Console -> Firestore Database
 * 2. Crea la colección "usuarios" si no existe
 * 3. Añade un documento con ID: francozanetti@live.cl
 * 4. Añade los campos según la estructura de abajo
 */

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";

/**
 * Inicializa el usuario como Super Admin
 * @param {string} email - Email del usuario (por defecto francozanetti@live.cl)
 * @param {string} nombre - Nombre del usuario
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function initSuperAdmin(
  email = "francozanetti@live.cl",
  nombre = "Franco Zanetti"
) {
  try {
    const userDocRef = doc(db, "usuarios", email.toLowerCase());

    // Verificar si ya existe
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      if (existingData.rol === "super_admin") {
        return {
          success: true,
          message: `El usuario ${email} ya es Super Admin`
        };
      }

      // Actualizar a super admin
      await setDoc(userDocRef, {
        ...existingData,
        rol: "super_admin",
        fechaModificacion: serverTimestamp(),
        modificadoPor: "sistema"
      }, { merge: true });

      return {
        success: true,
        message: `Usuario ${email} actualizado a Super Admin`
      };
    }

    // Crear nuevo documento
    await setDoc(userDocRef, {
      email: email.toLowerCase(),
      nombre: nombre,
      rol: "super_admin",
      activo: true,
      fechaCreacion: serverTimestamp(),
      creadoPor: "sistema"
    });

    return {
      success: true,
      message: `Super Admin ${email} creado exitosamente`
    };

  } catch (error) {
    console.error("Error inicializando Super Admin:", error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Verifica si el usuario actual tiene registro en Firestore
 * Si no tiene, muestra instrucciones
 */
export async function checkUserSetup() {
  const user = auth.currentUser;

  if (!user) {
    console.log("No hay usuario autenticado");
    return null;
  }

  try {
    const userDocRef = doc(db, "usuarios", user.email.toLowerCase());
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("Usuario encontrado:", {
        email: data.email,
        nombre: data.nombre,
        rol: data.rol,
        activo: data.activo
      });
      return data;
    } else {
      console.log("Usuario autenticado pero sin registro en Firestore");
      console.log("Email:", user.email);
      console.log("\nPara crear el registro de Super Admin, ejecuta:");
      console.log(`await window.initSuperAdmin("${user.email}", "Tu Nombre")`);
      return null;
    }
  } catch (error) {
    console.error("Error verificando usuario:", error);
    return null;
  }
}

// Exponer funciones globalmente para uso en consola
if (typeof window !== "undefined") {
  window.initSuperAdmin = initSuperAdmin;
  window.checkUserSetup = checkUserSetup;
}

export default { initSuperAdmin, checkUserSetup };
