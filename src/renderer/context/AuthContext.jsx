import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, deleteField, collection, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { DEFAULT_ROLES, ROLES_LABELS as NEW_ROLES_LABELS } from '../constants/permissions';

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

  // Cache for company roles (keyed by companyRUT)
  const [companyRolesCache, setCompanyRolesCache] = useState({});
  const [rolesLoading, setRolesLoading] = useState(false);

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

  // State to track when company changes for auto-loading roles
  const [currentCompanyForRoles, setCurrentCompanyForRoles] = useState(null);

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

  // ==========================================
  // NEW PERMISSION SYSTEM FUNCTIONS
  // ==========================================

  // Ensure default roles exist in Firestore for a company
  // Also syncs new permissions to existing default roles
  const ensureDefaultRolesExist = useCallback(async (companyRUT) => {
    if (!companyRUT) return;

    try {
      const rolesCollectionRef = collection(db, companyRUT, '_root', 'roles');
      const rolesSnapshot = await getDocs(rolesCollectionRef);

      // If collection is empty, create all default roles
      if (rolesSnapshot.empty) {
        console.log(`Creating default roles for company ${companyRUT}...`);
        const createPromises = Object.entries(DEFAULT_ROLES).map(([roleId, roleData]) => {
          const roleDocRef = doc(db, companyRUT, '_root', 'roles', roleId);
          return setDoc(roleDocRef, {
            ...roleData,
            fechaCreacion: serverTimestamp(),
            creadoPor: 'system',
            fechaModificacion: serverTimestamp(),
            modificadoPor: 'system'
          });
        });
        await Promise.all(createPromises);
        console.log('Default roles created successfully');
      } else {
        // Sync new permissions and colors to existing default roles
        // This ensures that when new permissions are added to the codebase,
        // they get added to the existing default roles in Firestore
        const updatePromises = [];
        rolesSnapshot.forEach((roleDoc) => {
          const roleId = roleDoc.id;
          const existingData = roleDoc.data();
          const defaultRole = DEFAULT_ROLES[roleId];

          // Only update default roles (not custom roles)
          if (defaultRole && existingData.isDefault) {
            const existingPermisos = existingData.permisos || {};
            const defaultPermisos = defaultRole.permisos || {};

            // Find new permissions that don't exist in Firestore yet
            const newPermisos = {};
            let hasNewPermisos = false;
            for (const [key, value] of Object.entries(defaultPermisos)) {
              if (!(key in existingPermisos)) {
                newPermisos[key] = value;
                hasNewPermisos = true;
              }
            }

            // Check if color needs to be updated (sync with DEFAULT_ROLES)
            const colorNeedsUpdate = existingData.color !== defaultRole.color;

            // If there are new permissions or color changed, update the role
            if (hasNewPermisos || colorNeedsUpdate) {
              const updateData = {
                fechaModificacion: serverTimestamp(),
                modificadoPor: 'system'
              };

              if (hasNewPermisos) {
                console.log(`Syncing new permissions to role ${roleId}:`, Object.keys(newPermisos));
                updateData.permisos = { ...existingPermisos, ...newPermisos };
              }

              if (colorNeedsUpdate) {
                console.log(`Syncing color for role ${roleId}: ${existingData.color} -> ${defaultRole.color}`);
                updateData.color = defaultRole.color;
              }

              const roleDocRef = doc(db, companyRUT, '_root', 'roles', roleId);
              updatePromises.push(
                setDoc(roleDocRef, updateData, { merge: true })
              );
            }
          }
        });

        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log('Default roles synced successfully');
        }
      }
    } catch (err) {
      console.error('Error ensuring default roles exist:', err);
    }
  }, []);

  // Load roles for a specific company from Firestore
  const loadCompanyRoles = useCallback(async (companyRUT) => {
    if (!companyRUT) return {};

    // Return cached roles if available
    if (companyRolesCache[companyRUT]) {
      return companyRolesCache[companyRUT];
    }

    setRolesLoading(true);
    try {
      // First ensure default roles exist
      await ensureDefaultRolesExist(companyRUT);

      // Then load all roles
      const rolesCollectionRef = collection(db, companyRUT, '_root', 'roles');
      const rolesSnapshot = await getDocs(rolesCollectionRef);

      const roles = {};
      rolesSnapshot.forEach((doc) => {
        roles[doc.id] = { ...doc.data(), id: doc.id };
      });

      // Cache the roles
      setCompanyRolesCache(prev => ({ ...prev, [companyRUT]: roles }));
      setRolesLoading(false);
      return roles;
    } catch (err) {
      console.error('Error loading company roles:', err);
      setRolesLoading(false);
      // Return default roles as fallback
      return DEFAULT_ROLES;
    }
  }, [companyRolesCache, ensureDefaultRolesExist]);

  // Get full role data for a role ID
  const getRoleData = useCallback((roleId, companyRUT = null) => {
    const rut = companyRUT || getCurrentCompanyRUT();
    if (!rut) return DEFAULT_ROLES[roleId] || null;

    const cachedRoles = companyRolesCache[rut];
    if (cachedRoles && cachedRoles[roleId]) {
      return cachedRoles[roleId];
    }

    // Fallback to default roles
    return DEFAULT_ROLES[roleId] || null;
  }, [companyRolesCache]);

  // Check if user has access permission (view access)
  const tieneAcceso = useCallback((permisoKey, companyRUT = null) => {
    if (!userData || !userData.activo) return false;

    const roleId = getRol(companyRUT);
    if (!roleId) return false;

    const roleData = getRoleData(roleId, companyRUT);
    if (!roleData || !roleData.permisos) {
      // Check if this is a default role - only fall back to old system for default roles
      const isDefaultRole = Object.values(ROLES).includes(roleId);
      if (isDefaultRole) {
        // Fallback to old permission system for backward compatibility with default roles
        return tienePermiso(permisoKey, companyRUT);
      }
      // Custom role but not loaded yet - return false (will re-render when roles load)
      return false;
    }

    return roleData.permisos[permisoKey] === true;
  }, [userData, getRoleData]);

  // Check if user has action permission
  const tieneAccion = useCallback((accionKey, companyRUT = null) => {
    if (!userData || !userData.activo) return false;

    const roleId = getRol(companyRUT);
    if (!roleId) return false;

    const roleData = getRoleData(roleId, companyRUT);
    if (!roleData || !roleData.permisos) {
      // Check if this is a default role - only fall back to old system for default roles
      const isDefaultRole = Object.values(ROLES).includes(roleId);
      if (isDefaultRole) {
        // Fallback to old permission system for backward compatibility
        const oldPermissionMap = {
          'REVISION_VER': 'VER_DOCUMENTOS',
          'REVISION_EDITAR': 'EDITAR_DOCUMENTOS',
          'REVISION_ELIMINAR': 'ELIMINAR_DOCUMENTOS',
          'REVISION_DESCARGAR': 'VER_DOCUMENTOS',
          'PROCESAR_PAGO': 'PROCESAR_PAGOS'
        };
        const oldPermiso = oldPermissionMap[accionKey];
        if (oldPermiso) {
          return tienePermiso(oldPermiso, companyRUT);
        }
      }
      // Custom role but not loaded yet - return false (will re-render when roles load)
      return false;
    }

    return roleData.permisos[accionKey] === true;
  }, [userData, getRoleData]);

  // Get all roles for current company (for role management UI)
  const getCompanyRoles = useCallback((companyRUT = null) => {
    const rut = companyRUT || getCurrentCompanyRUT();
    if (!rut) return DEFAULT_ROLES;
    return companyRolesCache[rut] || DEFAULT_ROLES;
  }, [companyRolesCache]);

  // Invalidate roles cache (call after role updates)
  const invalidateRolesCache = useCallback((companyRUT = null) => {
    const rut = companyRUT || getCurrentCompanyRUT();
    if (rut) {
      setCompanyRolesCache(prev => {
        const updated = { ...prev };
        delete updated[rut];
        return updated;
      });
    }
  }, []);

  // Get roles that can be assigned by the current user (NEW - includes custom roles)
  const getAssignableRoles = useCallback((companyRUT = null) => {
    if (!userData || !userData.activo) return [];

    const rut = companyRUT || getCurrentCompanyRUT();
    const currentRoleId = getRol(companyRUT);
    const allRoles = companyRolesCache[rut] || DEFAULT_ROLES;

    if (currentRoleId === ROLES.SUPER_ADMIN) {
      // Super admin can assign all roles
      return Object.values(allRoles);
    } else if (currentRoleId === ROLES.ADMIN) {
      // Admin can assign all except admin and super_admin
      return Object.values(allRoles).filter(
        role => role.id !== 'super_admin' && role.id !== 'admin'
      );
    }
    return [];
  }, [userData, companyRolesCache]);

  // Watch for company changes and auto-load roles
  useEffect(() => {
    if (!userData || !userData.activo) return;

    let isMounted = true;

    const checkAndLoadRoles = async () => {
      const companyRUT = localStorage.getItem(SELECTED_COMPANY_KEY);
      if (companyRUT && !companyRolesCache[companyRUT]) {
        // Use loadCompanyRoles which handles loading state properly
        try {
          await loadCompanyRoles(companyRUT);
          if (isMounted) {
            setCurrentCompanyForRoles(companyRUT);
          }
        } catch (err) {
          console.error('Error auto-loading roles:', err);
        }
      }
    };

    // Initial check - run immediately
    checkAndLoadRoles();

    // Listen for storage changes (for company selection changes)
    const handleStorageChange = (e) => {
      if (e.key === SELECTED_COMPANY_KEY) {
        // Reset current company tracking to force reload
        if (isMounted) {
          setCurrentCompanyForRoles(null);
        }
        checkAndLoadRoles();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also poll periodically to catch same-tab changes (reduced frequency since loadCompanyRoles checks cache)
    const intervalId = setInterval(checkAndLoadRoles, 250);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [userData, loadCompanyRoles]);

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
    ROLES_DESCRIPCION,
    // New permission system
    tieneAcceso,
    tieneAccion,
    loadCompanyRoles,
    getCompanyRoles,
    getRoleData,
    invalidateRolesCache,
    getAssignableRoles,
    rolesLoading,
    companyRolesCache
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
