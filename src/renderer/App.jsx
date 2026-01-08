import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Home from './pages/Home';
import IniciarSesion from './pages/IniciarSesion';
import RIndex from './pages/recepcion/RIndex';
import EIndex from './pages/emision/EIndex';
import IIndex from './pages/informes/IIndex';
import CIndex from './pages/configuracion/CIndex';
import RIngresar from './pages/recepcion/Ringresar';
import RProcesar from './pages/recepcion/RProcesar';
import RRevisionDocumentos from './pages/recepcion/RRevisionDocumentos';
import RCalendario from './pages/recepcion/RCalendario';
import CClientesProveedores from './pages/configuracion/CClientesProveedores';
import CRolesUsuarios from './pages/configuracion/CRolesUsuarios';
import CAuditoria from './pages/configuracion/CAuditoria';
import CCuenta from './pages/configuracion/CCuenta';
import CCuentaBanco from './pages/configuracion/CCuentaBanco';
import ProtectedRoute from './components/ProtectedRoute';
import FondoOscuro from "./assets/background/FondoModernoAzul.png";

// Theme-aware background component
function AppBackground() {
  const { isLightTheme } = useTheme();

  return (
    <>
      {/* Capa gradiente - fixed para que cubra toda la ventana */}
      <div className={`fixed inset-0 z-0 transition-colors duration-300 ${
        isLightTheme
          ? "bg-gradient-to-tl from-blue-50 to-slate-100"
          : "bg-gradient-to-tl from-sky-950 to-sky-900"
      }`} />

      {/* Capa fondo con imagen - fixed para que cubra toda la ventana */}
      {!isLightTheme && (
        <div
          className="fixed inset-0 bg-cover bg-center z-0 app-background-image"
          style={{ backgroundImage: `url(${FondoOscuro})` }}
        />
      )}
    </>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col relative">
      <AppBackground />

      {/* Contenido principal - flex-1 para ocupar el espacio disponible */}
      <div className="relative z-10 flex-1 flex flex-col">
        <AuthProvider>
          <CompanyProvider>
            <HashRouter>
              <Routes>
              {/* Ruta pública - Login */}
              <Route path="/" element={<IniciarSesion/>} />

              {/* Rutas protegidas - requieren autenticación */}
              <Route path="/home" element={<ProtectedRoute><Home/></ProtectedRoute>} />
              <Route path="/recepcion-index" element={<ProtectedRoute><RIndex/></ProtectedRoute>} />
              <Route path="/emision-index" element={<ProtectedRoute><EIndex/></ProtectedRoute>} />
              <Route path="/informes-index" element={
                <ProtectedRoute requiredPermission="INFORMES_INDEX">
                  <IIndex/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-index" element={
                <ProtectedRoute requiredPermission="CONFIGURACION_INDEX">
                  <CIndex/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-clientesProveedores" element={
                <ProtectedRoute requiredPermission="CONFIGURACION_EMPRESAS">
                  <CClientesProveedores/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-roles" element={
                <ProtectedRoute requiredPermission="CONFIGURACION_ROLES">
                  <CRolesUsuarios/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-auditoria" element={
                <ProtectedRoute requiredPermission="CONFIGURACION_AUDITORIA">
                  <CAuditoria/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-cuenta" element={
                <ProtectedRoute requiredPermission="CONFIGURACION_CUENTA">
                  <CCuenta/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-cuentasBancarias" element={
                <ProtectedRoute requiredPermission="CONFIGURACION_CUENTAS_BANCARIAS">
                  <CCuentaBanco/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/ingresar" element={
                <ProtectedRoute requiredPermission="RECEPCION_INGRESAR">
                  <RIngresar/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/procesar" element={
                <ProtectedRoute requiredPermission="RECEPCION_PROCESAR">
                  <RProcesar/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/revision-documentos" element={
                <ProtectedRoute requiredPermission="RECEPCION_REVISION">
                  <RRevisionDocumentos/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/calendario" element={
                <ProtectedRoute requiredPermission="RECEPCION_CALENDARIO">
                  <RCalendario/>
                </ProtectedRoute>
              } />
              </Routes>
            </HashRouter>
          </CompanyProvider>
        </AuthProvider>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
