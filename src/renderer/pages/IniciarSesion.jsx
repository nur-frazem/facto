import React from 'react';
import { H1Tittle } from "../components/Fonts";
import { YButton, XButton } from "../components/Button";
import { CGrid } from "../components/Container";
import { useNavigate } from "react-router-dom";
import { Textfield } from '../components/Textfield';


const IniciarSesion = () => {
    const navigate = useNavigate();

    return(
        <CGrid rowSizes='30% 10% 1fr'>
            <div>
                <H1Tittle text="Inicio Sesión" subtittle="Ingrese sus datos para iniciar sesión" />
            </div>
            <div className='justify-center items-center flex flex-col gap-4'>
                <Textfield label="E-MAIL:" type='email' className='w-96' placeholder="Ejemplo@ejemplo.ej" />
                <Textfield label="Contraseña:" type='password' className='w-96' />
            </div>
            
            <div className='justify-center items-start flex gap-32 mt-10'>
                <YButton text="Iniciar" className="text-2xl py-4 px-12"
                                onClick={() => navigate("/home")}/>
                <XButton text="Salir" className="text-2xl py-4 px-12 " onClick={() => window.electronAPI.salirApp()}/>
            </div>
        </CGrid>
    );
    
    
}

export default IniciarSesion;