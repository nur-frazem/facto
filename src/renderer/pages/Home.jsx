import React from 'react';
import {YButton, XButton}from '../components/Button';
import { H1Tittle } from '../components/Fonts';
import { CGrid } from '../components/Container';
import { useNavigate } from "react-router-dom";
import { Card } from '../components/Container';
import inDocLogo from '../assets/Logos/inDoc.png';
import outDocLogo from '../assets/Logos/outDoc.png';
import configLogo from '../assets/Logos/config.png';
import reportLogo from '../assets/Logos/report.png';
import Footer from '../components/Footer';

import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const Home = () => {

  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch(error) {
      console.error("Error al cerrar sesión", error.message);
    }
  };

  return (
    <div className="h-screen grid grid-rows-[20%_1fr_auto]">
      
      <div>
        <H1Tittle text="Bienvenido a Facto!" subtittle={"Sistema de contabilidad para recepción y emisión de documentos!"} />
      </div>

      <div className="flex flex-wrap justify-center content-start gap-6">
        <Card title="Recepción"
              onClick={() => navigate("/recepcion-index")}
              logo={inDocLogo}
         description="Todo lo relacionado a ingreso de documentos, facturas, guías, entre otros.
                      Dentro de esta sección podrá guardar, modificar, eliminar, revisar y hacer egreso
                      de los documentos." />
        
        <Card title="Emisión"
              onClick={() => navigate("/emision-index")}
              logo={outDocLogo}
         description="Todo lo relacionado a documentos emitidos, configurado para que la emisión
                      de estos se agreguen automáticamente en esta sección al momento de su facturación,
                      donde podrá revisar, modificar estados de pago, anular etc." />

        <Card title="Configuración"
              onClick={() => navigate("/configuracion-index")}
              logo={configLogo}
              description="Ingrese para configurar su sitio, su perfil, documentos eliminados que son enviados
                          a la papelera temporal, configurar duración de créditos por cliente, etc." />
        
        <Card title="Informes"
              onClick={() => navigate("/informes-index")}
              logo={reportLogo}
         description="En esta sección podrá descargar informes de forma detallada para revisar recepción o emisión,
                      donde podrá visualizar el estado de cuentas de clientes o proveedores con una cartola general
                      y específica, además de otras herramientas útiles. " />
      </div>

      <div className="justify-center items-center flex gap-48">
        <XButton text="Cerrar sesión" 
                className="text-2xl py-4 px-12 mb-20" 
                onClick={handleLogout}/>
      </div>
      <Footer />
    </div>
    );
};

export default Home;
