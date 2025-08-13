import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";

const Example = () => {
    return(
        <div className="h-screen grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] relative">
            {/* Sidebar */}
            <div className="row-span-2">
                <SidebarWithContentSeparator className="h-full" />
            </div>

            {/* Título */}
            <div className="p-4 justify-center flex">
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