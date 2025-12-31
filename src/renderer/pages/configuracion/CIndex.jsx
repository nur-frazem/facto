import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { Card } from "../../components/Container";
import { VolverButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const CIndex = () => {
    const navigate = useNavigate();
    const { tieneAcceso } = useAuth();

    return(
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <div className="flex-shrink-0">
                <SidebarWithContentSeparator className="h-full" />
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-screen overflow-visible">
                {/* Título */}
                <div className="p-4 relative flex items-center justify-center flex-shrink-0">
                    <div className="absolute left-5">
                        <VolverButton onClick={() => navigate("/home")}/>
                    </div>
                    <H1Tittle text="Configuración" />
                </div>

                {/* Contenido principal */}
                <div className="flex-1 flex flex-col flex-wrap justify-start content-center gap-4 sm:gap-6 px-4 py-6">
                    {tieneAcceso("CONFIGURACION_CUENTA") && (
                        <Card title="Cuenta" onClick={() => navigate("/configuracion-cuenta")} />
                    )}
                    <Card title="Papelera temporal" />
                    {tieneAcceso("CONFIGURACION_EMPRESAS") && (
                        <Card
                            title="Configurar Clientes/proveedores"
                            onClick={() => navigate("/configuracion-clientesProveedores")}
                        />
                    )}
                    {tieneAcceso("CONFIGURACION_ROLES") && (
                        <Card
                            title="Gestión de Usuarios y Roles"
                            onClick={() => navigate("/configuracion-roles")}
                        />
                    )}
                    {tieneAcceso("CONFIGURACION_AUDITORIA") && (
                        <Card
                            title="Auditoría"
                            onClick={() => navigate("/configuracion-auditoria")}
                        />
                    )}
                </div>

                {/* Footer */}
                <Footer />
            </div>
        </div>
    );
}

export default CIndex;