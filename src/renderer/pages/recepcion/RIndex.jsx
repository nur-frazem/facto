import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { Card } from "../../components/Container";
import { VolverButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const RIndex = () => {
    const navigate = useNavigate();
    const { tienePermiso } = useAuth();

    // Permisos
    const puedeIngresar = tienePermiso("INGRESAR_DOCUMENTOS");
    const puedeProcesar = tienePermiso("PROCESAR_PAGOS");
    const puedeVerDocumentos = tienePermiso("VER_DOCUMENTOS");
    const puedeVerCalendario = tienePermiso("VER_CALENDARIO");

    return(
        <div className="h-screen grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] relative">
            {/* Sidebar */}
            <div className="row-span-2">
                <SidebarWithContentSeparator className="h-full" />
            </div>

            {/* Título */}
            <div className="p-4 relative flex items-center justify-center">
                <div className="absolute left-5">
                    <VolverButton onClick={() => navigate("/home")}/>
                </div>
                <H1Tittle text="Recepción de documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start content-center gap-6 mt-10">
                <Card
                    title="Ingreso de documentos"
                    onClick={() => navigate("/recepcion-index/ingresar")}
                    hidden={!puedeIngresar}
                />
                <Card
                    title="Procesar documentos"
                    onClick={() => navigate("/recepcion-index/procesar")}
                    hidden={!puedeProcesar}
                />
                <Card
                    title="Revisión de documentos"
                    onClick={() => navigate("/recepcion-index/revision-documentos")}
                    hidden={!puedeVerDocumentos}
                />
                <Card
                    title="Calendario interactivo"
                    onClick={() => navigate("/recepcion-index/calendario")}
                    hidden={!puedeVerCalendario}
                />
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>

    );
}

export default RIndex;