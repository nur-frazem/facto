import React from 'react';
import {YButton, XButton}from '../components/Button';
import { H1Tittle } from '../components/Fonts';
import { CGrid } from '../components/Container';
import { useNavigate } from "react-router-dom";
import { Card } from '../components/Container';
import inDocLogo from '../assets/Logos/inDoc.png';


const Home = () => {

  const navigate = useNavigate();

  return (
    <CGrid rowSizes='20% auto 1fr'>
      <div>
        <H1Tittle text="Bienvenido a Facto!" subtittle={"Tu aplicación de escritorio con Electron + React + Vite."} />
      </div>
      <div className="flex flex-wrap justify-center gap-6 overflow-y-auto h-full">
        <Card title="Recepción"
              logo={inDocLogo}
         description="Aquí va todo lo relacionado a ingreso de documentos, facturas, guías, entre otros.
                      Dentro de esta sección podrá cancelar el documento ingresando información 
                      relacionada para realizar el egreso." />
        
        <Card title="Emisión"
              logo={inDocLogo}
         description="Aquí va todo lo relacionado a ingreso de documentos, facturas, guías, entre otros.
                      Dentro de esta sección podrá cancelar el documento ingresando información 
                      relacionada para realizar el egreso." />

        <Card title="Configuración"
              logo={inDocLogo}
              description="Aquí va todo lo relacionado a ingreso de documentos, facturas, guías, entre otros.
                      Dentro de esta sección podrá cancelar el documento ingresando información 
                      relacionada para realizar el egreso." />
        
        <Card title="Informes"
              logo={inDocLogo}
         description="Aquí va todo lo relacionado a ingreso de documentos, facturas, guías, entre otros.
                      Dentro de esta sección podrá cancelar el documento ingresando información 
                      relacionada para realizar el egreso." />
      </div>
      <div className="justify-center items-center flex gap-48">
        <XButton text="Cerrar sesión" className="text-2xl py-4 px-12 " onClick={() => navigate("/")}/>
      </div>
    </CGrid>
  );
};

export default Home;
