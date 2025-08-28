import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import IniciarSesion from './pages/IniciarSesion';
import RIndex from './pages/recepcion/RIndex';
import EIndex from './pages/emision/EIndex';
import IIndex from './pages/informes/IIndex';
import CIndex from './pages/configuracion/CIndex';
import RIngresar from './pages/recepcion/Ringresar';
import RProcesar from './pages/recepcion/RProcesar';
import CClientesProveedores from './pages/configuracion/CClientesProveedores';
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
            <Route path="/home" element={<Home/>} />
            <Route path="/" element={<IniciarSesion/>} />
            <Route path="/recepcion-index" element={<RIndex/>} />
            <Route path="/emision-index" element={<EIndex/>} />
            <Route path="/informes-index" element={<IIndex/>} />
            <Route path="/configuracion-index" element={<CIndex/>} />
            <Route path="/configuracion-clientesProveedores" element={<CClientesProveedores/>} />
            <Route path="/recepcion-index/ingresar" element={<RIngresar/>} />
            <Route path="/recepcion-index/procesar" element={<RProcesar/>} />
          </Routes>
        </HashRouter>
      </div>
    </div>
  );
}

export default App;