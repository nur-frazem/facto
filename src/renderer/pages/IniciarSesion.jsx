import React from 'react';
import { H1Tittle } from "../components/Fonts";
import { YButton } from "../components/Button";
import { CGrid } from "../components/Container";
import { useNavigate } from "react-router-dom";


const IniciarSesion = () => {
    const navigate = useNavigate();

    return(
        <CGrid>
            <H1Tittle text="Pantalla Inicio Sesión" />
            <YButton text="Volver" className="text-2xl py-4 px-12"
                        onClick={() => navigate("/")}/>
        </CGrid>
    );
    
    
}

export default IniciarSesion;