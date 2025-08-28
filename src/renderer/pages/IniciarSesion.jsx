import React, {useState} from 'react';
import { H1Tittle } from "../components/Fonts";
import { YButton, XButton } from "../components/Button";
import { CGrid } from "../components/Container";
import { useNavigate } from "react-router-dom";
import { Textfield } from '../components/Textfield';
import { Modal } from '../components/modal';
import Footer from '../components/Footer';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const IniciarSesion = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/home");
        } catch (error) {
            console.error("Error en login:", error.message);
            setErrorMessage("Correo o contraseña inválidos");
            setShowErrorModal(true);
        }
    };

    return(
        <CGrid rowSizes='30% 10% 1fr'>
            <div>
                <H1Tittle text="Inicio Sesión" subtittle="Ingrese sus datos para iniciar sesión" />
            </div>
            <div className='justify-center items-center flex flex-col gap-4'>
                <Textfield label="E-MAIL:" 
                            type='email' 
                            className='w-96' 
                            placeholder="Ejemplo@ejemplo.ej"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            />
                <Textfield label="Contraseña:" 
                            type='password' 
                            className='w-96'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            />
            </div>
            
            <div className='justify-center items-start flex gap-32 mt-10'>
                <YButton text="Iniciar" 
                        className="text-2xl py-4 px-12"
                        onClick={handleLogin}
                        />

                <XButton text="Salir" 
                        className="text-2xl py-4 px-12 " 
                        onClick={() => window.electronAPI.salirApp()}
                        />
            </div>

            {showErrorModal && (
                <Modal onClickOutside={() => setShowErrorModal(false)}>
                    <div className="flex flex-col items-center gap-4">
                    <p>{errorMessage}</p>
                    <XButton
                        className="h-8"
                        onClick={() => setShowErrorModal(false)}
                        text="Volver"
                    />
                    </div>
                </Modal>
            )}
            <Footer></Footer>
        </CGrid>
    );
    
    
}

export default IniciarSesion;