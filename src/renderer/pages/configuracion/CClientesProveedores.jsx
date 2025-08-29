import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, TextButton, YButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList, SearchBar, Textfield, CheckboxDropdown } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { Modal } from "../../components/modal";

const RProcesar = () => {
    const navigate = useNavigate();

    const [giro, setGiro] = useState(null);
    const [tipoDoc, setTipoDoc] = useState(null);
    const [docs, setDocs] = useState([]);
    const [rows, setRows] = useState([]); // <- Aquí guardamos las filas de la "tabla"

    const [showModal, setShowModal] = useState(false);

    const handleModal = () => {
        setShowModal(true);
    }

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
                <H1Tittle text="Configurar clientes y proveedores" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start mt-10 ml-5 mr-5">
            <TextButton text="Nuevo +"
                        className="h-min bg-white hover:bg-white/50 active:bg-white/30 transition-colors duration-200 mr-auto mb-4"
                        classNameText="font-black text-xl text-black"
                        onClick={handleModal}
                        />

                {/* Tabla dinámica */}
                <Card   
                    hasButton={false} 
                    contentClassName="h-96 overflow-y-auto scrollbar-custom flex flex-col w-full"
                    content={
                        <div>
                            {/* Encabezados */}
                            <div className="flex font-bold mb-2">
                                <div className="w-1/3 text-center">RUT</div>
                                <div className="w-1/3 text-center">Razón social</div>
                                <div className="w-1/3 text-center">Giro</div>
                                <div className="w-1/3 text-center">Comuna</div>
                                <div className="w-1/3 text-center">Dirección</div>
                                <div className="w-1/3 text-center">Teléfono</div>
                                <div className="w-1/3 text-center">Correo</div>
                                
                            </div>
                            <hr className="mb-4" />
                            <SearchBar></SearchBar>
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

                {showModal && (
                    <Modal onClickOutside={() => setShowModal(false)}
                            className=" mb-auto mt-40 w-max"
                            >
                        <H1Tittle text="Nuevo cliente/proveedor" marginTop="mt-1"/>
                        <div className="grid grid-rows-3 grid-cols-3 gap-x-12 gap-y-4">
                            <Textfield label="RUT:"/>
                            <Textfield label="Razón social:" />
                            <Textfield label="Giro:" />
                            <Textfield label="Comuna:" />
                            <Textfield label="Dirección:" />
                            <Textfield label="Teléfono:" />
                            <Textfield label="Correo:" />
                        </div>
                        <div className="grid grid-rows-1 grid-cols-2 gap-x-32 mt-4">
                            <CheckboxDropdown label="¿Es cliente?" 
                                            items={[
                                                <Textfield label="Días de crédito:" type="number" classNameInput="w-16 h-6 self-center"/>, 
                                            ]}/>
                            <CheckboxDropdown label="¿Es Proveedor?" 
                                            items={[
                                                <Textfield label="Días de crédito:" type="number" classNameInput="w-16 h-6 self-center"/>, 
                                            ]}/> 
                        </div>
                        <YButton text="Guardar"/>
                    </Modal>
                )}
            </div>
                {/* giro - comuna - direccion - telefono - correo */}
            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
    );
}

export default RProcesar;
