import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

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
  PROCESAR_PAGOS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
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
  [ROLES.GESTOR]: 'Puede ver, ingresar, editar y eliminar documentos. No puede procesar pagos.',
  [ROLES.DIGITADOR]: 'Puede ver e ingresar documentos. No puede editar, eliminar ni procesar pagos.',
  [ROLES.VISOR]: 'Solo puede ver documentos y calendario. Sin permisos de modificación.'
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    let unsubscribeUserData = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Suscribirse a cambios en el documento del usuario
        const userDocRef = doc(db, 'usuarios', firebaseUser.email);

        unsubscribeUserData = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
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
      } else {
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

  // Verificar si el usuario tiene un permiso específico
  const tienePermiso = (permiso) => {
    if (!userData || !userData.rol || !userData.activo) return false;
    return PERMISOS[permiso]?.includes(userData.rol) || false;
  };

  // Verificar si el usuario tiene alguno de los permisos indicados
  const tieneAlgunPermiso = (permisos) => {
    return permisos.some(p => tienePermiso(p));
  };

  // Obtener el rol del usuario
  const getRol = () => {
    return userData?.rol || null;
  };

  // Verificar si es super admin
  const esSuperAdmin = () => {
    return userData?.rol === ROLES.SUPER_ADMIN;
  };

  // Verificar si es admin o super admin
  const esAdmin = () => {
    return userData?.rol === ROLES.ADMIN || userData?.rol === ROLES.SUPER_ADMIN;
  };

  // Obtener los roles que el usuario puede asignar
  const getRolesAsignables = () => {
    if (!userData || !userData.activo) return [];

    if (userData.rol === ROLES.SUPER_ADMIN) {
      // Super admin puede asignar todos los roles
      return Object.values(ROLES);
    } else if (userData.rol === ROLES.ADMIN) {
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
