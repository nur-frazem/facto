import './styles/index.css';
import { createRoot } from 'react-dom/client';
import App from './App';

// Importar utilidades de administración (disponibles en consola)
import './utils/initSuperAdmin';


const Index = () =>{
    return <App />;
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<Index/>);