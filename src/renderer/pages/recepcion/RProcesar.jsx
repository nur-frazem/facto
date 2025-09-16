import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, YButton, TextButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { SearchBar } from "../../components/Textfield";

import { doc, setDoc, getDoc, getDocs, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";

const RProcesar = () => {
    const navigate = useNavigate();

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

    const [rows, setRows] = useState([]);

    const [giro, setGiro] = useState(null);
    const [giroRut, setGiroRut] = useState(null);
    const [tipoDoc, setTipoDoc] = useState(null);
    const [docs, setDocs] = useState([]);
    const [rowss, setRowss] = useState([]); // <- Aquí guardamos las filas de la "tabla"

    const [facturas, setFacturas] = useState([]);
    const [facturasEx, setFacturasEx] = useState([]);
    const [notasCredito, setNotasCredito] = useState([]);

    useEffect(() => {
        const handleRecibirDocs = async () => {
          if (!giroRut) return; // no hay empresa seleccionada todavía
      
          try {
            const facturasRef = collection(db, "empresas", String(giroRut), "facturas");
            const notasCreditoRef = collection(db, "empresas", String(giroRut), "notasCredito");
      
            const facturasSnap = await getDocs(facturasRef);
            const notasCreditoSnap = await getDocs(notasCreditoRef);
      
            const fact = facturasSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
      
            const NC = notasCreditoSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
      
            setFacturas(fact);
            setNotasCredito(NC);
      
            console.log("Facturas:", fact);
            console.log("Notas de Crédito:", NC);
          } catch (error) {
            console.error("Error al traer documentos:", error);
          }
        };
      
        handleRecibirDocs();
      }, [giroRut]); 
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
            <div className="flex flex-col flex-wrap justify-start mt-2 ml-5 mr-5">
                <div className="grid grid-cols-3 grid-rows-1 gap-x-10 mb-2">

                    {/* Selección de giro */}
                    <DropdownMenu
                        tittle={
                            <>
                                Seleccione empresa
                            </>
                            }
                        items={rows.map((row) => `${formatRUT(row.rut)} ${row.razon}`)}
                        value={giro}
                        onSelect={
                            (item) => {setGiro(item);
                            const rutSolo = item.split(" ")[0];
                            setGiroRut(cleanRUT(rutSolo));
                        }}
                    />
                </div>

                {/* Tabla dinámica */}
                <Card   
                    hasButton={false} 
                    contentClassName="w-96 h-64 overflow-y-auto scrollbar-custom flex flex-col w-full"
                    content={
                        <div>
                            {/* Encabezados */}
                            <div className="flex justify-between font-bold mb-2">
                                <div className="w-1/3 text-center">Número de documento</div>
                                <div className="w-1/3 text-center">Fecha de vencimiento</div>
                                <div className="w-1/3 text-center">Monto</div>
                                <div className="mr-10"></div>
                            </div>
                            <hr className="mb-4" />
                            {/* Filas dinámicas */}
                            {facturas.map((row, index) => (
                                <div key={index} className="flex justify-between mb-2">
                                    <div className="w-1/3 text-center">{row.numeroDoc}</div>
                                    <div className="w-1/3 text-center">{row.fechaV ? new Date(row.fechaV.seconds * 1000).toLocaleDateString() : ""}</div>
                                    <div className="w-1/3 text-center">{row.total}</div>
                                    <TextButton 
                                        className="py-0 my-0 h-6 bg-white text-black font-black hover:bg-white/70 active:bg-white/50 mr-3"
                                        text="+"    
                                    />
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
                <hr className="my-4" />
                <div className="flex gap-4 justify-between">
                    <Card   
                        hasButton={false} 
                        contentClassName="w-96 h-64 overflow-y-auto scrollbar-custom flex flex-col w-full"
                        className="w-1/2"
                        content={
                            <div>
                                {/* Encabezados */}
                                <div className="text-center font-bold mb-2 px-0">
                                    Documentos agregados
                                </div>
                                <hr className="mb-4" />
                                
                                {/* Filas dinámicas */}
                                {rows.map((row, index) => (
                                    <div key={index} className="flex justify-between mb-2">
                                        <div className="w-1/3 text-center">{row.rut}</div>
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
                    <Card
                        hasButton={false} 
                        contentClassName="w-96 h-64 overflow-y-auto scrollbar-custom flex flex-col w-full"
                        className="w-1/2"
                        content={
                            <div>
                                <div className="text-center font-bold mb-2 px-0">
                                    Monto a cancelar
                                </div>
                                <hr className="mb-4" />
                                <div className="grid grid-cols-2 grid-rows-5 gap-y-4 gap-x-4">
                                    <div>Facturas electrónicas: </div>
                                    <div>$3.453.121</div>
                                    <div>Facturas Exentas:</div>
                                    <div>$0</div>
                                    <div>Notas de credito:</div>
                                    <div>$121</div>
                                    <div></div>
                                    <div></div>
                                    <div>Monto total:</div>
                                    <div>$3.453.000</div>
                                </div>
                            </div>
                        }
                    />
                </div>
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
    );
};

export default RProcesar;
