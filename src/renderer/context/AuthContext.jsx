import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

// Key for selected company in localStorage (must match CompanyContext)
const SELECTED_COMPANY_KEY = 'facto_selected_company';

// Definición de roles y sus permisos
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  GESTOR: 'gestor',
  DIGITADOR: 'digitador',
  VISOR: 'visor'
};

// Permisos por rol
export const PERMISOS = {
  // Puede asignar rol de admin
  ASIGNAR_ADMIN: [ROLES.SUPER_ADMIN],
  // Puede asignar otros roles (no admin)
  ASIGNAR_ROLES: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  // Puede ver documentos
  VER_DOCUMENTOS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR, ROLES.DIGITADOR, ROLES.VISOR],
  // Puede ingresar documentos
  INGRESAR_DOCUMENTOS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR, ROLES.DIGITADOR],
  // Puede editar documentos
  EDITAR_DOCUMENTOS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR],
  // Puede eliminar documentos
  ELIMINAR_DOCUMENTOS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR],
  // Puede procesar pagos
  PROCESAR_PAGOS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR],
  // Puede ver calendario
  VER_CALENDARIO: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR, ROLES.DIGITADOR, ROLES.VISOR],
  // Puede ver configuración
  VER_CONFIGURACION: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  // Puede gestionar clientes/proveedores
  GESTIONAR_EMPRESAS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  // Puede ver informes
  VER_INFORMES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.GESTOR],
};

// Etiquetas de roles para mostrar en la UI
export const ROLES_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Administrador',
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.GESTOR]: 'Gestor de Documentos',
  [ROLES.DIGITADOR]: 'Digitador',
  [ROLES.VISOR]: 'Visor'
};

// Descripción de roles
export const ROLES_DESCRIPCION = {
  [ROLES.SUPER_ADMIN]: 'Acceso total al sistema. Puede asignar todos los roles incluyendo administrador.',
  [ROLES.ADMIN]: 'Acceso total a documentos y configuración. Puede asignar roles excepto administrador.',
  [ROLES.GESTOR]: 'Puede ver, ingresar, editar, eliminar y procesar pagos de documentos.',
  [ROLES.DIGITADOR]: 'Puede ver e ingresar documentos. No puede editar, eliminar ni procesar pagos.',
  [ROLES.VISOR]: 'Solo puede ver documentos y calendario. Sin permisos de modificación.'
};

const AuthContext = createContext(null);

// Tiempo máximo de sesión: 8 horas en milisegundos
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const SESSION_START_KEY = 'facto_session_start';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);
  const sessionCheckIntervalRef = useRef(null);

  // Función para verificar si la sesión ha expirado
  const checkSessionExpiration = () => {
    const sessionStart = localStorage.getItem(SESSION_START_KEY);
    if (sessionStart) {
      const elapsed = Date.now() - parseInt(sessionStart, 10);
      if (elapsed >= SESSION_TIMEOUT_MS) {
        console.log('Sesión expirada por timeout de 8 horas');
        localStorage.removeItem(SESSION_START_KEY);
        signOut(auth).catch(err => console.error('Error cerrando sesión:', err));
        return true;
      }
    }
    return false;
  };

  useEffect(() => {
    let unsubscribeUserData = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Verificar si la sesión ha expirado antes de continuar
        if (checkSessionExpiration()) {
          return;
        }

        // Si no hay timestamp de inicio de sesión, establecerlo ahora
        if (!localStorage.getItem(SESSION_START_KEY)) {
          localStorage.setItem(SESSION_START_KEY, Date.now().toString());
        }

        setUser(firebaseUser);
        setLoading(true); // Set loading while we fetch user data from Firestore
        setError(null); // Clear any previous error

        // Suscribirse a cambios en el documento del usuario
        const userDocRef = doc(db, 'usuarios', firebaseUser.email);

        unsubscribeUserData = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();

            // Auto-migration: Check if old structure (empresas as array + global rol)
            if (Array.isArray(data.empresas) && data.rol) {
              console.log('Migrating user to per-company roles structure...');
              try {
                // Convert array to object with roles
                const newEmpresas = {};
                data.empresas.forEach(rut => {
                  newEmpresas[rut] = data.rol;
                });

                // Update Firestore with new structure
                await updateDoc(userDocRef, {
                  empresas: newEmpresas,
                  rol: deleteField()
                });

                // Use migrated data locally
                setUserData({ ...data, empresas: newEmpresas, rol: undefined });
                console.log('User migration completed successfully');
              } catch (migrationError) {
                console.error('Error migrating user structure:', migrationError);
                // Fall back to using old structure if migration fails
                setUserData(data);
              }
            } else {
              setUserData(data);
            }
            setError(null);
          } else {
            // Usuario autenticado pero sin documento en Firestore
            setUserData(null);
            setError('Usuario no tiene permisos asignados en el sistema');
          }
          setLoading(false);
        }, (err) => {
          // Ignorar errores de permisos durante el logout
          if (isLoggingOutRef.current) return;
          console.error('Error obteniendo datos del usuario:', err);
          setError('Error al obtener permisos del usuario');
          setLoading(false);
        });
        // Iniciar verificación periódica de expiración de sesión (cada minuto)
        sessionCheckIntervalRef.current = setInterval(() => {
          checkSessionExpiration();
        }, 60000);
      } else {
        // Limpiar timestamp de sesión al cerrar sesión
        localStorage.removeItem(SESSION_START_KEY);

        // Limpiar intervalo de verificación
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
          sessionCheckIntervalRef.current = null;
        }

        setUser(null);
        setUserData(null);
        setError(null);
        setLoading(false);
        setIsLoggingOut(false);
        isLoggingOutRef.current = false;

        if (unsubscribeUserData) {
          unsubscribeUserData();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserData) {
        unsubscribeUserData();
      }
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
    };
  }, []);

  // Función de logout centralizada que maneja la limpieza correctamente
  const logout = async () => {
    setIsLoggingOut(true);
    isLoggingOutRef.current = true;
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setIsLoggingOut(false);
      isLoggingOutRef.current = false;
      throw err;
    }
  };

  // Helper to get current company RUT from localStorage
  const getCurrentCompanyRUT = () => {
    return localStorage.getItem(SELECTED_COMPANY_KEY);
  };

  // Get role for a specific company (or current company if not specified)
  const getRol = (companyRUT = null) => {
    const rut = companyRUT || getCurrentCompanyRUT();
    if (!userData?.empresas || !rut) return null;

    // Handle both old structure (for backwards compatibility during migration) and new structure
    if (typeof userData.empresas === 'object' && !Array.isArray(userData.empresas)) {
      return userData.empresas[rut] || null;
    }
    // Fallback to old global rol if empresas is still an array
    return userData.rol || null;
  };

  // Verificar si el usuario tiene un permiso específico
  const tienePermiso = (permiso, companyRUT = null) => {
    if (!userData || !userData.activo) return false;
    const rol = getRol(companyRUT);
    if (!rol) return false;
    return PERMISOS[permiso]?.includes(rol) || false;
  };

  // Verificar si el usuario tiene alguno de los permisos indicados
  const tieneAlgunPermiso = (permisos, companyRUT = null) => {
    return permisos.some(p => tienePermiso(p, companyRUT));
  };

  // Verificar si es super admin (for current company)
  const esSuperAdmin = (companyRUT = null) => {
    return getRol(companyRUT) === ROLES.SUPER_ADMIN;
  };

  // Verificar si es admin o super admin (for current company)
  const esAdmin = (companyRUT = null) => {
    const rol = getRol(companyRUT);
    return rol === ROLES.ADMIN || rol === ROLES.SUPER_ADMIN;
  };

  // Obtener los roles que el usuario puede asignar (based on current company role)
  const getRolesAsignables = (companyRUT = null) => {
    if (!userData || !userData.activo) return [];

    const rol = getRol(companyRUT);
    if (rol === ROLES.SUPER_ADMIN) {
      // Super admin puede asignar todos los roles
      return Object.values(ROLES);
    } else if (rol === ROLES.ADMIN) {
      // Admin puede asignar todos excepto admin y super_admin
      return [ROLES.GESTOR, ROLES.DIGITADOR, ROLES.VISOR];
    }
    return [];
  };

  const value = {
    user,
    userData,
    loading,
    error,
    isLoggingOut,
    logout,
    tienePermiso,
    tieneAlgunPermiso,
    getRol,
    esSuperAdmin,
    esAdmin,
    getRolesAsignables,
    ROLES,
    PERMISOS,
    ROLES_LABELS,
    ROLES_DESCRIPCION
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}

export default AuthContext;
