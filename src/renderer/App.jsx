import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import IniciarSesion from './pages/IniciarSesion';

function App() {
  return (
    <div className="absolute inset-0 bg-gradient-to-tl from-purple-950 to-blue-500">
      <HashRouter>
        <Routes>
          <Route path="/home" element={<Home/>} />
          <Route path="/" element={<IniciarSesion/>} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;