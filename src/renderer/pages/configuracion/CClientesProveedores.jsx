import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, YButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList } from "../../components/Textfield";
import { Card } from "../../components/Container";

const RProcesar = () => {
    const navigate = useNavigate();

    const [giro, setGiro] = useState(null);
    const [tipoDoc, setTipoDoc] = useState(null);
    const [docs, setDocs] = useState([]);
    const [rows, setRows] = useState([]); // <- Aquí guardamos las filas de la "tabla"

    return (
        <div className="h-screen grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] relative">
            {/* Sidebar */}
            <div className="row-span-2">
                <SidebarWithContentSeparator className="h-full" />
            </div>

            {/* Título */}
            <div className="p-4 relative flex items-center justify-center">
                <div className="absolute left-5">
                    <VolverButton onClick={() => navigate("/configuracion-index")} />
                </div>
                <H1Tittle text="Procesar documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start mt-10 ml-5 mr-5">

                {/* Tabla dinámica */}
                <Card   
                    hasButton={false} 
                    contentClassName="h-64 overflow-y-auto scrollbar-custom flex flex-col w-full"
                    content={
                        <div>
                            {/* Encabezados */}
                            <div className="flex font-bold mb-2">
                                <div className="w-1/3 text-center">RUT</div>
                                <div className="w-1/3 text-center">Razón social</div>
                            </div>
                            <hr className="mb-4" />
                            
                            {/* Filas dinámicas */}
                            {rows.map((row, index) => (
                                <div key={index} className="flex justify-between mb-2">
                                    <div className="w-1/3 text-center">{row.giro}</div>
                                    <div className="w-1/3 text-center">{row.tipoDoc}</div>
                                    <div className="w-1/3 text-center">{row.doc}</div>
                                </div>
                            ))}

                            {/* Si no hay filas */}
                            {rows.length === 0 && (
                                <div className="text-center text-gray-400 mt-4">
                                    No hay empresas ingresadas
                                </div>
                            )}
                        </div>
                    }
                />
                <div className="mt-10" />

                <div className="grid grid-cols-3 grid-rows-2 gap-x-10">

                    {/* Selección de giro */}
                    <DropdownMenu
                        tittle="Seleccione Giro"
                        items={["Empresa 1", "Empresa 2", "Empresa 3"]}
                        value={giro}
                        onSelect={(item) => setGiro(item)}
                    />
                    <div />
                    <div />
                    <div />
                    <div />
                    <YButton 
                        className="float-right mt-1" 
                        text="Ingresar" 
                    />
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
