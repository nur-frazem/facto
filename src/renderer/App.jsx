import { HashRouter, Routes, Route } from 'react-router-dom';
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
import ProtectedRoute from './components/ProtectedRoute';
import Fondo from "./assets/background/FondoModernoAzul.png";

function App() {
  return (
    <div className="absolute inset-0">

      {/* Capa gradiente encima */}
      <div className="absolute inset-0 bg-gradient-to-tl from-sky-950 to-sky-900" />

      {/* Capa fondo con imagen */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${Fondo})`, opacity: 0.5 }}
      />
      
      
      
      {/* Contenido principal */}
      <div className="relative z-60">
        <HashRouter>
          <Routes>
            {/* Ruta pública - Login */}
            <Route path="/" element={<IniciarSesion/>} />

            {/* Rutas protegidas - requieren autenticación */}
            <Route path="/home" element={<ProtectedRoute><Home/></ProtectedRoute>} />
            <Route path="/recepcion-index" element={<ProtectedRoute><RIndex/></ProtectedRoute>} />
            <Route path="/emision-index" element={<ProtectedRoute><EIndex/></ProtectedRoute>} />
            <Route path="/informes-index" element={<ProtectedRoute><IIndex/></ProtectedRoute>} />
            <Route path="/configuracion-index" element={<ProtectedRoute><CIndex/></ProtectedRoute>} />
            <Route path="/configuracion-clientesProveedores" element={<ProtectedRoute><CClientesProveedores/></ProtectedRoute>} />
            <Route path="/recepcion-index/ingresar" element={<ProtectedRoute><RIngresar/></ProtectedRoute>} />
            <Route path="/recepcion-index/procesar" element={<ProtectedRoute><RProcesar/></ProtectedRoute>} />
            <Route path="/recepcion-index/revision-documentos" element={<ProtectedRoute><RRevisionDocumentos/></ProtectedRoute>} />
            <Route path="/recepcion-index/calendario" element={<ProtectedRoute><RCalendario/></ProtectedRoute>} />
          </Routes>
        </HashRouter>
      </div>
    </div>
  );
}

export default App;