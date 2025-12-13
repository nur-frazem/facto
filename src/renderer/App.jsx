import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import ProtectedRoute from './components/ProtectedRoute';
import Fondo from "./assets/background/FondoModernoAzul.png";

function App() {
  return (
    <div className="min-h-screen flex flex-col relative">

      {/* Capa gradiente - fixed para que cubra toda la ventana */}
      <div className="fixed inset-0 bg-gradient-to-tl from-sky-950 to-sky-900 z-0" />

      {/* Capa fondo con imagen - fixed para que cubra toda la ventana */}
      <div
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${Fondo})`, opacity: 0.5 }}
      />

      {/* Contenido principal - flex-1 para ocupar el espacio disponible */}
      <div className="relative z-10 flex-1 flex flex-col">
        <AuthProvider>
          <HashRouter>
            <Routes>
              {/* Ruta pública - Login */}
              <Route path="/" element={<IniciarSesion/>} />

              {/* Rutas protegidas - requieren autenticación */}
              <Route path="/home" element={<ProtectedRoute><Home/></ProtectedRoute>} />
              <Route path="/recepcion-index" element={<ProtectedRoute><RIndex/></ProtectedRoute>} />
              <Route path="/emision-index" element={<ProtectedRoute><EIndex/></ProtectedRoute>} />
              <Route path="/informes-index" element={
                <ProtectedRoute requiredPermission="VER_INFORMES">
                  <IIndex/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-index" element={
                <ProtectedRoute requiredPermission="VER_CONFIGURACION">
                  <CIndex/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-clientesProveedores" element={
                <ProtectedRoute requiredPermission="GESTIONAR_EMPRESAS">
                  <CClientesProveedores/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-roles" element={
                <ProtectedRoute requiredPermission="ASIGNAR_ROLES">
                  <CRolesUsuarios/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-auditoria" element={
                <ProtectedRoute requiredPermission="VER_CONFIGURACION">
                  <CAuditoria/>
                </ProtectedRoute>
              } />
              <Route path="/configuracion-cuenta" element={
                <ProtectedRoute>
                  <CCuenta/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/ingresar" element={
                <ProtectedRoute requiredPermission="INGRESAR_DOCUMENTOS">
                  <RIngresar/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/procesar" element={
                <ProtectedRoute requiredPermission="PROCESAR_PAGOS">
                  <RProcesar/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/revision-documentos" element={
                <ProtectedRoute requiredPermission="VER_DOCUMENTOS">
                  <RRevisionDocumentos/>
                </ProtectedRoute>
              } />
              <Route path="/recepcion-index/calendario" element={
                <ProtectedRoute requiredPermission="VER_CALENDARIO">
                  <RCalendario/>
                </ProtectedRoute>
              } />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </div>
    </div>
  );
}

export default App;
