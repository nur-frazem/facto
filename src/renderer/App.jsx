import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import IniciarSesion from './pages/IniciarSesion';
import RIndex from './pages/recepcion/RIndex';
import EIndex from './pages/emision/EIndex';
import IIndex from './pages/informes/IIndex';

function App() {
  return (
    <div className="absolute inset-0 bg-gradient-to-tl from-purple-950 to-blue-500">
      <HashRouter>
        <Routes>
          <Route path="/home" element={<Home/>} />
          <Route path="/" element={<IniciarSesion/>} />
          <Route path="/recepcion-index" element={<RIndex/>} />
          <Route path="/emision-index" element={<EIndex/>} />
          <Route path="/informes-index" element={<IIndex/>} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;