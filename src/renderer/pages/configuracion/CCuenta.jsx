import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { useNavigate } from 'react-router-dom';
import { VolverButton, TextButton } from '../../components/Button';
import { Textfield } from '../../components/Textfield';
import { LoadingModal, AlertModal } from '../../components/modal';
import { useTheme } from '../../context/ThemeContext';

import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig';

import { useAuth, ROLES_LABELS, ROLES_DESCRIPCION } from '../../context/AuthContext';

// Cooldown for name change: 1 day in milliseconds
const NAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const CCuenta = () => {
  const navigate = useNavigate();
  const { user, userData, tienePermiso } = useAuth();
  const { isLightTheme } = useTheme();

  // State for name change
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nombreCooldown, setNombreCooldown] = useState(null);
  const [canChangeName, setCanChangeName] = useState(true);

  // State for password reset
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);

  // Activity stats
  const [activityStats, setActivityStats] = useState({
    documentosCreados: 0,
    documentosEditados: 0,
    documentosEliminados: 0,
    pagosRealizados: 0,
    pagosRevertidos: 0,
    revinculaciones: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // UI states
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  // Check name change cooldown on mount
  useEffect(() => {
    if (userData?.lastNameChange) {
      const lastChange = userData.lastNameChange.toDate ?
        userData.lastNameChange.toDate() :
        new Date(userData.lastNameChange);
      const elapsed = Date.now() - lastChange.getTime();

      if (elapsed < NAME_CHANGE_COOLDOWN_MS) {
        setCanChangeName(false);
        const remaining = NAME_CHANGE_COOLDOWN_MS - elapsed;
        setNombreCooldown(new Date(Date.now() + remaining));

        // Set up timer to enable button when cooldown expires
        const timer = setTimeout(() => {
          setCanChangeName(true);
          setNombreCooldown(null);
        }, remaining);

        return () => clearTimeout(timer);
      }
    }
    setNuevoNombre(userData?.nombre || '');
  }, [userData]);

  // Load activity stats from audit logs
  useEffect(() => {
    const loadActivityStats = async () => {
      if (!user?.email) return;

      setLoadingStats(true);
      try {
        const auditoriaRef = collection(db, 'auditoria');
        const q = query(auditoriaRef);
        const snapshot = await getDocs(q);

        const stats = {
          documentosCreados: 0,
          documentosEditados: 0,
          documentosEliminados: 0,
          pagosRealizados: 0,
          pagosRevertidos: 0,
          revinculaciones: 0,
        };

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const userField = data.creadoPor || data.editadoPor || data.eliminadoPor ||
                           data.procesadoPor || data.reversadoPor || data.revinculadoPor ||
                           data.usuario;

          if (userField === user.email) {
            switch (data.tipo) {
              case 'creacion':
                stats.documentosCreados++;
                break;
              case 'edicion':
                stats.documentosEditados++;
                break;
              case 'eliminacion':
                stats.documentosEliminados++;
                break;
              case 'pago':
                stats.pagosRealizados++;
                break;
              case 'reversion_pago':
                stats.pagosRevertidos++;
                break;
              case 'revinculacion':
                stats.revinculaciones++;
                break;
            }
          }
        });

        setActivityStats(stats);
      } catch (error) {
        // User might not have permission to read audit logs
        console.log('Could not load activity stats:', error.message);
      } finally {
        setLoadingStats(false);
      }
    };

    loadActivityStats();
  }, [user]);

  // Handle name change
  const handleNameChange = async () => {
    if (!nuevoNombre.trim()) {
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'El nombre no puede estar vacío',
        variant: 'error',
      });
      return;
    }

    if (nuevoNombre.trim() === userData?.nombre) {
      setAlertModal({
        open: true,
        title: 'Sin cambios',
        message: 'El nombre es igual al actual',
        variant: 'warning',
      });
      return;
    }

    if (!canChangeName) {
      setAlertModal({
        open: true,
        title: 'Cooldown activo',
        message: 'Debes esperar 24 horas entre cambios de nombre',
        variant: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'usuarios', user.email);
      await updateDoc(userRef, {
        nombre: nuevoNombre.trim(),
        lastNameChange: Timestamp.now(),
      });

      setCanChangeName(false);
      setNombreCooldown(new Date(Date.now() + NAME_CHANGE_COOLDOWN_MS));

      setAlertModal({
        open: true,
        title: 'Nombre actualizado',
        message: 'Tu nombre ha sido cambiado exitosamente',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error updating name:', error);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'No se pudo actualizar el nombre',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle password reset
  const handlePasswordReset = async () => {
    if (resetCooldown > 0) return;

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetEmailSent(true);
      setResetCooldown(60); // 60 second cooldown

      // Countdown timer
      const interval = setInterval(() => {
        setResetCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setAlertModal({
        open: true,
        title: 'Correo enviado',
        message: `Se ha enviado un enlace de restablecimiento a ${user.email}`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'No se pudo enviar el correo de restablecimiento',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '--';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format remaining cooldown time
  const formatCooldown = (date) => {
    if (!date) return '';
    const remaining = date.getTime() - Date.now();
    if (remaining <= 0) return '';

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get session start time
  const getSessionStart = () => {
    const sessionStart = localStorage.getItem('facto_session_start');
    if (sessionStart) {
      return new Date(parseInt(sessionStart, 10)).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '--';
  };

  // Get session remaining time
  const getSessionRemaining = () => {
    const sessionStart = localStorage.getItem('facto_session_start');
    if (sessionStart) {
      const elapsed = Date.now() - parseInt(sessionStart, 10);
      const remaining = (8 * 60 * 60 * 1000) - elapsed; // 8 hours
      if (remaining <= 0) return 'Expirada';

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }
    return '--';
  };

  // Get permission list for display
  const getPermissions = () => {
    const permisos = [];
    if (tienePermiso('VER_DOCUMENTOS')) permisos.push('Ver documentos');
    if (tienePermiso('INGRESAR_DOCUMENTOS')) permisos.push('Ingresar documentos');
    if (tienePermiso('EDITAR_DOCUMENTOS')) permisos.push('Editar documentos');
    if (tienePermiso('ELIMINAR_DOCUMENTOS')) permisos.push('Eliminar documentos');
    if (tienePermiso('PROCESAR_PAGOS')) permisos.push('Procesar pagos');
    if (tienePermiso('VER_CALENDARIO')) permisos.push('Ver calendario');
    if (tienePermiso('VER_INFORMES')) permisos.push('Ver informes');
    if (tienePermiso('VER_CONFIGURACION')) permisos.push('Ver configuración');
    if (tienePermiso('GESTIONAR_EMPRESAS')) permisos.push('Gestionar empresas');
    if (tienePermiso('ASIGNAR_ROLES')) permisos.push('Asignar roles');
    return permisos;
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <SidebarWithContentSeparator className="h-full" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="p-4 relative flex items-center justify-center flex-shrink-0">
          <div className="absolute left-5">
            <VolverButton onClick={() => navigate('/configuracion-index')} />
          </div>
          <H1Tittle text="Mi Cuenta" />
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-4 overflow-auto scrollbar-custom">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Profile Info Card */}
            <div className={`rounded-xl p-6 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-white/5 border border-white/10'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent-blue">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Información del Perfil
              </h2>

              <div className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Correo electrónico</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200 text-gray-800'
                      : 'bg-white/5 border border-white/10 text-white'
                  }`}>
                    {user?.email || '--'}
                  </div>
                </div>

                {/* Name with cooldown */}
                <div>
                  <label className={`text-sm flex items-center justify-between ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                    <span>Nombre</span>
                    {!canChangeName && nombreCooldown && (
                      <span className="text-yellow-400 text-xs">
                        Próximo cambio en: {formatCooldown(nombreCooldown)}
                      </span>
                    )}
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      disabled={!canChangeName}
                      className={`flex-1 px-3 py-2 rounded-lg focus:outline-none focus:border-accent-blue transition-colors ${!canChangeName ? 'opacity-50 cursor-not-allowed' : ''} ${
                        isLightTheme
                          ? 'bg-white border border-gray-300 text-gray-800'
                          : 'bg-white/5 border border-white/10 text-white'
                      }`}
                      placeholder="Tu nombre"
                    />
                    <button
                      onClick={handleNameChange}
                      disabled={!canChangeName || loading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        canChangeName && !loading
                          ? 'bg-accent-blue hover:bg-accent-blue/80 text-white'
                          : (isLightTheme ? 'bg-gray-100 text-gray-400' : 'bg-white/10 text-slate-500') + ' cursor-not-allowed'
                      }`}
                    >
                      Guardar
                    </button>
                  </div>
                  <p className={`text-xs mt-1 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>
                    Puedes cambiar tu nombre una vez cada 24 horas
                  </p>
                </div>

                {/* Role */}
                <div>
                  <label className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Rol</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                      userData?.rol === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                      userData?.rol === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      userData?.rol === 'gestor' ? 'bg-accent-blue/20 text-accent-blue' :
                      userData?.rol === 'digitador' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {ROLES_LABELS[userData?.rol] || userData?.rol || '--'}
                    </span>
                    <p className={`text-xs mt-2 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>
                      {ROLES_DESCRIPCION[userData?.rol] || ''}
                    </p>
                  </div>
                </div>

                {/* Account status */}
                <div>
                  <label className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Estado de la cuenta</label>
                  <div className={`mt-1 px-3 py-2 rounded-lg ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <span className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                      userData?.activo !== false ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                    }`}>
                      {userData?.activo !== false ? 'Activa' : 'Desactivada'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className={`rounded-xl p-6 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-white/5 border border-white/10'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent-blue">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Seguridad
              </h2>

              <div className="space-y-4">
                {/* Password Reset */}
                <div>
                  <label className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Contraseña</label>
                  <div className="mt-2">
                    <button
                      onClick={handlePasswordReset}
                      disabled={loading || resetCooldown > 0}
                      className={`w-full px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                        resetCooldown > 0
                          ? (isLightTheme ? 'bg-gray-100 text-gray-400' : 'bg-white/10 text-slate-500') + ' cursor-not-allowed'
                          : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-600 border border-yellow-500/30'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      {resetCooldown > 0
                        ? `Reenviar en ${resetCooldown}s`
                        : 'Enviar enlace de restablecimiento'}
                    </button>
                    <p className={`text-xs mt-2 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>
                      Se enviará un correo con un enlace para restablecer tu contraseña
                    </p>
                  </div>
                </div>

                {/* Session Info */}
                <div className={`pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}>
                  <label className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Sesión actual</label>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className={`px-3 py-2 rounded-lg ${
                      isLightTheme
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Iniciada a las</div>
                      <div className={`font-mono ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>{getSessionStart()}</div>
                    </div>
                    <div className={`px-3 py-2 rounded-lg ${
                      isLightTheme
                        ? 'bg-gray-50 border border-gray-200'
                        : 'bg-white/5 border border-white/10'
                    }`}>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Tiempo restante</div>
                      <div className={`font-mono ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>{getSessionRemaining()}</div>
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>
                    Las sesiones expiran automáticamente después de 8 horas
                  </p>
                </div>

                {/* Account Creation Date */}
                {userData?.creadoEn && (
                  <div className={`pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}>
                    <label className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Cuenta creada</label>
                    <div className={`mt-1 px-3 py-2 rounded-lg font-mono text-sm ${
                      isLightTheme
                        ? 'bg-gray-50 border border-gray-200 text-gray-800'
                        : 'bg-white/5 border border-white/10 text-white'
                    }`}>
                      {formatDate(userData.creadoEn)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Card */}
            <div className={`rounded-xl p-6 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-white/5 border border-white/10'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent-blue">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                Mis Permisos
              </h2>

              <div className="flex flex-wrap gap-2">
                {getPermissions().map((permiso, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-accent-blue/10 border border-accent-blue/30 rounded-full text-accent-blue text-sm"
                  >
                    {permiso}
                  </span>
                ))}
                {getPermissions().length === 0 && (
                  <span className={`text-sm ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Sin permisos asignados</span>
                )}
              </div>
            </div>

            {/* Activity Stats Card */}
            <div className={`rounded-xl p-6 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-white/5 border border-white/10'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-accent-blue">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                Mi Actividad
              </h2>

              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className="text-2xl font-bold text-accent-blue">{activityStats.documentosCreados}</div>
                    <div className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Documentos creados</div>
                  </div>
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className="text-2xl font-bold text-yellow-500">{activityStats.documentosEditados}</div>
                    <div className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Documentos editados</div>
                  </div>
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className="text-2xl font-bold text-danger">{activityStats.documentosEliminados}</div>
                    <div className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Documentos eliminados</div>
                  </div>
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className="text-2xl font-bold text-success">{activityStats.pagosRealizados}</div>
                    <div className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Pagos procesados</div>
                  </div>
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className="text-2xl font-bold text-orange-500">{activityStats.pagosRevertidos}</div>
                    <div className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Pagos revertidos</div>
                  </div>
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    isLightTheme
                      ? 'bg-gray-50 border border-gray-200'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    <div className="text-2xl font-bold text-purple-500">{activityStats.revinculaciones}</div>
                    <div className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Revinculaciones</div>
                  </div>
                </div>
              )}

              <p className={`text-xs mt-4 text-center ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>
                Estadísticas basadas en el registro de auditoría
              </p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ ...alertModal, open: false })}
        title={alertModal.title}
        message={alertModal.message}
        variant={alertModal.variant}
      />

      {/* Loading Modal */}
      {loading && <LoadingModal />}
    </div>
  );
};

export default CCuenta;
