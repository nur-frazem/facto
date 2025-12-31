import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { useNavigate } from 'react-router-dom';
import { VolverButton, TextButton } from '../../components/Button';
import { Textfield } from '../../components/Textfield';
import { Card } from '../../components/Container';
import { Modal, LoadingModal, AlertModal } from '../../components/modal';
import { useTheme } from '../../context/ThemeContext';

import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { db } from '../../../firebaseConfig';

import { useAuth, ROLES_LABELS, ROLES_DESCRIPCION } from '../../context/AuthContext';
import { useCompany, formatRut } from '../../context/CompanyContext';
import {
  ROLE_COLORS,
  createEmptyRole,
  getAccessPermissionsList,
  getActionPermissionsGrouped,
} from '../../constants/permissions';

const CRolesUsuarios = () => {
  const navigate = useNavigate();
  const {
    userData,
    esSuperAdmin,
    esAdmin,
    getRolesAsignables,
    ROLES,
    loadCompanyRoles,
    invalidateRolesCache,
  } = useAuth();
  const { isLightTheme } = useTheme();
  const { currentCompanyRUT, companyInfo } = useCompany();

  // Estado de usuarios
  const [usuarios, setUsuarios] = useState([]);
  const [filtroEmail, setFiltroEmail] = useState('');

  // Estados para nuevo usuario
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoRol, setNuevoRol] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');

  // Estados para editar usuario
  const [editEmail, setEditEmail] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editRol, setEditRol] = useState('');
  const [editRolOriginal, setEditRolOriginal] = useState('');
  const [editActivo, setEditActivo] = useState(true);

  // Estados de modales
  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [eliminarModal, setEliminarModal] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);

  // Estados para gestión de roles
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [showRoleEditModal, setShowRoleEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [companyRoles, setCompanyRoles] = useState({});
  const [rolesLoading, setRolesLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [deleteRoleModal, setDeleteRoleModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Load roles on component mount for user assignment
  useEffect(() => {
    const loadRoles = async () => {
      if (currentCompanyRUT) {
        try {
          const roles = await loadCompanyRoles(currentCompanyRUT);
          setCompanyRoles(roles);
        } catch (err) {
          console.error('Error loading roles on mount:', err);
        }
      }
    };
    loadRoles();
  }, [currentCompanyRUT, loadCompanyRoles]);

  // Get all available roles for assignment (combines default + custom)
  const getAvailableRolesForAssignment = () => {
    // If we have loaded company roles, use them
    if (Object.keys(companyRoles).length > 0) {
      return Object.entries(companyRoles).map(([id, role]) => ({
        id,
        label: role.nombre || ROLES_LABELS[id] || id,
        descripcion: role.descripcion || ROLES_DESCRIPCION[id] || '',
        color: role.color,
        isDefault: role.isDefault,
      }));
    }
    // Fallback to static roles
    return Object.entries(ROLES_LABELS).map(([id, label]) => ({
      id,
      label,
      descripcion: ROLES_DESCRIPCION[id] || '',
      color: null,
      isDefault: true,
    }));
  };

  // Helper to get role label for both default and custom roles
  const getRoleLabel = (roleId) => {
    // First check company roles
    if (companyRoles[roleId]) {
      return companyRoles[roleId].nombre || ROLES_LABELS[roleId] || roleId;
    }
    // Fallback to static labels
    return ROLES_LABELS[roleId] || roleId;
  };

  // Estados para modal de información de empresa
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyNombre, setCompanyNombre] = useState('');
  const [companyGiro, setCompanyGiro] = useState('');
  const [companyDireccion, setCompanyDireccion] = useState('');

  // Estados de errores
  const [errors, setErrors] = useState({});
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: '',
    message: '',
    variant: 'error',
  });

  // Límite de administradores
  const LIMITE_ADMINS = 3;

  // Cargar usuarios en tiempo real
  useEffect(() => {
    const usuariosRef = collection(db, 'usuarios');

    const unsubscribe = onSnapshot(
      usuariosRef,
      (snapshot) => {
        const usuariosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsuarios(usuariosData);
      },
      (error) => {
        // Ignorar errores de permisos durante el logout
        if (error.code === 'permission-denied') return;
        console.error('Error obteniendo usuarios:', error);
        setAlertModal({
          open: true,
          title: 'Error',
          message: 'Error al cargar la lista de usuarios',
          variant: 'error',
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper to get user's role for current company
  const getUserRoleForCompany = (usuario) => {
    if (!usuario.empresas || !currentCompanyRUT) return null;
    // Handle both old (array + global rol) and new (object) structure
    if (Array.isArray(usuario.empresas)) {
      return usuario.rol || null;
    }
    return usuario.empresas[currentCompanyRUT] || null;
  };

  // Check if user has access to current company
  const userHasAccessToCurrentCompany = (usuario) => {
    if (!usuario.empresas || !currentCompanyRUT) return false;
    if (Array.isArray(usuario.empresas)) {
      return usuario.empresas.includes(currentCompanyRUT);
    }
    return currentCompanyRUT in usuario.empresas;
  };

  // Filter users to only those with access to current company
  const usuariosDeEmpresa = usuarios.filter(userHasAccessToCurrentCompany);

  // Contar administradores actuales (for current company only)
  const cantidadAdmins = usuariosDeEmpresa.filter(
    (u) => getUserRoleForCompany(u) === ROLES.ADMIN
  ).length;

  // Validar email
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Crear nuevo usuario
  const handleNuevoUsuario = async () => {
    const newErrors = {};

    if (!nuevoEmail) newErrors.email = 'Requerido';
    else if (!validarEmail(nuevoEmail)) newErrors.email = 'Email inválido';

    if (!nuevoNombre) newErrors.nombre = 'Requerido';
    if (!nuevoRol) newErrors.rol = 'Requerido';
    if (!nuevoPassword) newErrors.password = 'Requerido';
    else if (nuevoPassword.length < 7) newErrors.password = 'Mínimo 7 caracteres';
    else if (!/[A-Z]/.test(nuevoPassword))
      newErrors.password = 'Debe incluir al menos una mayúscula';
    else if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(nuevoPassword))
      newErrors.password = 'Debe incluir al menos un número o símbolo';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      let secondaryApp = null;

      try {
        setLoadingModal(true);

        // Verificar si el email ya existe en Firestore
        const userDocRef = doc(db, 'usuarios', nuevoEmail.toLowerCase());
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const existingUserData = docSnap.data();
          const existingEmpresas = existingUserData.empresas || {};

          // Check if user already has access to current company
          const alreadyHasAccess =
            typeof existingEmpresas === 'object' && !Array.isArray(existingEmpresas)
              ? currentCompanyRUT in existingEmpresas
              : Array.isArray(existingEmpresas) && existingEmpresas.includes(currentCompanyRUT);

          if (alreadyHasAccess) {
            setLoadingModal(false);
            setAlertModal({
              open: true,
              title: 'Error',
              message: 'Este usuario ya tiene acceso a esta empresa',
              variant: 'error',
            });
            return;
          }

          // User exists but doesn't have access to current company - add them
          const updatedEmpresas =
            typeof existingEmpresas === 'object' && !Array.isArray(existingEmpresas)
              ? { ...existingEmpresas, [currentCompanyRUT]: nuevoRol }
              : { [currentCompanyRUT]: nuevoRol }; // Convert from old array structure

          await setDoc(
            userDocRef,
            {
              empresas: updatedEmpresas,
              fechaModificacion: serverTimestamp(),
              modificadoPor: userData?.email || 'sistema',
            },
            { merge: true }
          );

          setLoadingModal(false);
          setShowModal(false);
          handleResetNuevo();

          setAlertModal({
            open: true,
            title: 'Usuario agregado',
            message: `El usuario ${nuevoEmail} ya existía y ha sido agregado a esta empresa con rol ${getRoleLabel(nuevoRol)}.`,
            variant: 'success',
          });
          return;
        }

        // User doesn't exist - create new user in Auth and Firestore
        // Crear una instancia secundaria de Firebase para crear el usuario
        // sin afectar la sesión actual
        const firebaseConfig = {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        };

        secondaryApp = initializeApp(firebaseConfig, 'secondaryApp');
        const secondaryAuth = getAuth(secondaryApp);

        // Crear usuario en Firebase Auth usando la app secundaria
        await createUserWithEmailAndPassword(
          secondaryAuth,
          nuevoEmail.toLowerCase(),
          nuevoPassword
        );

        // Cerrar sesión en la app secundaria y eliminarla
        await secondaryAuth.signOut();
        await deleteApp(secondaryApp);
        secondaryApp = null;

        // Crear documento en Firestore (new per-company role structure)
        await setDoc(userDocRef, {
          email: nuevoEmail.toLowerCase(),
          nombre: nuevoNombre,
          activo: true,
          empresas: { [currentCompanyRUT]: nuevoRol }, // Role is per-company
          fechaCreacion: serverTimestamp(),
          creadoPor: userData?.email || 'sistema',
        });

        setLoadingModal(false);
        setShowModal(false);
        handleResetNuevo();

        setAlertModal({
          open: true,
          title: 'Usuario creado',
          message: `El usuario ${nuevoEmail} ha sido creado exitosamente`,
          variant: 'success',
        });
      } catch (err) {
        // Limpiar la app secundaria si existe
        if (secondaryApp) {
          try {
            await deleteApp(secondaryApp);
          } catch {
            // Silent cleanup
          }
        }

        // Special case: Auth user exists but Firestore doc doesn't (user was previously deleted from Firestore)
        // In this case, just create the Firestore document to re-associate the user
        // This is expected behavior, not an error
        if (err.code === 'auth/email-already-in-use') {
          try {
            const userDocRef = doc(db, 'usuarios', nuevoEmail.toLowerCase());
            await setDoc(userDocRef, {
              email: nuevoEmail.toLowerCase(),
              nombre: nuevoNombre,
              activo: true,
              empresas: { [currentCompanyRUT]: nuevoRol },
              fechaCreacion: serverTimestamp(),
              creadoPor: userData?.email || 'sistema',
              reactivado: true, // Flag to indicate this user was re-associated
            });

            setLoadingModal(false);
            setShowModal(false);
            handleResetNuevo();

            setAlertModal({
              open: true,
              title: 'Usuario reasociado',
              message: `El usuario ${nuevoEmail} ya existía en el sistema y ha sido reasociado. La contraseña anterior sigue vigente (puede usar "¿Olvidaste tu contraseña?" si no la recuerda).`,
              variant: 'success',
            });
            return;
          } catch (firestoreErr) {
            console.error('Error creando documento Firestore:', firestoreErr);
            setLoadingModal(false);
            setAlertModal({
              open: true,
              title: 'Error',
              message: 'El email existe en Auth pero no se pudo crear el documento en Firestore',
              variant: 'error',
            });
            return;
          }
        }

        // Log unexpected errors (not the handled auth/email-already-in-use case)
        console.error('Error creando usuario:', err);
        setLoadingModal(false);

        let errorMsg = 'Error al crear el usuario';
        if (err.code === 'auth/invalid-email') {
          errorMsg = 'El email no es válido';
        } else if (err.code === 'auth/weak-password') {
          errorMsg = 'La contraseña es muy débil';
        }

        setAlertModal({
          open: true,
          title: 'Error',
          message: errorMsg,
          variant: 'error',
        });
      }
    }
  };

  // Editar usuario
  const handleEditarUsuario = async () => {
    const newErrors = {};

    if (!editNombre) newErrors.nombre = 'Requerido';
    if (!editRol) newErrors.rol = 'Requerido';

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      try {
        setLoadingModal(true);

        const userDocRef = doc(db, 'usuarios', editEmail);

        // Get current user data to preserve other company roles
        const userSnap = await getDoc(userDocRef);
        const existingData = userSnap.exists() ? userSnap.data() : {};
        const existingEmpresas = existingData.empresas || {};

        // Update role for current company while preserving other companies
        const updatedEmpresas =
          typeof existingEmpresas === 'object' && !Array.isArray(existingEmpresas)
            ? { ...existingEmpresas, [currentCompanyRUT]: editRol }
            : { [currentCompanyRUT]: editRol }; // If old structure, start fresh with new structure

        await setDoc(
          userDocRef,
          {
            email: editEmail,
            nombre: editNombre,
            empresas: updatedEmpresas,
            activo: editActivo,
            fechaModificacion: serverTimestamp(),
            modificadoPor: userData?.email || 'sistema',
          },
          { merge: true }
        );

        setLoadingModal(false);
        setEditModal(false);
        handleResetEdit();

        setAlertModal({
          open: true,
          title: 'Usuario actualizado',
          message: `El usuario ${editEmail} ha sido actualizado`,
          variant: 'success',
        });
      } catch (err) {
        console.error('Error actualizando usuario:', err);
        setLoadingModal(false);
        setAlertModal({
          open: true,
          title: 'Error',
          message: 'Error al actualizar el usuario',
          variant: 'error',
        });
      }
    }
  };

  // Eliminar usuario de la empresa actual (o completamente si es su única empresa)
  const handleEliminarUsuario = async () => {
    try {
      setLoadingModal(true);

      const userDocRef = doc(db, 'usuarios', editEmail);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        setLoadingModal(false);
        setAlertModal({
          open: true,
          title: 'Error',
          message: 'El usuario no existe',
          variant: 'error',
        });
        return;
      }

      const userData = userSnap.data();
      const empresas = userData.empresas || {};

      // Check how many companies the user has access to
      const companyCount =
        typeof empresas === 'object' && !Array.isArray(empresas)
          ? Object.keys(empresas).length
          : Array.isArray(empresas)
            ? empresas.length
            : 0;

      if (companyCount <= 1) {
        // User only has access to this company - delete entirely
        await deleteDoc(userDocRef);

        setLoadingModal(false);
        setEliminarModal(false);
        setEditModal(false);
        handleResetEdit();

        setAlertModal({
          open: true,
          title: 'Usuario eliminado',
          message:
            'Usuario eliminado de Facto. Recuerde eliminar también de Firebase Console > Authentication para liberar el email.',
          variant: 'success',
        });
      } else {
        // User has access to multiple companies - only remove from current company
        const updatedEmpresas = { ...empresas };
        delete updatedEmpresas[currentCompanyRUT];

        await setDoc(
          userDocRef,
          {
            empresas: updatedEmpresas,
            fechaModificacion: serverTimestamp(),
            modificadoPor: userData?.email || 'sistema',
          },
          { merge: true }
        );

        setLoadingModal(false);
        setEliminarModal(false);
        setEditModal(false);
        handleResetEdit();

        setAlertModal({
          open: true,
          title: 'Usuario removido',
          message: `El usuario ${editEmail} ha sido removido de esta empresa. Aún tiene acceso a otras ${companyCount - 1} empresa(s).`,
          variant: 'success',
        });
      }
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      setLoadingModal(false);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al eliminar el usuario',
        variant: 'error',
      });
    }
  };

  // Reset estados
  const handleResetNuevo = () => {
    setNuevoEmail('');
    setNuevoNombre('');
    setNuevoRol('');
    setNuevoPassword('');
    setErrors({});
  };

  const handleResetEdit = () => {
    setEditEmail('');
    setEditNombre('');
    setEditRol('');
    setEditActivo(true);
    setErrors({});
  };

  // Abrir modal de información de empresa
  const handleOpenCompanyModal = () => {
    setCompanyNombre(companyInfo?.nombre || '');
    setCompanyGiro(companyInfo?.giro || '');
    setCompanyDireccion(companyInfo?.direccion || '');
    setShowCompanyModal(true);
  };

  // Guardar información de empresa
  const handleSaveCompanyInfo = async () => {
    try {
      setLoadingModal(true);
      const companyDocRef = doc(db, currentCompanyRUT, '_root');
      await setDoc(
        companyDocRef,
        {
          nombre: companyNombre,
          giro: companyGiro,
          direccion: companyDireccion,
        },
        { merge: true }
      );

      setLoadingModal(false);
      setShowCompanyModal(false);
      setAlertModal({
        open: true,
        title: 'Información actualizada',
        message: 'La información de la empresa ha sido actualizada',
        variant: 'success',
      });
    } catch (err) {
      console.error('Error actualizando empresa:', err);
      setLoadingModal(false);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al actualizar la información de la empresa',
        variant: 'error',
      });
    }
  };

  // Abrir modal de edición
  const handleOpenEdit = (usuario) => {
    const rolEnEmpresa = getUserRoleForCompany(usuario);
    setEditEmail(usuario.email);
    setEditNombre(usuario.nombre || '');
    setEditRol(rolEnEmpresa || '');
    setEditRolOriginal(rolEnEmpresa || '');
    setEditActivo(usuario.activo !== false);
    setEditModal(true);
  };

  // Check if user has access to multiple companies (for delete confirmation message)
  const getUserCompanyCount = (usuario) => {
    if (!usuario.empresas) return 0;
    if (typeof usuario.empresas === 'object' && !Array.isArray(usuario.empresas)) {
      return Object.keys(usuario.empresas).length;
    }
    return Array.isArray(usuario.empresas) ? usuario.empresas.length : 0;
  };

  // Get count for user being edited
  const editUserCompanyCount = usuarios.find((u) => u.email === editEmail)
    ? getUserCompanyCount(usuarios.find((u) => u.email === editEmail))
    : 0;

  // Verificar si puede editar un usuario
  const puedeEditarUsuario = (usuario) => {
    // No puede editarse a sí mismo (para evitar problemas)
    if (usuario.email === userData?.email) return false;

    // Get target user's role for current company
    const targetRol = getUserRoleForCompany(usuario);

    // Super admin puede editar todos
    if (esSuperAdmin()) return true;

    // Admin no puede editar super admins ni otros admins
    if (esAdmin() && (targetRol === ROLES.SUPER_ADMIN || targetRol === ROLES.ADMIN)) return false;

    // Admin puede editar otros roles
    if (esAdmin()) return true;

    return false;
  };

  // Verificar si puede asignar un rol específico
  const puedeAsignarRol = (rol, esEdicion = false, rolActual = null) => {
    const rolesAsignables = getRolesAsignables();

    // Check if it's a default role that the user can assign
    const isAssignableDefaultRole = rolesAsignables.includes(rol);

    // Check if it's a custom role (exists in companyRoles and is not a default role)
    const customRole = companyRoles[rol];
    const isCustomRole = customRole && !customRole.isDefault;

    // Must be either an assignable default role or a custom role (and user must be admin)
    if (!isAssignableDefaultRole && !isCustomRole) return false;

    // Custom roles can be assigned by any admin
    if (isCustomRole && !esAdmin()) return false;

    // Si es rol admin, verificar límite
    if (rol === ROLES.ADMIN) {
      // Si estamos editando y el usuario ya era admin, permitir
      if (esEdicion && rolActual === ROLES.ADMIN) return true;
      // Si ya se alcanzó el límite, no permitir
      if (cantidadAdmins >= LIMITE_ADMINS) return false;
    }

    return true;
  };

  // Verificar si el límite de admins está alcanzado
  const limiteAdminsAlcanzado = cantidadAdmins >= LIMITE_ADMINS;

  // Filtrar usuarios (from users with access to current company)
  const usuariosFiltrados = usuariosDeEmpresa.filter(
    (u) =>
      u.email?.toLowerCase().includes(filtroEmail.toLowerCase()) ||
      u.nombre?.toLowerCase().includes(filtroEmail.toLowerCase())
  );

  // Obtener color de badge según rol
  const getRolBadgeColor = (rol) => {
    // First check if we have a custom role with a color in companyRoles
    const customRole = companyRoles[rol];
    if (customRole?.color) {
      // Return custom style with the role's color
      return `border-2`;
    }

    if (isLightTheme) {
      switch (rol) {
        case ROLES.SUPER_ADMIN:
          return 'bg-purple-100 text-purple-700 border-purple-300';
        case ROLES.ADMIN:
          return 'bg-blue-100 text-blue-700 border-blue-300';
        case ROLES.GESTOR:
          return 'bg-green-100 text-green-700 border-green-300';
        case ROLES.DIGITADOR:
          return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case ROLES.VISOR:
          return 'bg-gray-100 text-gray-600 border-gray-300';
        default:
          return 'bg-gray-100 text-gray-600 border-gray-300';
      }
    }
    switch (rol) {
      case ROLES.SUPER_ADMIN:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case ROLES.ADMIN:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case ROLES.GESTOR:
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case ROLES.DIGITADOR:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case ROLES.VISOR:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // ==========================================
  // ROLE MANAGEMENT FUNCTIONS
  // ==========================================

  // Load roles when opening the roles modal
  const handleOpenRolesModal = async () => {
    setRolesLoading(true);
    setShowRolesModal(true);
    try {
      const roles = await loadCompanyRoles(currentCompanyRUT);
      setCompanyRoles(roles);
    } catch (err) {
      console.error('Error loading roles:', err);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al cargar los roles',
        variant: 'error',
      });
    } finally {
      setRolesLoading(false);
    }
  };

  // Open role edit modal for new role
  const handleNewRole = () => {
    const newRole = createEmptyRole();
    setEditingRole(newRole);
    setExpandedSections({});
    setShowRoleEditModal(true);
  };

  // Open role edit modal for existing role
  const handleEditRole = (role) => {
    setEditingRole({ ...role });
    setExpandedSections({});
    setShowRoleEditModal(true);
  };

  // Toggle permission in editing role
  const togglePermission = (permKey) => {
    if (!editingRole) return;
    setEditingRole((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [permKey]: !prev.permisos[permKey],
      },
    }));
  };

  // Toggle all children permissions when parent is toggled
  const toggleParentPermission = (parentKey, children) => {
    if (!editingRole) return;
    const allChildrenChecked = children.every((c) => editingRole.permisos[c.key]);
    const newValue = !allChildrenChecked;

    const newPermisos = { ...editingRole.permisos, [parentKey]: newValue };
    children.forEach((c) => {
      newPermisos[c.key] = newValue;
    });

    setEditingRole((prev) => ({
      ...prev,
      permisos: newPermisos,
    }));
  };

  // Check if parent is indeterminate (some children checked)
  const isParentIndeterminate = (children) => {
    if (!editingRole) return false;
    const checkedCount = children.filter((c) => editingRole.permisos[c.key]).length;
    return checkedCount > 0 && checkedCount < children.length;
  };

  // Check if all children are checked
  const areAllChildrenChecked = (children) => {
    if (!editingRole) return false;
    return children.every((c) => editingRole.permisos[c.key]);
  };

  // Toggle expanded section
  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Save role
  const handleSaveRole = async () => {
    if (!editingRole) return;

    // Validate
    if (!editingRole.nombre?.trim()) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'El nombre del rol es requerido',
        variant: 'error',
      });
      return;
    }

    setLoadingModal(true);
    try {
      const roleId = editingRole.id || generateSlug(editingRole.nombre);

      // Check if role ID already exists (for new roles)
      if (!editingRole.id && companyRoles[roleId]) {
        setLoadingModal(false);
        setAlertModal({
          open: true,
          title: 'Error',
          message: 'Ya existe un rol con ese nombre',
          variant: 'error',
        });
        return;
      }

      const roleDocRef = doc(db, currentCompanyRUT, '_root', 'roles', roleId);
      const roleData = {
        id: roleId,
        nombre: editingRole.nombre,
        descripcion: editingRole.descripcion || '',
        color: editingRole.color,
        isDefault: editingRole.isDefault || false,
        permisos: editingRole.permisos,
        fechaModificacion: serverTimestamp(),
        modificadoPor: userData?.email || 'sistema',
      };

      if (!editingRole.id) {
        // New role
        roleData.fechaCreacion = serverTimestamp();
        roleData.creadoPor = userData?.email || 'sistema';
      }

      await setDoc(roleDocRef, roleData, { merge: true });

      // Invalidate cache and reload
      invalidateRolesCache(currentCompanyRUT);
      const roles = await loadCompanyRoles(currentCompanyRUT);
      setCompanyRoles(roles);

      setLoadingModal(false);
      setShowRoleEditModal(false);
      setEditingRole(null);

      setAlertModal({
        open: true,
        title: editingRole.id ? 'Rol actualizado' : 'Rol creado',
        message: `El rol "${editingRole.nombre}" ha sido ${editingRole.id ? 'actualizado' : 'creado'} exitosamente`,
        variant: 'success',
      });
    } catch (err) {
      console.error('Error saving role:', err);
      setLoadingModal(false);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al guardar el rol',
        variant: 'error',
      });
    }
  };

  // Delete role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return;

    setLoadingModal(true);
    try {
      // Check if any users have this role
      const usersWithRole = usuariosDeEmpresa.filter(
        (u) => getUserRoleForCompany(u) === roleToDelete.id
      );
      if (usersWithRole.length > 0) {
        setLoadingModal(false);
        setDeleteRoleModal(false);
        setAlertModal({
          open: true,
          title: 'No se puede eliminar',
          message: `Hay ${usersWithRole.length} usuario(s) con este rol asignado. Cambie su rol antes de eliminar.`,
          variant: 'error',
        });
        return;
      }

      const roleDocRef = doc(db, currentCompanyRUT, '_root', 'roles', roleToDelete.id);
      await deleteDoc(roleDocRef);

      // Invalidate cache and reload
      invalidateRolesCache(currentCompanyRUT);
      const roles = await loadCompanyRoles(currentCompanyRUT);
      setCompanyRoles(roles);

      setLoadingModal(false);
      setDeleteRoleModal(false);
      setRoleToDelete(null);

      setAlertModal({
        open: true,
        title: 'Rol eliminado',
        message: `El rol "${roleToDelete.nombre}" ha sido eliminado`,
        variant: 'success',
      });
    } catch (err) {
      console.error('Error deleting role:', err);
      setLoadingModal(false);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al eliminar el rol',
        variant: 'error',
      });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <SidebarWithContentSeparator className="h-full" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-visible">
        {/* Título */}
        <div className="p-4 relative flex items-center justify-center flex-shrink-0">
          <div className="absolute left-5">
            <VolverButton onClick={() => navigate('/configuracion-index')} />
          </div>
          <H1Tittle text="Gestión de Usuarios y Roles" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col flex-wrap justify-start px-3 sm:px-5 py-4 overflow-x-auto">
          {/* Barra de acciones */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <Textfield
              placeholder="Buscar por email o nombre..."
              classNameInput="w-72"
              value={filtroEmail}
              onChange={(e) => setFiltroEmail(e.target.value)}
            />
            <div className="flex gap-3">
              {esAdmin() && (
                <TextButton
                  text="Información empresa"
                  className="h-10 px-5 bg-accent-blue hover:bg-blue-600 active:bg-blue-700 transition-colors duration-200 rounded-lg whitespace-nowrap"
                  classNameText="font-semibold text-base text-white"
                  onClick={handleOpenCompanyModal}
                />
              )}
              {esAdmin() && (
                <TextButton
                  text="Editar roles"
                  className="h-10 px-5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 transition-colors duration-200 rounded-lg whitespace-nowrap"
                  classNameText="font-semibold text-base text-white"
                  onClick={handleOpenRolesModal}
                />
              )}
              <TextButton
                text="Nuevo Usuario"
                className="h-10 px-5 bg-success hover:bg-success-hover active:bg-success-active transition-colors duration-200 rounded-lg whitespace-nowrap"
                classNameText="font-semibold text-base text-white"
                onClick={() => setShowModal(true)}
              />
            </div>
          </div>

          {/* Leyenda de roles */}
          <div className="flex flex-wrap gap-2 mb-4">
            {getAvailableRolesForAssignment().map((role) => (
              <div
                key={role.id}
                className={`px-3 py-1 text-xs font-medium rounded-full border ${role.color ? '' : getRolBadgeColor(role.id)}`}
                style={
                  role.color
                    ? {
                        backgroundColor: `${role.color}20`,
                        color: role.color,
                        borderColor: `${role.color}50`,
                      }
                    : undefined
                }
                title={role.descripcion}
              >
                {role.label}
              </div>
            ))}
          </div>

          {/* Tabla de usuarios */}
          <Card
            hasButton={false}
            contentClassName="h-[calc(100vh-320px)] overflow-y-auto scrollbar-custom flex flex-col w-full"
            content={
              <div>
                {/* Encabezados */}
                <div
                  className={`flex font-semibold text-sm mb-3 px-2 py-2 rounded-lg sticky top-0 ${
                    isLightTheme ? 'bg-gray-50 text-gray-600' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="w-[25%] text-center">Email</div>
                  <div className="w-[20%] text-center">Nombre</div>
                  <div className="w-[20%] text-center">Rol</div>
                  <div className="w-[12%] text-center">Estado</div>
                  <div className="w-[12%] text-center">Acciones</div>
                </div>

                {/* Filas de usuarios */}
                {usuariosFiltrados.map((usuario) => (
                  <div
                    key={usuario.id}
                    className={`flex items-center mb-1 px-2 py-3 rounded-lg transition-colors border-b last:border-b-0 ${
                      isLightTheme
                        ? 'hover:bg-gray-50 border-gray-100'
                        : 'hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="w-[25%] text-center text-sm font-medium truncate px-1">
                      {usuario.email}
                      {usuario.email === userData?.email && (
                        <span className="ml-2 text-xs text-accent-blue">(Tú)</span>
                      )}
                    </div>
                    <div className="w-[20%] text-center text-sm truncate px-1">
                      {usuario.nombre || '-'}
                    </div>
                    <div className="w-[20%] flex justify-center">
                      {(() => {
                        const userRole = getUserRoleForCompany(usuario);
                        const customRole = companyRoles[userRole];
                        const hasCustomColor = customRole?.color;
                        return (
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full border ${hasCustomColor ? '' : getRolBadgeColor(userRole)}`}
                            style={
                              hasCustomColor
                                ? {
                                    backgroundColor: `${customRole.color}20`,
                                    color: customRole.color,
                                    borderColor: `${customRole.color}50`,
                                  }
                                : undefined
                            }
                          >
                            {getRoleLabel(userRole) || 'Sin rol'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="w-[12%] flex justify-center">
                      {usuario.activo !== false ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20">
                          <svg
                            className="w-4 h-4 text-success"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-danger/20">
                          <svg
                            className="w-4 h-4 text-danger"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="w-[12%] flex justify-center">
                      {puedeEditarUsuario(usuario) ? (
                        <TextButton
                          className="py-1.5 px-4 h-8 bg-accent-blue text-white font-medium hover:bg-blue-600 active:bg-blue-700 rounded-md"
                          text="Editar"
                          onClick={() => handleOpenEdit(usuario)}
                        />
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Sin usuarios */}
                {usuariosFiltrados.length === 0 && (
                  <div className="text-center text-gray-400 mt-8 py-8">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                      />
                    </svg>
                    {filtroEmail
                      ? 'No se encontraron usuarios con ese criterio'
                      : 'No hay usuarios registrados'}
                  </div>
                )}
              </div>
            }
          />

          {/* Modal nuevo usuario */}
          {showModal && (
            <Modal
              onClickOutside={() => {
                setShowModal(false);
                handleResetNuevo();
              }}
              className="!absolute !top-20 !max-w-lg"
            >
              <h2 className="text-xl font-bold text-center mb-6">Nuevo Usuario</h2>

              <div className="space-y-4">
                <Textfield
                  label={
                    <>
                      Email:
                      {errors.email && (
                        <span className="text-red-300 font-black"> - {errors.email}</span>
                      )}
                    </>
                  }
                  classNameInput={errors.email && 'ring-red-400 ring-2'}
                  placeholder="usuario@ejemplo.com"
                  type="email"
                  value={nuevoEmail}
                  onChange={(e) => {
                    setNuevoEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                />

                <Textfield
                  label={
                    <>
                      Nombre:
                      {errors.nombre && (
                        <span className="text-red-300 font-black"> - {errors.nombre}</span>
                      )}
                    </>
                  }
                  classNameInput={errors.nombre && 'ring-red-400 ring-2'}
                  placeholder="Nombre completo"
                  value={nuevoNombre}
                  onChange={(e) => {
                    setNuevoNombre(e.target.value);
                    setErrors((prev) => ({ ...prev, nombre: undefined }));
                  }}
                />

                <Textfield
                  label={
                    <>
                      Contraseña temporal:
                      {errors.password && (
                        <span className="text-red-300 font-black"> - {errors.password}</span>
                      )}
                    </>
                  }
                  classNameInput={errors.password && 'ring-red-400 ring-2'}
                  placeholder="Mínimo 7 caracteres"
                  type="password"
                  value={nuevoPassword}
                  onChange={(e) => {
                    setNuevoPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                  >
                    Rol:
                    {errors.rol && <span className="text-red-500 font-black"> - {errors.rol}</span>}
                  </label>
                  {limiteAdminsAlcanzado && esSuperAdmin() && (
                    <p
                      className={`text-xs mb-2 ${isLightTheme ? 'text-yellow-600' : 'text-yellow-400'}`}
                    >
                      Límite de administradores alcanzado ({cantidadAdmins}/{LIMITE_ADMINS})
                    </p>
                  )}
                  <div className="space-y-2">
                    {getAvailableRolesForAssignment().map((role) => {
                      const puedeAsignar = puedeAsignarRol(role.id, false, null);
                      const esAdminLimitado = role.id === ROLES.ADMIN && limiteAdminsAlcanzado;
                      return (
                        <label
                          key={role.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            nuevoRol === role.id
                              ? 'border-accent-blue bg-accent-blue/10'
                              : puedeAsignar
                                ? isLightTheme
                                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                : isLightTheme
                                  ? 'border-gray-100 opacity-40 cursor-not-allowed'
                                  : 'border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="radio"
                            name="nuevoRol"
                            value={role.id}
                            checked={nuevoRol === role.id}
                            disabled={!puedeAsignar}
                            onChange={(e) => {
                              setNuevoRol(e.target.value);
                              setErrors((prev) => ({ ...prev, rol: undefined }));
                            }}
                            className="mt-1 accent-accent-blue"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {role.color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: role.color }}
                                />
                              )}
                              <span
                                className={`font-medium ${role.color ? '' : getRolBadgeColor(role.id)} px-2 py-0.5 rounded text-sm`}
                                style={
                                  role.color
                                    ? {
                                        backgroundColor: `${role.color}20`,
                                        color: role.color,
                                      }
                                    : undefined
                                }
                              >
                                {role.label}
                              </span>
                              {!role.isDefault && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${isLightTheme ? 'bg-purple-100 text-purple-600' : 'bg-purple-500/20 text-purple-300'}`}
                                >
                                  Personalizado
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                            >
                              {role.descripcion}
                              {esAdminLimitado && ' (Límite alcanzado)'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
              >
                <TextButton
                  text="Cancelar"
                  className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                  onClick={() => {
                    setShowModal(false);
                    handleResetNuevo();
                  }}
                />
                <TextButton
                  text="Crear Usuario"
                  className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                  onClick={handleNuevoUsuario}
                />
              </div>
            </Modal>
          )}

          {/* Modal editar usuario */}
          {editModal && (
            <Modal
              onClickOutside={() => {
                setEditModal(false);
                handleResetEdit();
              }}
              className="!absolute !top-20 !max-w-lg"
            >
              <h2 className="text-xl font-bold text-center mb-6">Editar Usuario</h2>

              <div className="space-y-4">
                <Textfield
                  label="Email:"
                  value={editEmail}
                  disabled={true}
                  classNameInput="opacity-60 cursor-not-allowed"
                />

                <Textfield
                  label={
                    <>
                      Nombre:
                      {errors.nombre && (
                        <span className="text-red-300 font-black"> - {errors.nombre}</span>
                      )}
                    </>
                  }
                  classNameInput={errors.nombre && 'ring-red-400 ring-2'}
                  placeholder="Nombre completo"
                  value={editNombre}
                  onChange={(e) => {
                    setEditNombre(e.target.value);
                    setErrors((prev) => ({ ...prev, nombre: undefined }));
                  }}
                />

                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                  >
                    Rol:
                    {errors.rol && <span className="text-red-500 font-black"> - {errors.rol}</span>}
                  </label>
                  {limiteAdminsAlcanzado && esSuperAdmin() && editRolOriginal !== ROLES.ADMIN && (
                    <p
                      className={`text-xs mb-2 ${isLightTheme ? 'text-yellow-600' : 'text-yellow-400'}`}
                    >
                      Límite de administradores alcanzado ({cantidadAdmins}/{LIMITE_ADMINS})
                    </p>
                  )}
                  <div className="space-y-2">
                    {getAvailableRolesForAssignment().map((role) => {
                      const puedeAsignar = puedeAsignarRol(role.id, true, editRolOriginal);
                      const esAdminLimitado =
                        role.id === ROLES.ADMIN &&
                        limiteAdminsAlcanzado &&
                        editRolOriginal !== ROLES.ADMIN;
                      return (
                        <label
                          key={role.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            editRol === role.id
                              ? 'border-accent-blue bg-accent-blue/10'
                              : puedeAsignar
                                ? isLightTheme
                                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                : isLightTheme
                                  ? 'border-gray-100 opacity-40 cursor-not-allowed'
                                  : 'border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="radio"
                            name="editRol"
                            value={role.id}
                            checked={editRol === role.id}
                            disabled={!puedeAsignar}
                            onChange={(e) => {
                              setEditRol(e.target.value);
                              setErrors((prev) => ({ ...prev, rol: undefined }));
                            }}
                            className="mt-1 accent-accent-blue"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {role.color && (
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: role.color }}
                                />
                              )}
                              <span
                                className={`font-medium ${role.color ? '' : getRolBadgeColor(role.id)} px-2 py-0.5 rounded text-sm`}
                                style={
                                  role.color
                                    ? {
                                        backgroundColor: `${role.color}20`,
                                        color: role.color,
                                      }
                                    : undefined
                                }
                              >
                                {role.label}
                              </span>
                              {!role.isDefault && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded ${isLightTheme ? 'bg-purple-100 text-purple-600' : 'bg-purple-500/20 text-purple-300'}`}
                                >
                                  Personalizado
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                            >
                              {role.descripcion}
                              {esAdminLimitado && ' (Límite alcanzado)'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle estado activo */}
                <div
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div>
                    <p className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                      Estado de la cuenta
                    </p>
                    <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                      {editActivo
                        ? 'El usuario puede acceder al sistema'
                        : 'El acceso está bloqueado'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditActivo(!editActivo)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editActivo ? 'bg-success' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editActivo ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div
                className={`flex justify-between items-center gap-3 mt-6 pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
              >
                <TextButton
                  text="Eliminar Usuario"
                  className="px-4 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-lg"
                  onClick={() => setEliminarModal(true)}
                />
                <div className="flex gap-3">
                  <TextButton
                    text="Cancelar"
                    className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                    onClick={() => {
                      setEditModal(false);
                      handleResetEdit();
                    }}
                  />
                  <TextButton
                    text="Guardar Cambios"
                    className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                    onClick={handleEditarUsuario}
                  />
                </div>
              </div>
            </Modal>
          )}

          {/* Modal confirmar eliminación */}
          {eliminarModal && (
            <Modal onClickOutside={() => setEliminarModal(false)} className="!max-w-md">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-danger"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 17.333 3.532 19 5.072 19z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {editUserCompanyCount > 1 ? 'Remover Usuario' : 'Eliminar Usuario'}
                </h3>
                <p className={`text-sm mb-2 ${isLightTheme ? 'text-gray-600' : 'text-slate-300'}`}>
                  {editUserCompanyCount > 1 ? (
                    <>
                      ¿Está seguro que desea remover a{' '}
                      <span
                        className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                      >
                        {editEmail}
                      </span>{' '}
                      de esta empresa?
                    </>
                  ) : (
                    <>
                      ¿Está seguro que desea eliminar a{' '}
                      <span
                        className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                      >
                        {editEmail}
                      </span>
                      ?
                    </>
                  )}
                </p>
                <p
                  className={`text-sm font-medium mb-6 ${editUserCompanyCount > 1 ? 'text-yellow-500' : 'text-danger'}`}
                >
                  {editUserCompanyCount > 1 ? (
                    <>
                      El usuario seguirá teniendo acceso a otras {editUserCompanyCount - 1}{' '}
                      empresa(s).
                    </>
                  ) : (
                    <>Esta acción no se puede deshacer. El usuario perderá acceso al sistema.</>
                  )}
                </p>
                <div className="flex justify-center gap-4">
                  <TextButton
                    text="Cancelar"
                    className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-full"
                    onClick={() => setEliminarModal(false)}
                  />
                  <TextButton
                    text={editUserCompanyCount > 1 ? 'Remover' : 'Eliminar'}
                    className="px-5 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-full"
                    onClick={handleEliminarUsuario}
                  />
                </div>
              </div>
            </Modal>
          )}

          {/* Modal información de empresa */}
          {showCompanyModal && (
            <Modal
              onClickOutside={() => setShowCompanyModal(false)}
              className="!absolute !top-20 !max-w-lg"
            >
              <h2 className="text-xl font-bold text-center mb-2">Información de la Empresa</h2>
              <p
                className={`text-center text-sm mb-6 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
              >
                RUT: {formatRut(currentCompanyRUT)}
              </p>

              <div className="space-y-4">
                <Textfield
                  label="Nombre de la empresa:"
                  placeholder="Nombre comercial o razón social"
                  value={companyNombre}
                  onChange={(e) => setCompanyNombre(e.target.value)}
                />

                <Textfield
                  label="Giro:"
                  placeholder="Actividad económica"
                  value={companyGiro}
                  onChange={(e) => setCompanyGiro(e.target.value)}
                />

                <Textfield
                  label="Dirección:"
                  placeholder="Dirección de la empresa"
                  value={companyDireccion}
                  onChange={(e) => setCompanyDireccion(e.target.value)}
                />
              </div>

              <div
                className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
              >
                <TextButton
                  text="Cancelar"
                  className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                  onClick={() => setShowCompanyModal(false)}
                />
                <TextButton
                  text="Guardar"
                  className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                  onClick={handleSaveCompanyInfo}
                />
              </div>
            </Modal>
          )}

          {/* Modal gestión de roles */}
          {showRolesModal && (
            <Modal
              onClickOutside={() => setShowRolesModal(false)}
              className="!absolute !top-10 !max-w-2xl"
            >
              <h2 className="text-xl font-bold text-center mb-6">Gestión de Roles</h2>

              {rolesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
                </div>
              ) : (
                <>
                  {/* Botón crear nuevo rol */}
                  <div className="mb-4">
                    <TextButton
                      text="+ Crear nuevo rol"
                      className="w-full py-3 bg-success hover:bg-success-hover active:bg-success-active transition-colors rounded-lg"
                      classNameText="font-semibold text-base text-white"
                      onClick={handleNewRole}
                    />
                  </div>

                  {/* Lista de roles */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-custom">
                    {Object.values(companyRoles).map((role) => (
                      <div
                        key={role.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          isLightTheme
                            ? 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-5">
                          <div className="flex items-center gap-3">
                            {/* Color badge */}
                            <div
                              className="w-4 h-4 rounded-full border-2"
                              style={{ backgroundColor: role.color, borderColor: role.color }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                                >
                                  {role.nombre}
                                </span>
                                {role.isDefault && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      isLightTheme
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-purple-500/20 text-purple-300'
                                    }`}
                                  >
                                    Por defecto
                                  </span>
                                )}
                              </div>
                              <p
                                className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                              >
                                {role.descripcion || 'Sin descripción'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {!role.isDefault && (
                              <>
                                <TextButton
                                  text="Editar"
                                  className="px-4 py-1.5 bg-accent-blue hover:bg-blue-600 active:bg-blue-700 rounded-md"
                                  classNameText="text-sm font-medium text-white"
                                  onClick={() => handleEditRole(role)}
                                />
                                <TextButton
                                  text="Eliminar"
                                  className="px-4 py-1.5 bg-danger hover:bg-danger-hover active:bg-danger-active rounded-md"
                                  classNameText="text-sm font-medium text-white"
                                  onClick={() => {
                                    setRoleToDelete(role);
                                    setDeleteRoleModal(true);
                                  }}
                                />
                              </>
                            )}
                            {role.isDefault && (
                              <span
                                className={`text-xs px-3 py-1.5 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}
                              >
                                No editable
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className={`flex justify-end mt-6 pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
                  >
                    <TextButton
                      text="Cerrar"
                      className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                      onClick={() => setShowRolesModal(false)}
                    />
                  </div>
                </>
              )}
            </Modal>
          )}

          {/* Modal editar/crear rol */}
          {showRoleEditModal && editingRole && (
            <Modal
              onClickOutside={() => {
                setShowRoleEditModal(false);
                setEditingRole(null);
              }}
              className="!absolute !top-5 !max-w-3xl !max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-bold text-center mb-6">
                {editingRole.id ? 'Editar Rol' : 'Crear Nuevo Rol'}
              </h2>

              <div className="space-y-6">
                {/* Nombre y descripción */}
                <div className="grid grid-cols-2 gap-4">
                  <Textfield
                    label="Nombre del rol:"
                    placeholder="Ej: Contador Junior"
                    value={editingRole.nombre}
                    onChange={(e) =>
                      setEditingRole((prev) => ({ ...prev, nombre: e.target.value }))
                    }
                  />
                  <Textfield
                    label="Descripción:"
                    placeholder="Descripción breve del rol"
                    value={editingRole.descripcion}
                    onChange={(e) =>
                      setEditingRole((prev) => ({ ...prev, descripcion: e.target.value }))
                    }
                  />
                </div>

                {/* Color picker */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                  >
                    Color del rol:
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 flex-wrap">
                      {ROLE_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditingRole((prev) => ({ ...prev, color }))}
                          className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${
                            editingRole.color === color
                              ? 'border-white ring-2 ring-offset-2 ring-offset-gray-800 ring-white'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {editingRole.color === color && (
                            <svg
                              className="w-4 h-4 text-white"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                      >
                        Vista previa:
                      </span>
                      <span
                        className="px-3 py-1 text-sm font-medium rounded-full border-2"
                        style={{
                          backgroundColor: `${editingRole.color}20`,
                          color: editingRole.color,
                          borderColor: `${editingRole.color}50`,
                        }}
                      >
                        {editingRole.nombre || 'Nombre del rol'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Permisos de acceso */}
                <div>
                  <h3
                    className={`text-lg font-semibold mb-3 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    Permisos de acceso a vistas
                  </h3>
                  <div
                    className={`rounded-lg border ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
                  >
                    {getAccessPermissionsList().map((parent) => (
                      <div
                        key={parent.key}
                        className={`border-b last:border-b-0 ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
                      >
                        {/* Parent header */}
                        <div
                          className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${
                            isLightTheme ? 'hover:bg-gray-50' : 'hover:bg-white/5'
                          }`}
                          onClick={() => toggleSection(parent.key)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={areAllChildrenChecked(parent.children)}
                              ref={(el) => {
                                if (el) el.indeterminate = isParentIndeterminate(parent.children);
                              }}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleParentPermission(parent.key, parent.children);
                              }}
                              className="w-4 h-4 accent-accent-blue"
                            />
                            <span
                              className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                            >
                              {parent.label}
                            </span>
                          </div>
                          <svg
                            className={`w-5 h-5 transition-transform ${expandedSections[parent.key] ? 'rotate-180' : ''} ${
                              isLightTheme ? 'text-gray-500' : 'text-slate-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Children */}
                        {expandedSections[parent.key] && (
                          <div
                            className={`pl-10 pb-3 space-y-2 ${isLightTheme ? 'bg-gray-50' : 'bg-white/5'}`}
                          >
                            {parent.children.map((child) => (
                              <label
                                key={child.key}
                                className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                  isLightTheme ? 'hover:bg-gray-100' : 'hover:bg-white/5'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={editingRole.permisos[child.key] || false}
                                  onChange={() => togglePermission(child.key)}
                                  className="w-4 h-4 accent-accent-blue"
                                />
                                <span
                                  className={`text-sm ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                                >
                                  {child.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permisos de acciones */}
                <div>
                  <h3
                    className={`text-lg font-semibold mb-3 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    Permisos de acciones
                  </h3>
                  <div
                    className={`rounded-lg border p-4 ${isLightTheme ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-white/5'}`}
                  >
                    {Object.entries(getActionPermissionsGrouped()).map(([grupo, permisos]) => (
                      <div key={grupo} className="mb-4 last:mb-0">
                        <h4
                          className={`text-sm font-medium mb-2 ${isLightTheme ? 'text-gray-600' : 'text-slate-400'}`}
                        >
                          {grupo}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {permisos.map((permiso) => (
                            <label
                              key={permiso.key}
                              className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                isLightTheme ? 'hover:bg-gray-100' : 'hover:bg-white/10'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={editingRole.permisos[permiso.key] || false}
                                onChange={() => togglePermission(permiso.key)}
                                className="w-4 h-4 accent-accent-blue"
                              />
                              <span
                                className={`text-sm ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                              >
                                {permiso.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div
                className={`flex justify-end gap-3 mt-6 pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
              >
                <TextButton
                  text="Cancelar"
                  className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                  onClick={() => {
                    setShowRoleEditModal(false);
                    setEditingRole(null);
                  }}
                />
                <TextButton
                  text={editingRole.id ? 'Guardar Cambios' : 'Crear Rol'}
                  className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                  onClick={handleSaveRole}
                />
              </div>
            </Modal>
          )}

          {/* Modal confirmar eliminación de rol */}
          {deleteRoleModal && roleToDelete && (
            <Modal onClickOutside={() => setDeleteRoleModal(false)} className="!max-w-md">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-danger"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 17.333 3.532 19 5.072 19z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Eliminar Rol</h3>
                <p className={`text-sm mb-2 ${isLightTheme ? 'text-gray-600' : 'text-slate-300'}`}>
                  ¿Está seguro que desea eliminar el rol{' '}
                  <span
                    className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    {roleToDelete.nombre}
                  </span>
                  ?
                </p>
                <p className="text-sm font-medium text-danger mb-6">
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-center gap-4">
                  <TextButton
                    text="Cancelar"
                    className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-full"
                    onClick={() => {
                      setDeleteRoleModal(false);
                      setRoleToDelete(null);
                    }}
                  />
                  <TextButton
                    text="Eliminar"
                    className="px-5 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-full"
                    onClick={handleDeleteRole}
                  />
                </div>
              </div>
            </Modal>
          )}

          {/* Alert Modal */}
          <AlertModal
            isOpen={alertModal.open}
            onClose={() => setAlertModal({ ...alertModal, open: false })}
            title={alertModal.title}
            message={alertModal.message}
            variant={alertModal.variant}
          />

          {/* Loading Modal */}
          <LoadingModal isOpen={loadingModal} message="Procesando..." />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default CRolesUsuarios;
