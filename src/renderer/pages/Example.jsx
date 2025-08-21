import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton } from "../components/Button";

const Example = () => {
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
                <VolverButton onClick={() => navigate("/recepcion-index")} />
            </div>
            <H1Tittle text="Titulo" />
            </div>

            {/* Contenido principal */}
            <div className="p-4 overflow-auto">
                <p>Aquí va el contenido de la página...</p>
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
            
    );
}

export default Example;