/**
 * Script para inicializar el usuario Super Admin en Firestore
 *
 * INSTRUCCIONES DE USO:
 *
 * Opción 1 - Desde la consola del navegador (después de iniciar sesión):
 * 1. Inicia la aplicación normalmente
 * 2. Inicia sesión con tu cuenta
 * 3. Abre las herramientas de desarrollo (F12)
 * 4. En la consola, ejecuta:
 *    await window.initSuperAdmin("tu-email@ejemplo.com", "Tu Nombre")
 *
 * Opción 2 - Manualmente en Firebase Console:
 * 1. Ve a Firebase Console -> Firestore Database
 * 2. Crea la colección "usuarios" si no existe
 * 3. Añade un documento con ID igual a tu email
 * 4. Añade los campos según la estructura de abajo
 *
 * SEGURIDAD: No incluir credenciales hardcodeadas en este archivo
 */

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";

// Default company RUT for initial setup
const DEFAULT_COMPANY_RUT = "761836722";

/**
 * Inicializa el usuario como Super Admin
 * @param {string} email - Email del usuario (REQUERIDO)
 * @param {string} nombre - Nombre del usuario (REQUERIDO)
 * @param {string} companyRut - RUT de la empresa (opcional, usa DEFAULT_COMPANY_RUT si no se proporciona)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function initSuperAdmin(email, nombre, companyRut = DEFAULT_COMPANY_RUT) {
  // Validar parámetros requeridos
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return {
      success: false,
      message: "Error: Se requiere un email válido como primer parámetro"
    };
  }

  if (!nombre || typeof nombre !== "string" || nombre.trim().length < 2) {
    return {
      success: false,
      message: "Error: Se requiere un nombre válido como segundo parámetro"
    };
  }
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
      const empresasArray = existingData.empresas || [];
      if (!empresasArray.includes(companyRut)) {
        empresasArray.push(companyRut);
      }
      await setDoc(userDocRef, {
        ...existingData,
        rol: "super_admin",
        empresas: empresasArray,
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
      empresas: [companyRut],
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
    console.warn("No hay usuario autenticado");
    return null;
  }

  try {
    const userDocRef = doc(db, "usuarios", user.email.toLowerCase());
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.warn("Usuario encontrado:", {
        email: data.email,
        nombre: data.nombre,
        rol: data.rol,
        activo: data.activo
      });
      return data;
    } else {
      console.warn("Usuario autenticado pero sin registro en Firestore");
      console.warn("Email:", user.email);
      console.warn("\nPara crear el registro de Super Admin, ejecuta:");
      console.warn(`await window.initSuperAdmin("${user.email}", "Tu Nombre")`);
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
