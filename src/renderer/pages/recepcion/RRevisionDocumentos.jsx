import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, TextButton } from "../../components/Button";
import { DropdownMenu } from "../../components/Textfield";

import { doc, updateDoc, setDoc, getDoc, getDocs, where, query, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { Card } from "../../components/Container";

const RRevisionDocumentos = () => {
    const navigate = useNavigate();

    const [empresasConDocs, setEmpresasConDocs] = useState([]);

    useEffect(() => {
      const empresasRef = collection(db, "empresas");

      // escuchar todas las empresas
      const unsubscribeEmpresas = onSnapshot(empresasRef, (snapshotEmpresas) => {
        const promises = snapshotEmpresas.docs.map((empresaDoc) => {
          const empresaData = empresaDoc.data();
          const rut = empresaDoc.id;

          // subcolecciones: facturas, boletas y notasCredito
          const subcolecciones = ["facturas", "boletas", "notasCredito"];

          const listeners = subcolecciones.map((sub) => {
            return new Promise((resolve) => {
              const subRef = collection(db, "empresas", rut, sub);

              const unsubscribeSub = onSnapshot(subRef, (snapshotDocs) => {
                const docsData = snapshotDocs.docs.map((d) => ({
                  id: d.id,
                  ...d.data(),
                  tipo: sub, // agregamos el tipo (factura, boleta, notaCredito)
                }));
                resolve(docsData);
              });

              // retornamos la función de cleanup para cerrar este listener
              return unsubscribeSub;
            });
          });

          return Promise.all(listeners).then((resultados) => {
            // aplanamos facturas+boletas+notasCredito
            let documentos = resultados.flat();
          
            // ordenar primero por tipo (facturas, boletas, notasCredito),
            // y dentro de cada tipo, por numeroDoc ASC
            const ordenTipo = { facturas: 1, boletas: 2, notasCredito: 3 };
          
            documentos.sort((a, b) => {
              if (a.tipo !== b.tipo) {
                return ordenTipo[a.tipo] - ordenTipo[b.tipo];
              }
              // asegurar que numeroDoc sea tratado como número
              const numA = Number(a.numeroDoc) || 0;
              const numB = Number(b.numeroDoc) || 0;
              return numA - numB;
            });
          
            return {
              rut,
              razon: empresaData.razon,
              documentos,
            };
          });
        });

        Promise.all(promises).then((empresas) => {
          // filtramos empresas sin documentos
          const filtradas = empresas.filter((e) => e.documentos.length > 0);
          //console.log("Empresas con docs", JSON.stringify(filtradas, null, 2));
          setEmpresasConDocs(filtradas);
        });
      });

      return () => unsubscribeEmpresas();
    }, []);

    // Referencia a la coleccion "Values"
      useEffect(() => {


        const tipoDocRef = doc(db, "values", "tipo-doc");
        const fetchTipoDoc = async () => {
          try {
            const tipoDocSnap = await getDoc(tipoDocRef);
            if (tipoDocSnap.exists()) {
              // tipoDocSnap.data() devuelve un objeto {0: "Todos", 1: "Factura electrónica", ...}
              const data = tipoDocSnap.data();
              // Convertimos a array de strings
              const arrayData = Object.values(data);
              setRowTipoDoc(arrayData);
            } else {
              console.warn("Documento 'tipo-doc' no existe");
            }
          } catch (error) {
            console.error("Error obteniendo tipo de documentos:", error);
          }
        };
        fetchTipoDoc();
    
        const formaPagoRef = doc(db, "values", "formas-pago");
        const fetchFormaPago = async () => {
          try {
            const formaPagoSnap = await getDoc(formaPagoRef);
            if (formaPagoSnap.exists()) {
              const data = formaPagoSnap.data();
              // Convertimos a array de strings
              const arrayFormaPagoData = Object.values(data);
              setRowFormaPago(arrayFormaPagoData);
            } else {
              console.warn("Documento 'formas-pago' no existe");
            }
          } catch (error) {
            console.error("Error obteniendo formas de pago:", error);
          }
        };
        fetchFormaPago();

        const estadoDocRef = doc(db, "values", "estado-pago");
        const fetchEstadoDoc = async () => {
          try {
            const estadoPagoSnap = await getDoc(estadoDocRef);
            if (estadoPagoSnap.exists()) {
              const data = estadoPagoSnap.data();
              // Convertimos a array de strings
              const arrayEstadoPagoData = Object.values(data);
              setRowEstadoDoc(arrayEstadoPagoData);
            } else {
              console.warn("Documento 'estado-pago' no existe");
            }
          } catch (error) {
            console.error("Error obteniendo estados de pago:", error);
          }
        };
        fetchEstadoDoc();


      }, []);
      const [rowTipoDoc, setRowTipoDoc] = useState([]);
      const [rowFormaPago, setRowFormaPago] = useState([]);
      const [rowEstadoDoc, setRowEstadoDoc] = useState([]);

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
                <H1Tittle text="Revisión de documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start gap-4 mt-2 ml-5 mr-5">
                <div className="flex gap-12">
                    <DropdownMenu 
                    classNameMenu="w-60"
                    tittle="Tipo documento"
                    items={rowTipoDoc.map((item) => item)}
                    />
                    <DropdownMenu 
                    classNameMenu="w-60"
                    tittle="Estado de documentos"
                    items={rowEstadoDoc.map((item) => item)}
                    />
                    <DropdownMenu 
                    classNameMenu="w-60"
                    tittle="Forma de pago"
                    items={rowFormaPago.map((item) => item)}
                    />

                    <TextButton 
                      text="Buscar" 
                      className="bg-white self-center mt-5 hover:bg-white/60 active:bg-white/30 h-7" 
                      classNameText="font-black"
                    />

                </div>

                <Card
                  hasButton={false}
                  contentClassName="max-h-[calc(100vh-20rem)] overflow-y-auto scrollbar-custom flex flex-col w-full"
                  content={
                    <div>
                      {/* Encabezado (reemplaza el bloque del encabezado actual) */}
                      <div className="flex items-center font-bold mb-2">
                        <div className="w-[20%] text-center text-sm">Tipo documento</div>
                        <div className="w-[10%] text-center text-sm">N° Folio</div>
                        <div className="w-[15%] text-center text-sm">Fecha emisión</div>
                        <div className="w-[15%] text-center text-sm">Fecha Vencimiento</div>
                        <div className="w-[20%] text-center text-sm">Monto</div>
                        <div className="w-[10%] text-center text-sm">Estado folio</div>
                        <div className="w-[10%] text-center text-sm"></div>
                      </div>

                      <hr className="mb-4" />

                      {/* Contenido dinámico (reemplaza tu bloque actual) */}
                      <div className="flex flex-col">
                        {empresasConDocs.map((empresa) => (
                          <div key={empresa.rut} className="mb-4">
                            {/* Encabezado empresa */}
                            <div className="flex gap-6 items-center p-2 bg-black/10 border border-black mb-2">
                              <p className="font-semibold">RUT: {empresa.rut}</p>
                              <p className="font-semibold">NOMBRE: {empresa.razon}</p>
                            </div>

                            {/* Documentos */}
                            {empresa.documentos.map((doc) => (
                              <div
                                key={`${empresa.rut}-${doc.tipo}-${doc.id}`}
                                className="flex items-center mb-1 border-b py-2"
                              >
                                <div className="w-[20%] text-center text-sm whitespace-nowrap overflow-hidden truncate px-2">
                                  {doc.tipo === "facturas"
                                    ? "Factura electrónica"
                                    : doc.tipo === "boletas"
                                    ? "Boleta"
                                    : "Nota de crédito"}
                                </div>

                                <div className="w-[10%] text-center text-sm whitespace-nowrap overflow-hidden truncate px-2">
                                  {doc.numeroDoc ?? "-"}
                                </div>

                                <div className="w-[15%] text-center text-sm whitespace-nowrap overflow-hidden truncate px-2">
                                  {doc.fechaE?.toDate ? doc.fechaE.toDate().toLocaleDateString("es-CL") : "-"}
                                </div>

                                <div className="w-[15%] text-center text-sm whitespace-nowrap overflow-hidden truncate px-2">
                                  {doc.fechaV?.toDate ? doc.fechaV.toDate().toLocaleDateString("es-CL") : "-"}
                                </div>

                                <div className="w-[20%] text-center text-sm whitespace-nowrap overflow-hidden truncate px-2">
                                  {doc.total != null ? `$${doc.total.toLocaleString("es-CL")}` : "-"}
                                </div>

                                <div className="w-[10%] text-center text-sm whitespace-nowrap overflow-hidden truncate px-2">
                                  {doc.estado ?? "-"}
                                </div>

                                {/* espacio final (acciones) */}
                                <div className="w-[10%] text-center text-sm px-2"></div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
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

export default RRevisionDocumentos;