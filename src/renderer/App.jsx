import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import IniciarSesion from './pages/IniciarSesion';

function App() {
  return (
    <div className="absolute inset-0 bg-gradient-to-tr from-red-900 to-orange-800">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/iniciar-sesion" element={<IniciarSesion/>} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;