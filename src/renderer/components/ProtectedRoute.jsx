import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children, requiredPermission, requiredPermissions, fallbackPath = "/home" }) {
  const { user, userData, loading, error, tienePermiso, tieneAlgunPermiso } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-tl from-sky-950 to-sky-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
          <div className="text-white text-xl">Cargando...</div>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Si hay error (usuario sin permisos en el sistema)
  if (error || !userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-tl from-sky-950 to-sky-900">
        <div className="bg-surface-light border border-white/10 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-danger" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 17.333 3.532 19 5.072 19z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acceso Denegado</h2>
          <p className="text-slate-300 mb-6">
            {error || 'Tu cuenta no tiene permisos asignados. Contacta al administrador del sistema.'}
          </p>
          <button
            onClick={() => window.location.href = '#/'}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Si el usuario no está activo
  if (!userData.activo) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-tl from-sky-950 to-sky-900">
        <div className="bg-surface-light border border-white/10 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Cuenta Desactivada</h2>
          <p className="text-slate-300 mb-6">
            Tu cuenta ha sido desactivada. Contacta al administrador del sistema para más información.
          </p>
          <button
            onClick={() => window.location.href = '#/'}
            className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // Verificar permiso específico si se requiere
  if (requiredPermission && !tienePermiso(requiredPermission)) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Verificar si tiene alguno de los permisos requeridos
  if (requiredPermissions && requiredPermissions.length > 0 && !tieneAlgunPermiso(requiredPermissions)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

export default ProtectedRoute;
