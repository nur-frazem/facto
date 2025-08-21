import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList } from "../../components/Textfield";

const RProcesar = () => {
    const navigate = useNavigate();

    const [giro, setGiro] = useState(null);
    const [tipoDoc, setTipoDoc] = useState(null);
    const [docs, setDocs] = useState([]);

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
            <H1Tittle text="Procesar documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start gap-6 mt-10 ml-5 mr-5">
                <div className="grid grid-cols-3 grid-rows-5 gap-y-3 gap-x-10">

                {/* Selección de giro */}
                <DropdownMenu
                tittle="Seleccione Giro"
                items={["Empresa 1", "Empresa 2", "Empresa 3"]}
                onSelect={(item) => {
                    setGiro(item);
                }}
                />

                {/* Tipo de documento */}
                {giro !== null ? (
                    <DropdownMenu
                    tittle="Tipo de documento"
                    items={["Factura Crédito", "Factura Contado", "Boleta", "Guía Electrónica", "Nota de crédito"]}
                    onSelect={(item) => {
                        setTipoDoc(item);
                    }}
                    />
                    ) : (
                        <div></div>
                    )
                }
                
                {/* Numero de documento */}
                {giro !== null && tipoDoc !== null ? (
                <DropdownMenuList
                    tittle="Agregar documento(s)"
                    items={["45252", "65436", "23453"]}
                    onSelect={(selectedItems) => {
                    setDocs(selectedItems); // aquí recibes la lista completa
                    }}
                />
                ) : (
                <div></div>
                )}

                </div>
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
            
    );
}

export default RProcesar;