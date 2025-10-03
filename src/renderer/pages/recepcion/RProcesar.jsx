import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, YButton, TextButton, XButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { SearchBar } from "../../components/Textfield";
import { Modal } from "../../components/modal";

import { doc, updateDoc, setDoc, getDoc, getDocs, where, query, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";
import { formatCLP } from "../../utils/formatCurrency";

import jsPDF from "jspdf";
import { generarPDF } from "../../utils/generarPDF";

import { getAuth } from "firebase/auth";

const RProcesar = () => {
    const navigate = useNavigate();

    const [userId, setUserId] = useState("");
  
    useEffect(() => {
      const auth = getAuth();
      const user = auth.currentUser;
  
      if (user) {
        setUserId(user.email);
      }
    }, []);

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

    //MODAL
    const[loadingModal, setLoadingModal] = useState(false);
    const[procesarModal, setProcesarModal] = useState(false);

    //OBTENCION DE DOCUMENTOS PARA EMPRESA SELECCIONADA
    useEffect(() => {
        const handleRecibirDocs = async () => {
          if (!giroRut) return; // no hay empresa seleccionada todavía
      
          try {
            setLoadingModal(true);
            const facturasRef = collection(db, "empresas", String(giroRut), "facturas");
            const facturasQuery = query(facturasRef, where("formaPago", "==", "Crédito"), where("estado", "in", ["pendiente", "vencido"])); // Facturas crédito no pagadas
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
            setLoadingModal(false);
            //console.log("Facturas filtradas:", fact);
            //console.log("Notas de Crédito:", NC);
            console.log("documentos agregados: ",documentosAgregados);
          } catch (error) {
            console.error("Error al traer documentos:", error);
          }
        };
      
        handleRecibirDocs();
      }, [giroRut]); //,documentosAgregados

      const handleProcesarDocs = async () => {
        try {
          setLoadingModal(true);
          const fechaActual = new Date();
      
          // 1. Agrupar facturas por rut empresa
          const facturasPorEmpresa = {};
          documentosAgregados.forEach((docAgregado) => {
            if (!facturasPorEmpresa[docAgregado.giroRut]) {
              facturasPorEmpresa[docAgregado.giroRut] = [];
            }
            facturasPorEmpresa[docAgregado.giroRut].push(docAgregado.numeroDoc);
          });
      
          // 2. Actualizar estado de facturas a "pagado" y sus notas de crédito asociadas también
          await Promise.all(
            documentosAgregados.map(async (docAgregado) => {
              const { giroRut, numeroDoc } = docAgregado;
      
              const facturaRef = doc(db, "empresas", String(giroRut), "facturas", String(numeroDoc));
              await updateDoc(facturaRef, { estado: "pagado", pagoUsuario: userId, fechaPago : fechaActual});
      
              // Leer la factura para ver si tiene notas de crédito asociadas
              const facturaSnap = await getDoc(facturaRef);
              if (facturaSnap.exists()) {
                const facturaData = facturaSnap.data();
                if (facturaData.notasCredito && facturaData.notasCredito.length > 0) {
                  // Marcar todas las NC asociadas como "pagado"
                  await Promise.all(
                    facturaData.notasCredito.map(async (ncNum) => {
                      const ncRef = doc(db, "empresas", String(giroRut), "notasCredito", String(ncNum));
                      await updateDoc(ncRef, { estado: "pagado", pagoUsuario: userId, fechaPago : fechaActual });
                    })
                  );
                }
              }
            })
          );
      
          // 3. Obtener el nuevo número de egreso
          const numeroEgreso = await generarNumeroEgreso();
      
          // 4. Crear documento en pago_recepcion
          const pagoRef = doc(db, "pago_recepcion", String(numeroEgreso));
          await setDoc(pagoRef, {
            numeroEgreso,
            fecha: new Date(),
            totalEgreso: totalDocumentos,
            facturas: await Promise.all(
              Object.entries(facturasPorEmpresa).map(async ([rut, facturas]) => {
                const facturasConNotas = await Promise.all(
                  facturas.map(async (facturaNum) => {
                    const facturaRef = doc(db, "empresas", rut, "facturas", facturaNum);
                    const facturaSnap = await getDoc(facturaRef);
                    if (!facturaSnap.exists()) return null;
                    const facturaData = facturaSnap.data();
      
                    let notasCreditoDetalle = [];
                    if (facturaData.notasCredito && facturaData.notasCredito.length > 0) {
                      notasCreditoDetalle = await Promise.all(
                        facturaData.notasCredito.map(async (ncNum) => {
                          const ncRef = doc(db, "empresas", rut, "notasCredito", ncNum);
                          const ncSnap = await getDoc(ncRef);
                          return ncSnap.exists() ? ncSnap.data() : null;
                        })
                      );
                    }
      
                    return {
                      numeroDoc: facturaData.numeroDoc,
                      total: facturaData.total,
                      totalDescontado: facturaData.totalDescontado ?? facturaData.total,
                      abonoNc: facturaData.abonoNc ?? 0,
                      notasCredito: notasCreditoDetalle.filter(Boolean),
                    };
                  })
                );
      
                return {
                  rut,
                  facturas: facturasConNotas.filter(Boolean),
                };
              })
            ),
          });
      
          // 5. Generar PDF
          generarPDF(
            numeroEgreso,
            Object.entries(facturasPorEmpresa).map(([rut, facturas]) => ({
              rut,
              facturas,
            })),
            totalDocumentos
          );
      
          console.log("Pago registrado correctamente");
          setProcesarModal(false);
          setDocumentosAgregados([]);
          setLoadingModal(false);
        } catch (error) {
          console.error("Error al procesar documentos", error);
          setLoadingModal(false);
        }
      };

      const generarNumeroEgreso = async () => {
        const pagosSnap = await getDocs(collection(db, "pago_recepcion"));
        let maxEgreso = 0;
      
        pagosSnap.forEach((pago) => {
          const num = pago.data().numeroEgreso || 0;
          if (num > maxEgreso) {
            maxEgreso = num;
          }
        });
      
        return maxEgreso + 1;
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
                                <div className="w-1/4 text-center">Número de documento</div>
                                <div className="w-1/4 text-center">Fecha de vencimiento</div>
                                <div className="w-1/4 text-center">Estado</div>
                                <div className="w-1/4 text-center">Monto</div>
                                <div className="mr-10"></div>
                            </div>
                            <hr className="mb-4" />
                            {/* Filas dinámicas */}
                            {facturas.map((row, index) => (
                                <div key={index} className="flex justify-between mb-2">
                                    <div className="w-1/3 text-center">{row.numeroDoc}</div>
                                    <div className="w-1/3 text-center">{row.fechaV ? new Date(row.fechaV.seconds * 1000).toLocaleDateString() : ""}</div>
                                    <div className="w-1/3 text-center">{row.estado}</div>
                                    <div className="w-1/3 text-center">{formatCLP(row.totalDescontado ?? row.total)}</div>
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
                                                    total: (row.totalDescontado ?? row.total),
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
                        contentClassName="h-64 overflow-y-auto scrollbar-custom flex flex-col w-full"
                        className="min-w-[60%]"
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
                    <div className="flex flex-col w-[39%]">
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
                            <YButton 
                                className="h-8 text-xl" 
                                text="Procesar"
                                onClick={() => setProcesarModal(true)}
                            />
                        </div>
                        
                    </div>
                </div>
                {procesarModal && (
                    <Modal className="-translate-y-48 w-[70%] min-w-[70%]" onClickOutside={() => setProcesarModal(false)}>
                        <p className="text-2xl font-black mb-4 justify-self-center">FACTURAS A PROCESAR</p>
                        
                        <Card 
                            hasButton={false}
                            contentClassName="w-full h-52 overflow-y-auto scrollbar-custom"
                            className="w-full mb-12"
                            content={
                                <div>
                                    <div className="flex justify-between font-bold mb-2">
                                        <div className="w-1/3 text-center">RUT</div>
                                        <div className="w-1/3 text-center">Número de documento</div>
                                        <div className="w-1/3 text-center">Monto</div>
                                    </div>
                                    <hr className="mb-4" />
                                    {documentosAgregados.map((row, index) => (
                                    <div key={index} className="flex justify-between mb-2">
                                        <div className="w-1/3 text-center">{formatRUT(row.giroRut)}</div>
                                        <div className="w-1/3 text-center">{row.numeroDoc}</div>
                                        <div className="w-1/3 text-center">{formatCLP(row.total)}</div>
                                    </div>))}
                                </div>
                            }
                        />
                        {documentosAgregados.length != 0 && (
                            <div className="flex flex-col">
                                <p className="text-xl font-black mr-5 self-end">Total Egreso: {formatCLP(totalDocumentos)}</p>
                                <div className="flex justify-between mt-2">
                                    <XButton 
                                        className="ml-5" 
                                        text="Cancelar"
                                        onClick={() => setProcesarModal(false)} 
                                    />
                                    <YButton 
                                        className="mr-5" 
                                        text="Aceptar"
                                        onClick={() => handleProcesarDocs()}
                                    />
                                </div>
                            </div>
                            )}
                        

                    </Modal>
                )}

                {loadingModal && (
                      <Modal>
                          <p className="font-black">Cargando</p>
                      </Modal>
                )}
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
    );
};

export default RProcesar;
