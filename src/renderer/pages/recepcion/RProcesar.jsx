import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, YButton, TextButton, XButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { SearchBar } from "../../components/Textfield";

import { doc, setDoc, getDoc, getDocs, where, query, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";
import { formatCLP } from "../../utils/formatCurrency";

const RProcesar = () => {
    const navigate = useNavigate();

    // Referencia a la colección "empresas"
    useEffect(() => {
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

    //INFORMACION EMPRESAS
    const [giro, setGiro] = useState(null);
    const [giroRut, setGiroRut] = useState(null);

    //DOCUMENTOS
    const [facturas, setFacturas] = useState([]);
    const [facturasEx, setFacturasEx] = useState([]);
    const [notasCredito, setNotasCredito] = useState([]);

    const [documentosAgregados, setDocumentosAgregados] = useState([]);

    //VALORES LOCALES
    const totalDocumentos = documentosAgregados.reduce(
        (acc, doc) => acc + (doc.total || 0),
        0
      );

    //OBTENCION DE DOCUMENTOS PARA EMPRESA SELECCIONADA
    useEffect(() => {
        const handleRecibirDocs = async () => {
          if (!giroRut) return; // no hay empresa seleccionada todavía
      
          try {
            const facturasRef = collection(db, "empresas", String(giroRut), "facturas");
            const facturasQuery = query(facturasRef, where("formaPago", "==", "Crédito")); // Facturas crédito
            const notasCreditoRef = collection(db, "empresas", String(giroRut), "notasCredito");
      
            const facturasSnap = await getDocs(facturasQuery);
            const notasCreditoSnap = await getDocs(notasCreditoRef);
      
            // Mapeo de facturas
            let fact = facturasSnap.docs.map((doc) => ({
              id: doc.id,
              giroRut: giroRut, // agregar giroRut
              ...doc.data(),
            }));
      
            // Filtrar facturas que ya están en documentosAgregados
            fact = fact.filter(
              (f) =>
                !documentosAgregados.some(
                  (d) => d.numeroDoc === f.numeroDoc && d.giroRut === f.giroRut
                )
            );
      
            const NC = notasCreditoSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
      
            setFacturas(fact);
            setNotasCredito(NC);
      
            console.log("Facturas filtradas:", fact);
            console.log("Notas de Crédito:", NC);
          } catch (error) {
            console.error("Error al traer documentos:", error);
          }
        };
      
        handleRecibirDocs();
      }, [giroRut, documentosAgregados]);


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
                                    <div className="w-1/3 text-center">{formatCLP(row.total)}</div>
                                    <TextButton 
                                        className="py-0 my-0 h-6 bg-white text-black font-black hover:bg-white/70 active:bg-white/50 mr-3"
                                        text="+"
                                        onClick={() => {
                                                // Agregar a documentosAgregados
                                                setDocumentosAgregados((prev) => [
                                                ...prev,
                                                {
                                                    numeroDoc: row.numeroDoc,
                                                    giroRut: giroRut,
                                                    total: row.total,
                                                }
                                                ]);

                                                // Eliminar la fila actual de facturas
                                                setFacturas((prev) => prev.filter((f) => f.numeroDoc !== row.numeroDoc));
                                            }
                                         }
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
                <hr className="my-4 border-transparent" />
                <div className="flex gap-4 justify-between">
                    <Card   
                        hasButton={false} 
                        contentClassName="w-96 h-64 overflow-y-auto scrollbar-custom flex flex-col w-full"
                        className="w-[60%]"
                        content={
                            <div>
                                {/* Encabezados */}
                                <div className="text-center font-bold mb-2 px-0">
                                    Documentos agregados
                                </div>
                                <hr className="mb-4" />
                                
                                {/* Filas dinámicas */}
                                {documentosAgregados.map((row, index) => (
                                    <div key={index} className="flex justify-between mb-2">
                                        <div className="w-1/3 text-center">{formatRUT(row.giroRut)}</div>
                                        <div className="w-1/3 text-center">{row.numeroDoc}</div>
                                        <div className="w-1/3 text-center">{formatCLP(row.total)}</div>
                                        <TextButton 
                                        className="py-0 my-0 h-6 bg-white text-black font-black hover:bg-white/70 active:bg-white/50 mr-3"
                                        text="-"
                                        onClick={async () => {
                                            // Eliminar solo el documento correcto de documentosAgregados
                                            setDocumentosAgregados((prev) =>
                                              prev.filter((f) => !(f.numeroDoc === row.numeroDoc && f.giroRut === row.giroRut))
                                            );
                                          
                                            // Solo actualizar facturas si coincide con la empresa seleccionada
                                            if (row.giroRut === giroRut) {
                                              try {
                                                const docRef = doc(db, "empresas", String(row.giroRut), "facturas", row.numeroDoc);
                                                const docSnap = await getDoc(docRef);
                                          
                                                if (docSnap.exists()) {
                                                  const facturaData = {
                                                    id: docSnap.id,
                                                    giroRut: row.giroRut,
                                                    ...docSnap.data()
                                                  };
                                          
                                                  setFacturas((prev) => [...prev, facturaData]);
                                                } else {
                                                  console.warn("No se encontró el documento en Firestore:", row.numeroDoc);
                                                }
                                              } catch (error) {
                                                console.error("Error al recuperar documento de Firestore:", error);
                                              }
                                            }
                                          }}
                                          
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
                    <div className="flex flex-col">
                        <Card
                            hasButton={false} 
                            contentClassName="w-96 h-44 overflow-y-auto scrollbar-custom flex flex-col w-full"
                            className="w-[100%]"
                            content={
                                <div>
                                    <div className="text-center font-bold mb-2 px-0">
                                        Monto a cancelar
                                    </div>
                                    <hr className="mb-4" />
                                    <div className="grid grid-cols-2 grid-rows-3 gap-y-4 gap-x-4">
                                        <div>Facturas electrónicas: </div>
                                        <div>{formatCLP(totalDocumentos)}</div>
                                        <div></div>
                                        <div></div>
                                        <div>Monto total:</div>
                                        <div>{formatCLP(totalDocumentos)}</div>
                                    </div>
                                </div>
                            }
                        />
                        <div className="flex justify-between mt-8">
                            <XButton className="h-8 text-xl" text="Borrar"/>
                            <YButton className="h-8 text-xl" text="Procesar"/>
                        </div>
                        
                    </div>
                    
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
