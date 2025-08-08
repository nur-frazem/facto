import React from 'react';
import {YButton, XButton}from '../components/Button';
import { H1Tittle } from '../components/Fonts';
import { CGrid } from '../components/Container';
import { PSubtitle } from '../components/Fonts';
import { useNavigate } from "react-router-dom";

const Home = () => {

  const navigate = useNavigate();

  return (
    <CGrid rowSizes='30% 1fr'>
      <div className="justify-center items-center text-center flex flex-col">
        <H1Tittle text="Bienvenido a Facto!" />
        <PSubtitle text="Tu aplicación de escritorio con Electron + React + Vite." />
      </div>
      <div className="justify-center items-center flex gap-48">
        <YButton text="Iniciar" className="text-2xl py-4 px-12"
                onClick={() => navigate("/iniciar-sesion")}/>
        <XButton text="Salir" className="text-2xl py-4 px-12 " onClick={() => window.electronAPI.salirApp()}/>
      </div>
    </CGrid>
  );
};

export default Home;
