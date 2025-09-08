import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, TextButton, YButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList, SearchBar, Textfield, CheckboxDropdown } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { Modal } from "../../components/modal";

import { doc, setDoc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig"; // ajusta la ruta a tu config

import { formatRUT } from "../../utils/formatRUT";


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

    useEffect(() => {
        // Referencia a la colección "empresas"
        const empresasRef = collection(db, "empresas");
    
        // Suscribirse a los cambios en tiempo real
        const unsubscribe = onSnapshot(empresasRef, (snapshot) => {
            const empresasData = snapshot.docs.map(doc => doc.data());
            setRows(empresasData);
        }, (error) => {
            console.error("Error obteniendo empresas:", error);
        });
    
        // Cleanup cuando el componente se desmonte
        return () => unsubscribe();
    }, []);

    // Estado de errores
    const [errorRut, setErrorRut] = useState("");
    const [errors, setErrors] = useState({});
    const ECampo = "!";
    const handleNewEmpresa = async () => {
        let newErrors = {};
        
        // rut obligatorio
        if (!rut) newErrors.rut = ECampo;
        if (!razon) newErrors.razon = ECampo;
        if (!giro) newErrors.giro = ECampo;
        if (!comuna) newErrors.comuna = ECampo;
        if (!direccion) newErrors.direccion = ECampo;
        
        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            {/* ENVIAR VALORES AL BACKEND */}
            const empresa = {
                rut,
                razon,
                giro,
                comuna,
                direccion,
                telefono,
                correo,
                cliente : esCliente,
                proveedor : esProveedor,
                credito_cliente : creditoCliente,
                credito_proveedor : creditoProveedor
              };
            
            // Guardar en Firestore usando rut como ID
            try {
                const empresaRef = doc(db, "empresas", rut);
                const docSnap = await getDoc(empresaRef);
    
                if (docSnap.exists()) {
                    // Documento ya existe
                    console.warn("Este RUT ya existe");
                    setErrorRut("Este rut ya existe");
                    return;
                }
    
                // Documento no existe, creamos uno nuevo
                await setDoc(empresaRef, empresa);
    
                setShowModal(false);
                handleResetParams();

              } catch (err) {
                console.error("Error guardando empresa:", err);
              }
         }
    };
    
    const [rows, setRows] = useState([]); // <- Aquí guardamos las filas de la "tabla"

    const [showModal, setShowModal] = useState(false);

    const handleModal = () => {
        setShowModal(true);
    }

    const handleResetParams = () => {
        setRut("");
        setRazon("");
        setGiro("");
        setComuna("");
        setDireccion("");
        setTelefono("");
        setCorreo("");
        setEsCliente(false);
        setEsProveedor(false);
        setCreditoCliente(0);
        setCreditoProveedor(0);
    }

    const handleEmpresaPrint = () => {
        console.log("rut: " + rut);
        console.log("razon: " + razon);
        console.log("giro: " + giro);
        console.log("comuna: " + comuna);
        console.log("dirección: " + direccion);
        console.log("teléfono: " + telefono);
        console.log("correo: " + correo);
        console.log("es cliente: " + esCliente);
        console.log("dias crédito: " + creditoCliente);
        console.log("es proveedor: " + esProveedor);
        console.log("dias crédito: " + creditoProveedor);
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
                            <div className="flex font-bold mb-2 px-0">
                                <div className="w-1/5 text-center">RUT</div>
                                <div className="w-1/5 text-center">Razón social</div>
                                <div className="w-1/5 text-center">Giro</div>
                                <div className="w-1/5 text-center">Cliente</div>
                                <div className="w-1/5 text-center">Proveedor</div>
                                <div className="mr-20"></div>
                            </div>
                            <hr className="mb-4" />
                            <SearchBar></SearchBar>
                            {/* Filas dinámicas */}
                            {rows.map((row, index) => (
                                <div key={index} className="flex mb-2 px-0 pt-2">
                                    <div className="w-1/5 text-center">{formatRUT(row.rut)}</div>
                                    <div className="w-1/5 text-center">{row.razon}</div>
                                    <div className="w-1/5 text-center">{row.giro}</div>
                                    <div className="w-1/5 text-center">
                                        {row.cliente ? <span className="text-green-500 font-bold">✔</span> : <span className="text-red-500 font-bold">✖</span>}
                                    </div>
                                    <div className="w-1/5 text-center">
                                        {row.proveedor ? <span className="text-green-500 font-bold">✔</span> : <span className="text-red-500 font-bold">✖</span>}
                                    </div>
                                    <TextButton 
                                        className="py-0 my-0 h-6 bg-white text-black font-black hover:bg-white/70 active:bg-white/50 mr-3" 
                                        text="Editar" 
                                    />
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
                                    <Textfield 
                                        label="Días de crédito:" 
                                        type="number" 
                                        classNameInput="w-16 h-6 self-center"
                                        value={creditoCliente}
                                        onChange={(e) => {
                                            const value = Math.min(Number(e.target.value), 999);
                                            setCreditoCliente(value);
                                        }}
                                        />
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
                                    <Textfield 
                                        label="Días de crédito:" 
                                        type="number" 
                                        value={creditoProveedor} 
                                        classNameInput="w-16 h-6 self-center"
                                        onChange={(e) => {
                                            const value = Math.min(Number(e.target.value), 999);
                                            setCreditoProveedor(value);
                                        }} 
                                    />
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

                {errorRut && (
                    <Modal onClickOutside={() => setErrorRut("")}>
                        <div className="flex flex-col items-center gap-4 p-4">
                            <p className="text-red-500 font-bold">{errorRut}</p>
                            <YButton
                                text="Cerrar"
                                onClick={() => setErrorRut("")}
                            />
                        </div>
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
