import {SidebarWithContentSeparator} from "../../components/sidebar";
import React from 'react';
import Footer from "../../components/Footer";
import { H1Tittle, PSubtitle } from "../../components/Fonts";
import { VolverButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield, DropdownMenu } from "../../components/Textfield";

const RIngresar = () => {
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
                    <VolverButton onClick={() => navigate("/recepcion-index")}/>
                </div>
                <H1Tittle text="Ingreso de documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start gap-6 mt-10 ml-5 mr-5">
                <div className="grid grid-cols-2 grid-rows-6 gap-y-3 gap-x-10">
                    <DropdownMenu tittle="Seleccione giro" items={["Empresa 1", "Empresa 2", "Empresa 3"]} />
                    <Textfield className="font-bold" label="Fecha de emisión" classNameLabel="font-bold"/>
                    <DropdownMenu tittle="Seleccione Documento" items={["Factura Crédito", "Factura Contado", "Boleta", "Guía Electrónica"]} />
                    <div class="bg-yellow-300">4</div>
                    <Textfield className="font-bold" label="N° De Documento" classNameLabel="font-bold"/>
                    <div class="bg-pink-300">6</div>
                    <div class="bg-gray-300">7</div>
                    <div class="bg-orange-300">8</div>
                    <div class="bg-indigo-300">9</div>
                    <div class="bg-teal-300">10</div>
                    <div class="bg-lime-300">11</div>
                    <div class="bg-rose-300">12</div>
                </div>
                <p>hola</p>
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
            
    );
}

export default RIngresar;