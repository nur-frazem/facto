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

    const [availableDocs, setAvailableDocs] = useState(["45252", "65436", "23453", "1232451", "4523525", "654336", "234563", "12324451", "45213525", "658436", "2346953", "123244541", "452375525"]); //Esta lista dinamica debe recibirse desde el backend


    const handleIngresar = () => {
        const docsArray = Array.isArray(docs) ? docs : [docs];
      
        if (!giro || !tipoDoc || docsArray.length === 0) return;
      
        const nuevasFilas = docsArray.map((doc) => ({
          giro,
          tipoDoc,
          doc,
        }));
      
        setRows((prev) => [...prev, ...nuevasFilas]);
      
        // eliminar docs ya usados de la lista disponible
        setAvailableDocs((prev) => prev.filter((d) => !docsArray.includes(d)));
      
        // resetear selección
        setDocs([]);
        setTipoDoc(null);
        setGiro(null);
      };

    return (
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
            <div className="flex flex-col flex-wrap justify-start mt-10 ml-5 mr-5">
                <div className="grid grid-cols-3 grid-rows-2 gap-x-10">

                    {/* Selección de giro */}
                    <DropdownMenu
                        tittle="Seleccione Giro"
                        items={["Empresa 1", "Empresa 2", "Empresa 3"]}
                        value={giro}
                        onSelect={(item) => setGiro(item)}
                    />

                    {/* Tipo de documento */}
                    {giro !== null ? (
                        <DropdownMenu
                            tittle="Tipo de documento"
                            items={[
                                "Factura Crédito",
                                "Factura Contado",
                                "Boleta",
                                "Guía Electrónica",
                                "Nota de crédito"
                            ]}
                            value={tipoDoc}
                            onSelect={(item) => setTipoDoc(item)}
                        />
                    ) : (
                        <div></div>
                    )}
                    
                    {/* Numero de documento */}
                    {giro !== null && tipoDoc !== null ? (
                        <DropdownMenuList
                            tittle="Agregar documento(s)"
                            items={availableDocs}
                            value={docs}
                            onSelect={(selectedItems) => setDocs(selectedItems)}
                        />
                    ) : (
                        <div></div>
                    )}

                    <div />
                    <div />
                    <YButton 
                        className="float-right mt-1" 
                        text="Ingresar" 
                        onClick={handleIngresar}
                    />
                </div>

                <hr className="border-black mt-2 mb-4"/>

                {/* Tabla dinámica */}
                <Card   
                    hasButton={false} 
                    contentClassName="w-96 h-96 overflow-y-auto scrollbar-custom flex flex-col w-full"
                    content={
                        <div>
                            {/* Encabezados */}
                            <div className="flex justify-between font-bold mb-2">
                                <div className="w-1/3 text-center">Giro</div>
                                <div className="w-1/3 text-center">Tipo de documento</div>
                                <div className="w-1/3 text-center">Número de documento</div>
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
                                    No hay documentos ingresados
                                </div>
                            )}
                        </div>
                    }
                />
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
    );
}

export default RProcesar;
