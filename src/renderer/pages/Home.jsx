import React from 'react';
import { H1Tittle } from '../components/Fonts';
import { useNavigate } from "react-router-dom";
import { Card } from '../components/Container';
import { SidebarWithContentSeparator } from '../components/sidebar';
import inDocLogo from '../assets/Logos/inDoc.png';
import outDocLogo from '../assets/Logos/outDoc.png';
import configLogo from '../assets/Logos/config.png';
import reportLogo from '../assets/Logos/report.png';
import Footer from '../components/Footer';

import { useAuth } from '../context/AuthContext';

const Home = () => {

  const navigate = useNavigate();
  const { tieneAcceso } = useAuth();

  // Permisos para mostrar/ocultar cards (usando nuevo sistema de permisos)
  const puedeVerRecepcion = tieneAcceso("RECEPCION") || tieneAcceso("RECEPCION_INDEX");
  const puedeVerEmision = tieneAcceso("EMISION") || tieneAcceso("EMISION_INDEX");
  const puedeVerConfiguracion = tieneAcceso("CONFIGURACION") || tieneAcceso("CONFIGURACION_INDEX");
  const puedeVerInformes = tieneAcceso("INFORMES") || tieneAcceso("INFORMES_INDEX");

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <SidebarWithContentSeparator className="h-full" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-visible">
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
            hidden={!puedeVerEmision}
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

        <Footer />
      </div>
    </div>
    );
};

export default Home;
