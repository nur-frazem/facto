import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import Footer from "../../components/Footer";
import { H1Tittle, PSubtitle } from "../../components/Fonts";
import { Card } from "../../components/Container";
import { VolverButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";

const IIndex = () => {
    const navigate = useNavigate();

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
                <H1Tittle text="Informes de documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start content-center gap-6 mt-10">
                <Card title="Documentos recepcionados" />
                <Card title="Documentos emitidos" />
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
            
    );
}

export default IIndex;