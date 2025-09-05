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

    {/* Variables de textfields */}
    const [rut, setRut]                 = useState("");
    const [razon, setRazon]             = useState("");
    const [giro, setGiro]               = useState("");
    const [comuna, setComuna]           = useState("");
    const [direccion, setDireccion]     = useState("");
    const [telefono, setTelefono]       = useState("");
    const [correo, setCorreo]           = useState("");

    const [esCliente, setEsCliente]                 = useState(false);
    const [esProveedor, setEsProveedor]             = useState(false);
    const [creditoCliente, setCreditoCliente]       = useState(0);
    const [creditoProveedor, setCreditoProveedor]   = useState(0);

    // Estado de errores
    const [errors, setErrors] = useState({});
    const ECampo = "!";
    const handleNewEmpresa = () => {
        let newErrors = {};
        
        // rut obligatorio
        if (!rut) newErrors.rut = ECampo;
        if (!razon) newErrors.razon = ECampo;
        if (!giro) newErrors.giro = ECampo;
        if (!comuna) newErrors.comuna = ECampo;
        if (!direccion) newErrors.direccion = ECampo;
        
        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            setShowModal(false);
        }
    };
    
    const [rows, setRows] = useState([]); // <- Aquí guardamos las filas de la "tabla"

    const [showModal, setShowModal] = useState(false);

    const handleModal = () => {
        setShowModal(true);
    }

    const handleNewEmpresaa = () => {
        console.log("rut: " + rut);
        console.log("razon: " + razon);
        console.log("giro: " + giro);
        console.log("comuna: " + comuna);
        console.log("dirección: " + direccion);
        console.log("teléfono: " + telefono);
        console.log("correo: " + correo);
        console.log("es cliente: " + esCliente);
        console.log("es proveedor: " + esProveedor);
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
                            {/* RUT */}
                            <Textfield 
                                label={<>
                                    RUT: 
                                    {errors.rut && (
                                        <span className="text-red-300 font-black"> - {errors.rut} </span>
                                    )}
                                    
                                </>}
                                classNameInput={errors.rut && ("ring-red-400 ring-2")}
                                placeholder="99.999.999-9"
                                type="rut" 
                                value={rut} 
                                onChange={(e) => {
                                    setRut(e.target.value);
                                    setErrors((prev) => ({ ...prev, rut: undefined}));
                                    }}
                                
                            />

                            {/* RAZÓN SOCIAL */}
                            <Textfield 
                                label={<>
                                    Razón social: 
                                    {errors.razon && (
                                        <span className="text-red-300 font-black"> - {errors.razon} </span>
                                    )}
                                </>}
                                classNameInput={errors.razon && ("ring-red-400 ring-2")}
                                    placeholder="Facto LTDA."
                                value={razon}
                                onChange={(e) => {
                                    setRazon(e.target.value);
                                    setErrors((prev) => ({ ...prev, razon: undefined}));
                                }}
                            />

                            {/* GIRO COMERCIAL */}
                            <Textfield 
                                label={<>
                                    Giro: 
                                    {errors.giro && (
                                        <span className="text-red-300 font-black"> - {errors.giro} </span>
                                    )}
                                </>}
                                classNameInput={errors.giro && ("ring-red-400 ring-2")}
                                placeholder="Prestación de soluciones informáticas"
                                value={giro}
                                onChange={(e) => {
                                    setGiro(e.target.value);
                                    setErrors((prev) => ({ ...prev, giro: undefined}));
                                }}
                            />

                            {/* COMUNA */}
                            <Textfield 
                                label={<>
                                    Comuna: 
                                    {errors.comuna && (
                                        <span className="text-red-300 font-black"> - {errors.comuna} </span>
                                    )}
                                </>}
                                classNameInput={errors.comuna && ("ring-red-400 ring-2")}
                                placeholder="Punta Arenas"
                                value={comuna}
                                onChange={(e) => {
                                    setComuna(e.target.value);
                                    setErrors((prev) => ({ ...prev, comuna: undefined}));
                                }}
                            />

                            {/* DIRECCIÓN */}
                            <Textfield 
                                label={<>
                                    Dirección: 
                                    {errors.direccion && (
                                        <span className="text-red-300 font-black"> - {errors.direccion} </span>
                                    )}
                                </>}
                                classNameInput={errors.direccion && ("ring-red-400 ring-2")}
                                placeholder="Av. España 9999"
                                value={direccion}
                                onChange={(e) => {
                                    setDireccion(e.target.value);
                                    setErrors((prev) => ({ ...prev, direccion: undefined}));
                                }}
                            />

                            {/* TELÉFONO */}
                            <Textfield 
                                label="Teléfono (Opcional):" 
                                type="phone" 
                                placeholder="912345678"
                                value={telefono}
                                onChange={(e) => {
                                    setTelefono(e.target.value)
                                }}
                            />

                            {/* CORREO */}
                            <Textfield 
                                label="Correo (Opcional):" 
                                type="email"
                                placeholder="Ejemplo@ejemplo.ej"
                                value={correo}
                                onChange={(e) => {
                                    setCorreo(e.target.value)
                                }} 
                            />
                        </div>
                        <div className="grid grid-rows-1 grid-cols-2 gap-x-32 mt-4">
                            {/* CLIENTE */}
                            <CheckboxDropdown 
                                label="¿Es cliente?" 
                                items={[
                                    <Textfield label="Días de crédito:" type="number" classNameInput="w-16 h-6 self-center"/>, 
                                ]}
                                value={esCliente}
                                onChange={(newValue) => {
                                    setEsCliente(newValue)
                                }}
                            />
                            {/* PROVEEDOR */}
                            <CheckboxDropdown 
                                label="¿Es Proveedor?" 
                                items={[
                                    <Textfield label="Días de crédito:" type="number" classNameInput="w-16 h-6 self-center"/>, 
                                ]}
                                value={esProveedor}
                                onChange={(newValue) => {
                                    setEsProveedor(newValue)
                                }}
                            /> 
                        </div>
                        <YButton 
                            text="Guardar"
                            onClick={handleNewEmpresa}
                        />
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
