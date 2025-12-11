import React from 'react';
import { XButton } from '../components/Button';
import { H1Tittle } from '../components/Fonts';
import { useNavigate } from "react-router-dom";
import { Card } from '../components/Container';
import inDocLogo from '../assets/Logos/inDoc.png';
import outDocLogo from '../assets/Logos/outDoc.png';
import configLogo from '../assets/Logos/config.png';
import reportLogo from '../assets/Logos/report.png';
import Footer from '../components/Footer';

import { useAuth } from '../context/AuthContext';

const Home = () => {

  const navigate = useNavigate();
  const { tienePermiso, logout } = useAuth();

  // Permisos para mostrar/ocultar cards
  const puedeVerRecepcion = tienePermiso("VER_DOCUMENTOS") || tienePermiso("INGRESAR_DOCUMENTOS") || tienePermiso("PROCESAR_PAGOS");
  const puedeVerConfiguracion = tienePermiso("VER_CONFIGURACION");
  const puedeVerInformes = tienePermiso("VER_INFORMES");

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch(error) {
      console.error("Error al cerrar sesión", error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header section */}
      <div className="pt-6 pb-4 px-4">
        <H1Tittle text="Bienvenido a Facto!" subtittle={"Sistema de contabilidad para recepción y emisión de documentos!"} />
      </div>

      {/* Main content - grows to fill space */}
      <div className="flex-1 flex flex-wrap justify-center content-start gap-4 sm:gap-6 px-4 py-6">
        <Card
          title="Recepción"
          onClick={() => navigate("/recepcion-index")}
          logo={inDocLogo}
          description="Todo lo relacionado a ingreso de documentos, facturas, boletas, entre otros.
                      Dentro de esta sección podrá guardar, modificar, eliminar, revisar y hacer egreso
                      de los documentos."
          hidden={!puedeVerRecepcion}
        />

        <Card
          title="Emisión"
          onClick={() => navigate("/emision-index")}
          logo={outDocLogo}
          description="Todo lo relacionado a documentos emitidos, configurado para que la emisión
                      de estos se agreguen automáticamente en esta sección al momento de su facturación,
                      donde podrá revisar, modificar estados de pago, anular etc."
        />

        <Card
          title="Configuración"
          onClick={() => navigate("/configuracion-index")}
          logo={configLogo}
          description="Ingrese para configurar su sitio, su perfil, documentos eliminados que son enviados
                      a la papelera temporal, configurar duración de créditos por cliente, etc."
          hidden={!puedeVerConfiguracion}
        />

        <Card
          title="Informes"
          onClick={() => navigate("/informes-index")}
          logo={reportLogo}
          description="En esta sección podrá descargar informes de forma detallada para revisar recepción o emisión,
                      donde podrá visualizar el estado de cuentas de clientes o proveedores con una cartola general
                      y específica, además de otras herramientas útiles."
          hidden={!puedeVerInformes}
        />
      </div>

      {/* Logout button section */}
      <div className="flex justify-center py-6 px-4">
        <XButton text="Cerrar sesión"
                className="text-lg sm:text-2xl py-3 sm:py-4 px-8 sm:px-12"
                onClick={handleLogout}/>
      </div>

      <Footer />
    </div>
    );
};

export default Home;
