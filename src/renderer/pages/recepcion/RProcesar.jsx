import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, YButton, TextButton, XButton } from "../../components/Button";
import { DropdownMenu, DropdownMenuList } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { SearchBar } from "../../components/Textfield";
import { Modal, LoadingModal } from "../../components/modal";

import { doc, updateDoc, setDoc, getDoc, getDocs, where, query, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";
import { formatCLP } from "../../utils/formatCurrency";
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

    // OBTENCIÓN DE DOCUMENTOS PARA EMPRESA SELECCIONADA
    useEffect(() => {
        const handleRecibirDocs = async () => {
          if (!giroRut) return;

          try {
            setLoadingModal(true);

            // Facturas electrónicas a crédito no pagadas
            const facturasRef = collection(db, "empresas", String(giroRut), "facturas");
            const facturasQuery = query(
              facturasRef,
              where("formaPago", "==", "Crédito"),
              where("estado", "in", ["pendiente", "vencido"])
            );
            const facturasSnap = await getDocs(facturasQuery);

            // Facturas exentas a crédito no pagadas
            const facturasExentasRef = collection(db, "empresas", String(giroRut), "facturasExentas");
            const facturasExentasQuery = query(
              facturasExentasRef,
              where("formaPago", "==", "Crédito"),
              where("estado", "in", ["pendiente", "vencido"])
            );
            const facturasExentasSnap = await getDocs(facturasExentasQuery);

            // Notas de crédito
            const notasCreditoRef = collection(db, "empresas", String(giroRut), "notasCredito");
            const notasCreditoSnap = await getDocs(notasCreditoRef);

            // Mapear facturas electrónicas
            let factElec = facturasSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              giroRut: giroRut,
              tipoDoc: "facturas",
              tipoDocLabel: "Factura electrónica",
              ...docSnap.data(),
            }));

            // Mapear facturas exentas
            let factExentas = facturasExentasSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              giroRut: giroRut,
              tipoDoc: "facturasExentas",
              tipoDocLabel: "Factura exenta",
              ...docSnap.data(),
            }));

            // Combinar todas las facturas
            let todasFacturas = [...factElec, ...factExentas];

            // Filtrar las que ya están en documentosAgregados
            todasFacturas = todasFacturas.filter(
              (f) =>
                !documentosAgregados.some(
                  (d) => d.numeroDoc === f.numeroDoc && d.giroRut === f.giroRut && d.tipoDoc === f.tipoDoc
                )
            );

            const NC = notasCreditoSnap.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }));

            setFacturas(todasFacturas);
            setNotasCredito(NC);
            setLoadingModal(false);
          } catch (error) {
            console.error("Error al traer documentos:", error);
            setLoadingModal(false);
          }
        };

        handleRecibirDocs();
      }, [giroRut]);

      const handleProcesarDocs = async () => {
        try {
          setLoadingModal(true);
          const fechaActual = new Date();

          // 1. Agrupar documentos por rut y tipo
          const docsPorEmpresa = {};
          documentosAgregados.forEach((docAgregado) => {
            const key = docAgregado.giroRut;
            if (!docsPorEmpresa[key]) {
              docsPorEmpresa[key] = [];
            }
            docsPorEmpresa[key].push({
              numeroDoc: docAgregado.numeroDoc,
              tipoDoc: docAgregado.tipoDoc || "facturas"
            });
          });

          // 2. Actualizar estado de documentos a "pagado" y sus notas de crédito
          await Promise.all(
            documentosAgregados.map(async (docAgregado) => {
              const { giroRut, numeroDoc, tipoDoc = "facturas" } = docAgregado;

              const docRef = doc(db, "empresas", String(giroRut), tipoDoc, String(numeroDoc));
              await updateDoc(docRef, {
                estado: "pagado",
                pagoUsuario: userId,
                fechaPago: fechaActual
              });

              // Leer el documento para ver si tiene notas de crédito asociadas
              const docSnap = await getDoc(docRef);
              if (docSnap.exists()) {
                const docData = docSnap.data();
                if (docData.notasCredito && docData.notasCredito.length > 0) {
                  await Promise.all(
                    docData.notasCredito.map(async (ncNum) => {
                      const ncNumero = typeof ncNum === "object" ? ncNum.numeroDoc : ncNum;
                      const ncRef = doc(db, "empresas", String(giroRut), "notasCredito", String(ncNumero));
                      await updateDoc(ncRef, {
                        estado: "pagado",
                        pagoUsuario: userId,
                        fechaPago: fechaActual
                      });
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
            fecha: fechaActual,
            totalEgreso: totalDocumentos,
            facturas: await Promise.all(
              Object.entries(docsPorEmpresa).map(async ([rut, docs]) => {
                const facturasConNotas = await Promise.all(
                  docs.map(async ({ numeroDoc, tipoDoc }) => {
                    const docRef = doc(db, "empresas", rut, tipoDoc, numeroDoc);
                    const docSnap = await getDoc(docRef);
                    if (!docSnap.exists()) return null;
                    const docData = docSnap.data();

                    let notasCreditoDetalle = [];
                    if (docData.notasCredito && docData.notasCredito.length > 0) {
                      notasCreditoDetalle = await Promise.all(
                        docData.notasCredito.map(async (ncNum) => {
                          const ncNumero = typeof ncNum === "object" ? ncNum.numeroDoc : ncNum;
                          const ncRef = doc(db, "empresas", rut, "notasCredito", ncNumero);
                          const ncSnap = await getDoc(ncRef);
                          return ncSnap.exists() ? ncSnap.data() : null;
                        })
                      );
                    }

                    return {
                      numeroDoc: docData.numeroDoc,
                      tipoDoc,
                      total: docData.total,
                      totalDescontado: docData.totalDescontado ?? docData.total,
                      abonoNc: docData.abonoNc ?? 0,
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

          // 5. Generar PDF (usando solo números de documento para compatibilidad)
          generarPDF(
            numeroEgreso,
            Object.entries(docsPorEmpresa).map(([rut, docs]) => ({
              rut,
              facturas: docs.map(d => d.numeroDoc),
            })),
            totalDocumentos
          );

          setProcesarModal(false);
          setDocumentosAgregados([]);
          setFacturas([]);
          setLoadingModal(false);
        } catch (error) {
          console.error("Error al procesar documentos", error);
          setLoadingModal(false);
        }
      };

      // Limpiar todos los documentos agregados
      const handleBorrarDocumentos = () => {
        setDocumentosAgregados([]);
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
                                <div className="w-[20%] text-center text-sm">Tipo</div>
                                <div className="w-[15%] text-center text-sm">N° Doc</div>
                                <div className="w-[20%] text-center text-sm">F. Vencimiento</div>
                                <div className="w-[15%] text-center text-sm">Estado</div>
                                <div className="w-[20%] text-center text-sm">Monto</div>
                                <div className="w-[10%]"></div>
                            </div>
                            <hr className="mb-4" />

                            {/* Filas dinámicas */}
                            {facturas.map((row, index) => (
                                <div key={`${row.tipoDoc}-${row.numeroDoc}-${index}`} className="flex justify-between mb-2 items-center">
                                    <div className="w-[20%] text-center text-xs">
                                        {row.tipoDocLabel || "Factura"}
                                    </div>
                                    <div className="w-[15%] text-center text-sm">{row.numeroDoc}</div>
                                    <div className="w-[20%] text-center text-sm">
                                        {row.fechaV?.toDate
                                            ? row.fechaV.toDate().toLocaleDateString("es-CL")
                                            : row.fechaV?.seconds
                                            ? new Date(row.fechaV.seconds * 1000).toLocaleDateString("es-CL")
                                            : "-"}
                                    </div>
                                    <div className={`w-[15%] text-center text-sm ${row.estado === "vencido" ? "text-red-400" : ""}`}>
                                        {row.estado}
                                    </div>
                                    <div className="w-[20%] text-center text-sm">
                                        {formatCLP(row.totalDescontado ?? row.total)}
                                    </div>
                                    <div className="w-[10%] flex justify-center">
                                        <TextButton
                                            className="py-0 my-0 h-6 w-6 px-0 bg-success text-white font-black hover:bg-success-hover active:bg-success-active rounded-md flex items-center justify-center"
                                            text="+"
                                            onClick={() => {
                                                setDocumentosAgregados((prev) => [
                                                    ...prev,
                                                    {
                                                        numeroDoc: row.numeroDoc,
                                                        giroRut: row.giroRut || giroRut,
                                                        tipoDoc: row.tipoDoc || "facturas",
                                                        tipoDocLabel: row.tipoDocLabel || "Factura electrónica",
                                                        total: row.totalDescontado ?? row.total,
                                                    }
                                                ]);
                                                setFacturas((prev) =>
                                                    prev.filter((f) =>
                                                        !(f.numeroDoc === row.numeroDoc && f.tipoDoc === row.tipoDoc)
                                                    )
                                                );
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            {/* Si no hay facturas */}
                            {facturas.length === 0 && giroRut && (
                                <div className="text-center text-gray-400 mt-4">
                                    No hay documentos pendientes de pago
                                </div>
                            )}

                            {/* Si no hay empresa seleccionada */}
                            {!giroRut && (
                                <div className="text-center text-gray-400 mt-4">
                                    Seleccione una empresa para ver sus documentos
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
                                    Documentos agregados ({documentosAgregados.length})
                                </div>
                                <hr className="mb-4" />

                                {/* Encabezados de columna */}
                                {documentosAgregados.length > 0 && (
                                    <div className="flex justify-between font-semibold text-sm mb-2">
                                        <div className="w-[25%] text-center">RUT</div>
                                        <div className="w-[25%] text-center">Tipo</div>
                                        <div className="w-[15%] text-center">N° Doc</div>
                                        <div className="w-[25%] text-center">Monto</div>
                                        <div className="w-[10%]"></div>
                                    </div>
                                )}

                                {/* Filas dinámicas */}
                                {documentosAgregados.map((row, index) => (
                                    <div key={`${row.tipoDoc}-${row.numeroDoc}-${row.giroRut}-${index}`} className="flex justify-between mb-2 items-center">
                                        <div className="w-[25%] text-center text-sm">{formatRUT(row.giroRut)}</div>
                                        <div className="w-[25%] text-center text-xs">{row.tipoDocLabel || "Factura"}</div>
                                        <div className="w-[15%] text-center text-sm">{row.numeroDoc}</div>
                                        <div className="w-[25%] text-center text-sm">{formatCLP(row.total)}</div>
                                        <div className="w-[10%] flex justify-center">
                                            <TextButton
                                                className="py-0 my-0 h-6 w-6 px-0 bg-danger text-white font-black hover:bg-danger-hover active:bg-danger-active rounded-md flex items-center justify-center"
                                                text="-"
                                                onClick={async () => {
                                                    const tipoDoc = row.tipoDoc || "facturas";

                                                    // Eliminar de documentosAgregados
                                                    setDocumentosAgregados((prev) =>
                                                        prev.filter((f) =>
                                                            !(f.numeroDoc === row.numeroDoc && f.giroRut === row.giroRut && f.tipoDoc === tipoDoc)
                                                        )
                                                    );

                                                    // Solo re-agregar a facturas si coincide con la empresa seleccionada
                                                    if (row.giroRut === giroRut) {
                                                        try {
                                                            const docRef = doc(db, "empresas", String(row.giroRut), tipoDoc, String(row.numeroDoc));
                                                            const docSnap = await getDoc(docRef);

                                                            if (docSnap.exists()) {
                                                                const facturaData = {
                                                                    id: docSnap.id,
                                                                    giroRut: row.giroRut,
                                                                    tipoDoc: tipoDoc,
                                                                    tipoDocLabel: row.tipoDocLabel || "Factura electrónica",
                                                                    ...docSnap.data()
                                                                };
                                                                setFacturas((prev) => [...prev, facturaData]);
                                                            }
                                                        } catch (error) {
                                                            console.error("Error al recuperar documento:", error);
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                {/* Si no hay documentos agregados */}
                                {documentosAgregados.length === 0 && (
                                    <div className="text-center text-gray-400 mt-4">
                                        No hay documentos agregados
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
                            <XButton
                                className="h-8 text-xl"
                                text="Borrar"
                                onClick={handleBorrarDocumentos}
                                disabled={documentosAgregados.length === 0}
                            />
                            <YButton
                                className="h-8 text-xl"
                                text="Procesar"
                                onClick={() => setProcesarModal(true)}
                                disabled={documentosAgregados.length === 0}
                            />
                        </div>
                        
                    </div>
                </div>
                {procesarModal && (
                    <Modal className="-translate-y-48 w-[75%] min-w-[70%]" onClickOutside={() => setProcesarModal(false)}>
                        <p className="text-2xl font-black mb-4 text-center">DOCUMENTOS A PROCESAR</p>

                        <Card
                            hasButton={false}
                            contentClassName="w-full h-52 overflow-y-auto scrollbar-custom"
                            className="w-full mb-6"
                            content={
                                <div>
                                    <div className="flex justify-between font-bold mb-2 text-sm">
                                        <div className="w-[25%] text-center">RUT</div>
                                        <div className="w-[25%] text-center">Tipo</div>
                                        <div className="w-[20%] text-center">N° Documento</div>
                                        <div className="w-[30%] text-center">Monto</div>
                                    </div>
                                    <hr className="mb-4" />
                                    {documentosAgregados.map((row, index) => (
                                        <div key={`modal-${row.tipoDoc}-${row.numeroDoc}-${index}`} className="flex justify-between mb-2">
                                            <div className="w-[25%] text-center text-sm">{formatRUT(row.giroRut)}</div>
                                            <div className="w-[25%] text-center text-xs">{row.tipoDocLabel || "Factura"}</div>
                                            <div className="w-[20%] text-center text-sm">{row.numeroDoc}</div>
                                            <div className="w-[30%] text-center text-sm">{formatCLP(row.total)}</div>
                                        </div>
                                    ))}
                                </div>
                            }
                        />

                        {documentosAgregados.length > 0 && (
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-end items-center gap-4 bg-black/20 p-3 rounded-lg">
                                    <span className="text-lg font-semibold">Total Egreso:</span>
                                    <span className="text-2xl font-black text-green-400">{formatCLP(totalDocumentos)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <XButton
                                        className="ml-2"
                                        text="Cancelar"
                                        onClick={() => setProcesarModal(false)}
                                    />
                                    <YButton
                                        className="mr-2"
                                        text="Confirmar y Generar Egreso"
                                        onClick={() => handleProcesarDocs()}
                                    />
                                </div>
                            </div>
                        )}
                    </Modal>
                )}

                <LoadingModal isOpen={loadingModal} message="Procesando documentos..." />
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
    );
};

export default RProcesar;
