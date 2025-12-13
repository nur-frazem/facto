import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { useNavigate } from 'react-router-dom';
import { VolverButton, TextButton } from '../../components/Button';
import { Textfield } from '../../components/Textfield';
import { Card } from '../../components/Container';
import { Modal, LoadingModal, AlertModal } from '../../components/modal';

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

const CRolesUsuarios = () => {
  const navigate = useNavigate();
  const { userData, esSuperAdmin, esAdmin, getRolesAsignables, ROLES } = useAuth();

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

  // Contar administradores actuales
  const cantidadAdmins = usuarios.filter((u) => u.rol === ROLES.ADMIN).length;

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
    else if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nuevoPassword))
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
          setLoadingModal(false);
          setAlertModal({
            open: true,
            title: 'Error',
            message: 'Ya existe un usuario con este email',
            variant: 'error',
          });
          return;
        }

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

        // Crear documento en Firestore
        await setDoc(userDocRef, {
          email: nuevoEmail.toLowerCase(),
          nombre: nuevoNombre,
          rol: nuevoRol,
          activo: true,
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
        console.error('Error creando usuario:', err);

        // Limpiar la app secundaria si existe
        if (secondaryApp) {
          try {
            await deleteApp(secondaryApp);
          } catch (e) {
            console.error('Error eliminando app secundaria:', e);
          }
        }

        setLoadingModal(false);

        let errorMsg = 'Error al crear el usuario';
        if (err.code === 'auth/email-already-in-use') {
          errorMsg = 'Este email ya está registrado en Firebase Auth';
        } else if (err.code === 'auth/invalid-email') {
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
        await setDoc(
          userDocRef,
          {
            email: editEmail,
            nombre: editNombre,
            rol: editRol,
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

  // Eliminar usuario (solo de Firestore - requiere eliminación manual de Firebase Auth)
  const handleEliminarUsuario = async () => {
    try {
      setLoadingModal(true);

      const userDocRef = doc(db, 'usuarios', editEmail);
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

  // Abrir modal de edición
  const handleOpenEdit = (usuario) => {
    setEditEmail(usuario.email);
    setEditNombre(usuario.nombre || '');
    setEditRol(usuario.rol || '');
    setEditRolOriginal(usuario.rol || '');
    setEditActivo(usuario.activo !== false);
    setEditModal(true);
  };

  // Verificar si puede editar un usuario
  const puedeEditarUsuario = (usuario) => {
    // No puede editarse a sí mismo (para evitar problemas)
    if (usuario.email === userData?.email) return false;

    // Super admin puede editar todos
    if (esSuperAdmin()) return true;

    // Admin no puede editar super admins ni otros admins
    if (esAdmin() && (usuario.rol === ROLES.SUPER_ADMIN || usuario.rol === ROLES.ADMIN))
      return false;

    // Admin puede editar otros roles
    if (esAdmin()) return true;

    return false;
  };

  // Verificar si puede asignar un rol específico
  const puedeAsignarRol = (rol, esEdicion = false, rolActual = null) => {
    const rolesAsignables = getRolesAsignables();
    if (!rolesAsignables.includes(rol)) return false;

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

  // Filtrar usuarios
  const usuariosFiltrados = usuarios.filter(
    (u) =>
      u.email?.toLowerCase().includes(filtroEmail.toLowerCase()) ||
      u.nombre?.toLowerCase().includes(filtroEmail.toLowerCase())
  );

  // Obtener color de badge según rol
  const getRolBadgeColor = (rol) => {
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
            <TextButton
              text="Nuevo Usuario"
              className="h-10 px-5 bg-success hover:bg-success-hover active:bg-success-active transition-colors duration-200 rounded-lg whitespace-nowrap"
              classNameText="font-semibold text-base text-white"
              onClick={() => setShowModal(true)}
            />
          </div>

          {/* Leyenda de roles */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(ROLES_LABELS).map(([rol, label]) => (
              <div
                key={rol}
                className={`px-3 py-1 text-xs font-medium rounded-full border ${getRolBadgeColor(rol)}`}
                title={ROLES_DESCRIPCION[rol]}
              >
                {label}
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
                <div className="flex font-semibold text-sm text-slate-300 mb-3 px-2 py-2 bg-white/5 rounded-lg sticky top-0">
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
                    className="flex items-center mb-1 px-2 py-3 hover:bg-white/5 rounded-lg transition-colors border-b border-white/5 last:border-b-0"
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
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getRolBadgeColor(usuario.rol)}`}
                      >
                        {ROLES_LABELS[usuario.rol] || usuario.rol || 'Sin rol'}
                      </span>
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rol:
                    {errors.rol && <span className="text-red-300 font-black"> - {errors.rol}</span>}
                  </label>
                  {limiteAdminsAlcanzado && esSuperAdmin() && (
                    <p className="text-xs text-yellow-400 mb-2">
                      Límite de administradores alcanzado ({cantidadAdmins}/{LIMITE_ADMINS})
                    </p>
                  )}
                  <div className="space-y-2">
                    {Object.entries(ROLES_LABELS).map(([rol, label]) => {
                      const puedeAsignar = puedeAsignarRol(rol, false, null);
                      const esAdminLimitado = rol === ROLES.ADMIN && limiteAdminsAlcanzado;
                      return (
                        <label
                          key={rol}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            nuevoRol === rol
                              ? 'border-accent-blue bg-accent-blue/10'
                              : puedeAsignar
                                ? 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                : 'border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="radio"
                            name="nuevoRol"
                            value={rol}
                            checked={nuevoRol === rol}
                            disabled={!puedeAsignar}
                            onChange={(e) => {
                              setNuevoRol(e.target.value);
                              setErrors((prev) => ({ ...prev, rol: undefined }));
                            }}
                            className="mt-1 accent-accent-blue"
                          />
                          <div>
                            <span
                              className={`font-medium ${getRolBadgeColor(rol)} px-2 py-0.5 rounded text-sm`}
                            >
                              {label}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">
                              {ROLES_DESCRIPCION[rol]}
                              {esAdminLimitado && ' (Límite alcanzado)'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
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
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Rol:
                    {errors.rol && <span className="text-red-300 font-black"> - {errors.rol}</span>}
                  </label>
                  {limiteAdminsAlcanzado && esSuperAdmin() && editRolOriginal !== ROLES.ADMIN && (
                    <p className="text-xs text-yellow-400 mb-2">
                      Límite de administradores alcanzado ({cantidadAdmins}/{LIMITE_ADMINS})
                    </p>
                  )}
                  <div className="space-y-2">
                    {Object.entries(ROLES_LABELS).map(([rol, label]) => {
                      const puedeAsignar = puedeAsignarRol(rol, true, editRolOriginal);
                      const esAdminLimitado =
                        rol === ROLES.ADMIN &&
                        limiteAdminsAlcanzado &&
                        editRolOriginal !== ROLES.ADMIN;
                      return (
                        <label
                          key={rol}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                            editRol === rol
                              ? 'border-accent-blue bg-accent-blue/10'
                              : puedeAsignar
                                ? 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                : 'border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <input
                            type="radio"
                            name="editRol"
                            value={rol}
                            checked={editRol === rol}
                            disabled={!puedeAsignar}
                            onChange={(e) => {
                              setEditRol(e.target.value);
                              setErrors((prev) => ({ ...prev, rol: undefined }));
                            }}
                            className="mt-1 accent-accent-blue"
                          />
                          <div>
                            <span
                              className={`font-medium ${getRolBadgeColor(rol)} px-2 py-0.5 rounded text-sm`}
                            >
                              {label}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">
                              {ROLES_DESCRIPCION[rol]}
                              {esAdminLimitado && ' (Límite alcanzado)'}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle estado activo */}
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <p className="font-medium text-white">Estado de la cuenta</p>
                    <p className="text-xs text-slate-400">
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

              <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t border-white/10">
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
                <h3 className="text-xl font-bold mb-2">Eliminar Usuario</h3>
                <p className="text-slate-300 text-sm mb-2">
                  ¿Está seguro que desea eliminar a{' '}
                  <span className="font-semibold text-white">{editEmail}</span>?
                </p>
                <p className="text-danger text-sm font-medium mb-6">
                  Esta acción no se puede deshacer. El usuario perderá acceso al sistema.
                </p>
                <div className="flex justify-center gap-4">
                  <TextButton
                    text="Cancelar"
                    className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-full"
                    onClick={() => setEliminarModal(false)}
                  />
                  <TextButton
                    text="Eliminar"
                    className="px-5 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-full"
                    onClick={handleEliminarUsuario}
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
