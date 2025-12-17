import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton, YButton, TextButton, XButton } from "../../components/Button";
import { DropdownMenu, DatepickerField } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { Modal, LoadingModal } from "../../components/modal";
import { useTheme } from "../../context/ThemeContext";

import { doc, updateDoc, setDoc, getDoc, getDocs, where, query, collection, onSnapshot, runTransaction, addDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";
import { formatCLP } from "../../utils/formatCurrency";
import { generarPDF } from "../../utils/generarPDF";

import { getAuth } from "firebase/auth";

const RProcesar = () => {
    const navigate = useNavigate();
    const { isLightTheme } = useTheme();

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
              // Ignorar errores de permisos durante el logout
              if (error.code === 'permission-denied') return;
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

    const [documentosAgregados, setDocumentosAgregados] = useState([]);

    //VALORES LOCALES
    // Total real a pagar (con descuentos aplicados y montos de abono)
    const totalDocumentos = documentosAgregados.reduce(
        (acc, doc) => acc + (doc.montoAPagar ?? doc.total ?? 0),
        0
      );

    // Totales por tipo de documento (valores originales sin descuento)
    const totalFacturasElectronicas = documentosAgregados
      .filter((doc) => doc.tipoDoc === "facturas")
      .reduce((acc, doc) => acc + (doc.totalOriginal || doc.total || 0), 0);

    const totalFacturasExentas = documentosAgregados
      .filter((doc) => doc.tipoDoc === "facturasExentas")
      .reduce((acc, doc) => acc + (doc.totalOriginal || doc.total || 0), 0);

    // Total de notas de crédito aplicadas a los documentos
    const totalNotasCreditoAplicadas = documentosAgregados.reduce(
      (acc, doc) => acc + (doc.abonoNc || 0), 0
    );

    //MODAL
    const[loadingModal, setLoadingModal] = useState(false);
    const[procesarModal, setProcesarModal] = useState(false);
    const[isProcessing, setIsProcessing] = useState(false);

    // Fecha de pago (por defecto hoy)
    const [fechaPagoSeleccionada, setFechaPagoSeleccionada] = useState(new Date());

    // Search state for filtering documents
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting state
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState('asc');

    // Abono (partial payment) state
    const [abonoModalOpen, setAbonoModalOpen] = useState(false);
    const [editingAbonoDoc, setEditingAbonoDoc] = useState(null);
    const [abonoAmount, setAbonoAmount] = useState('');
    const [abonoError, setAbonoError] = useState('');

    // Handle column sort
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Get date value for sorting
    const getDateValue = (fechaV) => {
        if (!fechaV) return 0;
        if (fechaV.toDate) return fechaV.toDate().getTime();
        if (fechaV.seconds) return fechaV.seconds * 1000;
        return 0;
    };

    // Sorted facturas
    const sortedFacturas = React.useMemo(() => {
        if (!sortColumn) return facturas;

        return [...facturas].sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'tipo':
                    aValue = a.tipoDocLabel || '';
                    bValue = b.tipoDocLabel || '';
                    break;
                case 'numeroDoc':
                    aValue = Number(a.numeroDoc) || 0;
                    bValue = Number(b.numeroDoc) || 0;
                    break;
                case 'fechaV':
                    aValue = getDateValue(a.fechaV);
                    bValue = getDateValue(b.fechaV);
                    break;
                case 'estado':
                    aValue = a.estado || '';
                    bValue = b.estado || '';
                    break;
                case 'monto':
                    aValue = a.totalDescontado ?? a.total ?? 0;
                    bValue = b.totalDescontado ?? b.total ?? 0;
                    break;
                default:
                    return 0;
            }

            if (typeof aValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return sortDirection === 'asc' ? comparison : -comparison;
            }

            return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [facturas, sortColumn, sortDirection]);

    // Filtered facturas based on search term (by document number or amount)
    const filteredFacturas = React.useMemo(() => {
        if (!searchTerm.trim()) return sortedFacturas;

        const term = searchTerm.trim().toLowerCase();
        return sortedFacturas.filter((doc) => {
            // Filter by document number
            const numeroDoc = String(doc.numeroDoc || '').toLowerCase();
            if (numeroDoc.includes(term)) return true;

            // Filter by amount (total or totalDescontado)
            const monto = doc.totalDescontado ?? doc.total ?? 0;
            const montoStr = String(monto);
            const montoFormateado = formatCLP(monto).toLowerCase();
            if (montoStr.includes(term) || montoFormateado.includes(term)) return true;

            return false;
        });
    }, [sortedFacturas, searchTerm]);

    // OBTENCIÓN DE DOCUMENTOS PARA EMPRESA SELECCIONADA
    useEffect(() => {
        const handleRecibirDocs = async () => {
          if (!giroRut) return;

          try {
            setLoadingModal(true);

            // Facturas electrónicas a crédito no pagadas (incluye parcialmente pagadas y parcialmente vencidas)
            const facturasRef = collection(db, "empresas", String(giroRut), "facturas");
            const facturasQuery = query(
              facturasRef,
              where("formaPago", "==", "Crédito"),
              where("estado", "in", ["pendiente", "vencido", "parcialmente_pagado", "parcialmente_vencido"])
            );
            const facturasSnap = await getDocs(facturasQuery);

            // Facturas exentas a crédito no pagadas (incluye parcialmente pagadas y parcialmente vencidas)
            const facturasExentasRef = collection(db, "empresas", String(giroRut), "facturasExentas");
            const facturasExentasQuery = query(
              facturasExentasRef,
              where("formaPago", "==", "Crédito"),
              where("estado", "in", ["pendiente", "vencido", "parcialmente_pagado", "parcialmente_vencido"])
            );
            const facturasExentasSnap = await getDocs(facturasExentasQuery);

            // Check and update overdue status for pending documents
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            // Update overdue documents in batch
            const updateOverduePromises = [];

            for (const docSnap of facturasSnap.docs) {
              const data = docSnap.data();
              const isOverdue = data.fechaV?.toDate && data.fechaV.toDate() <= hoy;
              if (isOverdue) {
                const docRef = doc(db, "empresas", String(giroRut), "facturas", String(docSnap.id));
                const hasAbono = (data.totalAbonado || 0) > 0;
                // If has abono and is overdue -> parcialmente_vencido
                // If no abono and is overdue -> vencido
                if (data.estado === "pendiente") {
                  updateOverduePromises.push(updateDoc(docRef, { estado: "vencido" }));
                } else if (data.estado === "parcialmente_pagado" && hasAbono) {
                  updateOverduePromises.push(updateDoc(docRef, { estado: "parcialmente_vencido" }));
                }
              }
            }

            for (const docSnap of facturasExentasSnap.docs) {
              const data = docSnap.data();
              const isOverdue = data.fechaV?.toDate && data.fechaV.toDate() <= hoy;
              if (isOverdue) {
                const docRef = doc(db, "empresas", String(giroRut), "facturasExentas", String(docSnap.id));
                const hasAbono = (data.totalAbonado || 0) > 0;
                if (data.estado === "pendiente") {
                  updateOverduePromises.push(updateDoc(docRef, { estado: "vencido" }));
                } else if (data.estado === "parcialmente_pagado" && hasAbono) {
                  updateOverduePromises.push(updateDoc(docRef, { estado: "parcialmente_vencido" }));
                }
              }
            }

            // Execute all updates in parallel
            if (updateOverduePromises.length > 0) {
              await Promise.all(updateOverduePromises);
            }

            // Helper to determine local status based on overdue and abono
            const getLocalEstado = (data, fechaV) => {
              const isOverdue = fechaV && fechaV <= hoy;
              const hasAbono = (data.totalAbonado || 0) > 0;

              if (isOverdue) {
                if (data.estado === "pendiente") return "vencido";
                if (data.estado === "parcialmente_pagado" && hasAbono) return "parcialmente_vencido";
              }
              return data.estado;
            };

            // Mapear facturas electrónicas (with potentially updated status)
            const factElec = facturasSnap.docs.map((docSnap) => {
              const data = docSnap.data();
              const fechaV = data.fechaV?.toDate ? data.fechaV.toDate() : null;
              // Calculate saldoPendiente: if document has abonos, use saldoPendiente; otherwise use totalDescontado or total
              const montoBase = data.totalDescontado ?? data.total ?? 0;
              const saldoPendiente = data.saldoPendiente ?? montoBase;
              const totalAbonado = data.totalAbonado ?? 0;
              return {
                id: docSnap.id,
                giroRut: giroRut,
                tipoDoc: "facturas",
                tipoDocLabel: "Factura electrónica",
                ...data,
                estado: getLocalEstado(data, fechaV),
                saldoPendiente,
                totalAbonado,
                tieneAbono: totalAbonado > 0,
              };
            });

            // Mapear facturas exentas (with potentially updated status)
            const factExentas = facturasExentasSnap.docs.map((docSnap) => {
              const data = docSnap.data();
              const fechaV = data.fechaV?.toDate ? data.fechaV.toDate() : null;
              // Calculate saldoPendiente: if document has abonos, use saldoPendiente; otherwise use totalDescontado or total
              const montoBase = data.totalDescontado ?? data.total ?? 0;
              const saldoPendiente = data.saldoPendiente ?? montoBase;
              const totalAbonado = data.totalAbonado ?? 0;
              return {
                id: docSnap.id,
                giroRut: giroRut,
                tipoDoc: "facturasExentas",
                tipoDocLabel: "Factura exenta",
                ...data,
                estado: getLocalEstado(data, fechaV),
                saldoPendiente,
                totalAbonado,
                tieneAbono: totalAbonado > 0,
              };
            });

            // Combinar todas las facturas y filtrar las que ya están en documentosAgregados
            const todasFacturas = [...factElec, ...factExentas].filter(
              (f) =>
                !documentosAgregados.some(
                  (d) => d.numeroDoc === f.numeroDoc && d.giroRut === f.giroRut && d.tipoDoc === f.tipoDoc
                )
            );

            setFacturas(todasFacturas);
            setLoadingModal(false);
          } catch (error) {
            console.error("Error al traer documentos:", error);
            setLoadingModal(false);
          }
        };

        handleRecibirDocs();
      }, [giroRut]);

      const handleProcesarDocs = async () => {
        // Prevent double-click
        if (isProcessing) return;

        try {
          setIsProcessing(true);
          setLoadingModal(true);
          const fechaProceso = new Date(); // Fecha en que se procesa (hoy)
          const fechaPago = fechaPagoSeleccionada; // Fecha de pago seleccionada por el usuario

          // 1. Agrupar documentos por rut y tipo, incluyendo información de abono
          const docsPorEmpresa = {};
          documentosAgregados.forEach((docAgregado) => {
            const key = docAgregado.giroRut;
            if (!docsPorEmpresa[key]) {
              docsPorEmpresa[key] = [];
            }
            docsPorEmpresa[key].push({
              numeroDoc: docAgregado.numeroDoc,
              tipoDoc: docAgregado.tipoDoc || "facturas",
              montoAPagar: docAgregado.montoAPagar ?? docAgregado.saldoPendiente ?? docAgregado.total,
              saldoPendiente: docAgregado.saldoPendiente ?? docAgregado.total,
              totalAbonado: docAgregado.totalAbonado ?? 0,
            });
          });

          // 2. Get the next egreso number before transaction
          const numeroEgreso = await generarNumeroEgreso();

          // 3. Execute all database operations in a single atomic transaction
          const facturasData = await runTransaction(db, async (transaction) => {
            // Phase 1: READ all documents first (required by Firestore transactions)
            const docReads = [];
            const ncReads = [];

            // Read all invoice documents
            for (const docAgregado of documentosAgregados) {
              const { giroRut, numeroDoc, tipoDoc = "facturas", montoAPagar, saldoPendiente, totalAbonado } = docAgregado;
              const docRef = doc(db, "empresas", String(giroRut), tipoDoc, String(numeroDoc));
              const docSnap = await transaction.get(docRef);

              // Calculate abono info
              const montoAPagarCalc = montoAPagar ?? saldoPendiente ?? docAgregado.total;
              const saldoPendienteCalc = saldoPendiente ?? docAgregado.total;
              const esAbono = montoAPagarCalc < saldoPendienteCalc; // Partial payment
              const nuevoSaldoPendiente = saldoPendienteCalc - montoAPagarCalc;
              const nuevoTotalAbonado = (totalAbonado ?? 0) + montoAPagarCalc;

              docReads.push({
                docRef,
                docSnap,
                giroRut,
                numeroDoc,
                tipoDoc,
                montoAPagar: montoAPagarCalc,
                saldoPendiente: saldoPendienteCalc,
                esAbono,
                nuevoSaldoPendiente,
                nuevoTotalAbonado,
              });

              // If document has notas de crédito, queue them for reading
              // Note: Only mark NC as pagado if the full document is being paid
              if (docSnap.exists() && !esAbono) {
                const docData = docSnap.data();
                if (docData.notasCredito && docData.notasCredito.length > 0) {
                  for (const ncNum of docData.notasCredito) {
                    const ncNumero = typeof ncNum === "object" ? ncNum.numeroDoc : ncNum;
                    const ncRef = doc(db, "empresas", String(giroRut), "notasCredito", String(ncNumero));
                    const ncSnap = await transaction.get(ncRef);
                    ncReads.push({ ncRef, ncSnap, giroRut, ncNumero });
                  }
                }
              }
            }

            // Phase 2: WRITE all updates atomically
            // Update all invoice documents (handling partial and full payments)
            for (const readData of docReads) {
              const { docRef, esAbono, montoAPagar, nuevoSaldoPendiente, nuevoTotalAbonado } = readData;

              // Create abono entry for the payment
              const abonoEntry = {
                monto: montoAPagar,
                fecha: fechaPago,
                fechaProceso: fechaProceso,
                usuario: userId,
                numeroEgreso: numeroEgreso,
              };

              if (esAbono) {
                // Partial payment - add to abonos array and set estado to "parcialmente_pagado"
                transaction.update(docRef, {
                  estado: "parcialmente_pagado",
                  abonos: arrayUnion(abonoEntry),
                  totalAbonado: nuevoTotalAbonado,
                  saldoPendiente: nuevoSaldoPendiente,
                  ultimoAbonoUsuario: userId,
                  ultimoAbonoFecha: fechaPago,
                  ultimoAbonoProceso: fechaProceso,
                });
              } else {
                // Full payment - mark as pagado
                transaction.update(docRef, {
                  estado: "pagado",
                  pagoUsuario: userId,
                  fechaPago: fechaPago,
                  fechaProceso: fechaProceso,
                  // Also update abono tracking for consistency
                  abonos: arrayUnion(abonoEntry),
                  totalAbonado: nuevoTotalAbonado,
                  saldoPendiente: 0,
                });
              }
            }

            // Update all notas de crédito (only for full payments - NC are already filtered in read phase)
            for (const { ncRef, ncSnap } of ncReads) {
              if (ncSnap.exists()) {
                transaction.update(ncRef, {
                  estado: "pagado",
                  pagoUsuario: userId,
                  fechaPago: fechaPago,
                  fechaProceso: fechaProceso
                });
              }
            }

            // Build facturas data for pago_recepcion (using data already read)
            const facturasResult = Object.entries(docsPorEmpresa).map(([rut, docs]) => {
              const facturasConNotas = docs.map(({ numeroDoc, tipoDoc, montoAPagar }) => {
                const readData = docReads.find(
                  r => r.giroRut === rut && r.numeroDoc === numeroDoc && r.tipoDoc === tipoDoc
                );
                if (!readData || !readData.docSnap.exists()) return null;
                const docData = readData.docSnap.data();

                // Get NC details from already-read data
                const notasCreditoDetalle = ncReads
                  .filter(nc => nc.giroRut === rut && nc.ncSnap.exists())
                  .filter(nc => {
                    const docNcs = docData.notasCredito || [];
                    return docNcs.some(ncNum => {
                      const ncNumero = typeof ncNum === "object" ? ncNum.numeroDoc : ncNum;
                      return String(ncNumero) === String(nc.ncNumero);
                    });
                  })
                  .map(nc => nc.ncSnap.data());

                return {
                  numeroDoc: docData.numeroDoc,
                  tipoDoc,
                  total: docData.total,
                  totalDescontado: docData.totalDescontado ?? docData.total,
                  abonoNc: docData.abonoNc ?? 0,
                  notasCredito: notasCreditoDetalle,
                  // Abono tracking
                  montoPagado: montoAPagar,
                  esAbono: readData.esAbono,
                  saldoPendiente: readData.nuevoSaldoPendiente,
                };
              });

              return {
                rut,
                facturas: facturasConNotas.filter(Boolean),
              };
            });

            // Create pago_recepcion document
            const pagoRef = doc(db, "pago_recepcion", String(numeroEgreso));
            transaction.set(pagoRef, {
              numeroEgreso,
              fecha: fechaProceso,
              fechaPago: fechaPago,
              totalEgreso: totalDocumentos,
              facturas: facturasResult,
            });

            return facturasResult;
          });

          // 4. Registrar en auditoría (fuera de la transacción)
          try {
            const auditoriaRef = collection(db, "auditoria");
            // Log each processed document
            for (const docAgregado of documentosAgregados) {
              const montoAPagar = docAgregado.montoAPagar ?? docAgregado.saldoPendiente ?? docAgregado.total;
              const saldoPendiente = docAgregado.saldoPendiente ?? docAgregado.total;
              const esAbono = montoAPagar < saldoPendiente;
              const nuevoSaldoPendiente = saldoPendiente - montoAPagar;

              await addDoc(auditoriaRef, {
                tipo: esAbono ? 'abono' : 'pago',
                tipoDocumento: docAgregado.tipoDoc || 'facturas',
                numeroDocumento: docAgregado.numeroDoc,
                empresaRut: docAgregado.giroRut,
                procesadoPor: userId,
                fechaProceso: fechaProceso.toISOString(),
                fechaPago: fechaPago.toISOString(),
                numeroEgreso: numeroEgreso,
                total: docAgregado.totalDescontado ?? docAgregado.total,
                // Abono-specific fields
                montoAbonado: montoAPagar,
                saldoRestante: nuevoSaldoPendiente,
                esAbono: esAbono,
              });
            }
          } catch (auditError) {
            console.warn("No se pudo registrar pago en auditoría:", auditError);
          }

          // 5. Generate PDF (outside transaction - side effect)
          generarPDF(
            numeroEgreso,
            Object.entries(docsPorEmpresa).map(([rut, docs]) => ({
              rut,
              facturas: docs.map(d => ({
                numeroDoc: d.numeroDoc,
                tipoDoc: d.tipoDoc || "facturas",
                // Pass abono information
                montoAPagar: d.montoAPagar,
                saldoPendiente: d.saldoPendiente,
                esAbono: d.montoAPagar < d.saldoPendiente,
              })),
            })),
            totalDocumentos,
            fechaPago
          );

          setProcesarModal(false);
          setDocumentosAgregados([]);
          setFacturas([]);
          setFechaPagoSeleccionada(new Date()); // Reset to today
          setLoadingModal(false);
          setIsProcessing(false);
        } catch (error) {
          console.error("Error al procesar documentos", error);
          setLoadingModal(false);
          setIsProcessing(false);
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
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <div className="flex-shrink-0">
                <SidebarWithContentSeparator className="h-full" />
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-h-screen overflow-visible">
                {/* Título */}
                <div className="p-4 relative flex items-center justify-center flex-shrink-0">
                    <div className="absolute left-5">
                        <VolverButton onClick={() => navigate("/recepcion-index")} />
                    </div>
                    <H1Tittle text="Procesar documentos" />
                </div>

                {/* Contenido principal */}
                <div className="flex-1 flex flex-col flex-wrap justify-start px-3 sm:px-5 py-2 overflow-x-auto">
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
                        searchable={true}
                        searchPlaceholder="Buscar por RUT o razón social..."
                        onSelect={
                            (item) => {setGiro(item);
                            const rutSolo = item.split(" ")[0];
                            setGiroRut(cleanRUT(rutSolo));
                            setSearchTerm(''); // Clear search when company changes
                        }}
                    />
                </div>

                {/* Tabla dinámica */}
                <Card
                    hasButton={false}
                    contentClassName="w-96 h-80 overflow-y-auto scrollbar-custom flex flex-col w-full"
                    content={
                        <div>
                            {/* Search bar */}
                            {giroRut && (
                                <div className="mb-3">
                                    <input
                                        type="text"
                                        placeholder="Buscar por N° documento o monto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border-2 text-sm outline-none transition-colors ${
                                            isLightTheme
                                                ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-accent-blue'
                                                : 'bg-black/20 border-white/20 text-white placeholder-gray-400 focus:border-accent-blue'
                                        }`}
                                    />
                                </div>
                            )}
                            {/* Encabezados - Clickable for sorting */}
                            <div className="flex justify-between font-bold mb-2">
                                <button
                                    onClick={() => handleSort('tipo')}
                                    className="w-[20%] text-center text-sm hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                                >
                                    Tipo
                                    {sortColumn === 'tipo' && (
                                        <span className="text-accent-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleSort('numeroDoc')}
                                    className="w-[15%] text-center text-sm hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                                >
                                    N° Doc
                                    {sortColumn === 'numeroDoc' && (
                                        <span className="text-accent-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleSort('fechaV')}
                                    className="w-[20%] text-center text-sm hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                                >
                                    F. Vencimiento
                                    {sortColumn === 'fechaV' && (
                                        <span className="text-accent-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleSort('estado')}
                                    className="w-[15%] text-center text-sm hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                                >
                                    Estado
                                    {sortColumn === 'estado' && (
                                        <span className="text-accent-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleSort('monto')}
                                    className="w-[20%] text-center text-sm hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                                >
                                    Monto
                                    {sortColumn === 'monto' && (
                                        <span className="text-accent-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                </button>
                                <div className="w-[10%]"></div>
                            </div>
                            <hr className="mb-4" />

                            {/* Filas dinámicas */}
                            {filteredFacturas.map((row, index) => (
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
                                    <div className={`w-[15%] text-center text-sm ${row.estado === "vencido" || row.estado === "parcialmente_vencido" ? "text-red-400" : ""}`}>
                                        {row.estado === "parcialmente_vencido" ? "Parc. vencido" : row.estado}
                                    </div>
                                    <div className="w-[20%] text-center text-sm flex items-center justify-center gap-1">
                                        {formatCLP(row.saldoPendiente ?? row.totalDescontado ?? row.total)}
                                        {row.tieneAbono && (
                                            <span
                                                className="w-2 h-2 rounded-full bg-cyan-400 inline-block"
                                                title="Con abono"
                                            />
                                        )}
                                    </div>
                                    <div className="w-[10%] flex justify-center">
                                        <TextButton
                                            className="py-0 my-0 h-6 w-6 px-0 bg-success text-white font-black hover:bg-success-hover active:bg-success-active rounded-md flex items-center justify-center"
                                            text="+"
                                            onClick={() => {
                                                // Use saldoPendiente for documents with existing abonos
                                                const saldoPendiente = row.saldoPendiente ?? row.totalDescontado ?? row.total;
                                                setDocumentosAgregados((prev) => [
                                                    ...prev,
                                                    {
                                                        numeroDoc: row.numeroDoc,
                                                        giroRut: row.giroRut || giroRut,
                                                        tipoDoc: row.tipoDoc || "facturas",
                                                        tipoDocLabel: row.tipoDocLabel || "Factura electrónica",
                                                        total: row.totalDescontado ?? row.total,
                                                        totalOriginal: row.total,
                                                        abonoNc: row.abonoNc || 0,
                                                        // Abono fields
                                                        saldoPendiente: saldoPendiente,
                                                        montoAPagar: saldoPendiente, // Default to full saldoPendiente
                                                        tieneAbono: row.tieneAbono || false,
                                                        totalAbonado: row.totalAbonado || 0,
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
                            {filteredFacturas.length === 0 && giroRut && sortedFacturas.length === 0 && (
                                <div className="text-center text-gray-400 mt-4">
                                    No hay documentos pendientes de pago
                                </div>
                            )}

                            {/* Si hay facturas pero el filtro no encuentra resultados */}
                            {filteredFacturas.length === 0 && giroRut && sortedFacturas.length > 0 && (
                                <div className="text-center text-gray-400 mt-4">
                                    No se encontraron documentos con "{searchTerm}"
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
                                        <div className="w-[20%] text-center">RUT</div>
                                        <div className="w-[20%] text-center">Tipo</div>
                                        <div className="w-[12%] text-center">N° Doc</div>
                                        <div className="w-[23%] text-center">Monto a pagar</div>
                                        <div className="w-[10%] text-center">Editar</div>
                                        <div className="w-[10%]"></div>
                                    </div>
                                )}

                                {/* Filas dinámicas */}
                                {documentosAgregados.map((row, index) => (
                                    <div key={`${row.tipoDoc}-${row.numeroDoc}-${row.giroRut}-${index}`} className="flex justify-between mb-2 items-center">
                                        <div className="w-[20%] text-center text-sm">{formatRUT(row.giroRut)}</div>
                                        <div className="w-[20%] text-center text-xs">{row.tipoDocLabel || "Factura"}</div>
                                        <div className="w-[12%] text-center text-sm">{row.numeroDoc}</div>
                                        <div className="w-[23%] text-center text-sm flex items-center justify-center gap-1">
                                            {formatCLP(row.montoAPagar ?? row.total)}
                                            {(row.tieneAbono || (row.montoAPagar && row.montoAPagar < row.saldoPendiente)) && (
                                                <span
                                                    className="w-2 h-2 rounded-full bg-cyan-400 inline-block"
                                                    title={row.tieneAbono ? "Con abono anterior" : "Pago parcial"}
                                                />
                                            )}
                                        </div>
                                        <div className="w-[10%] flex justify-center">
                                            <button
                                                className="p-1 hover:bg-white/10 rounded transition-colors"
                                                title="Modificar monto a pagar"
                                                onClick={() => {
                                                    setEditingAbonoDoc({ ...row, index });
                                                    setAbonoAmount(String(row.montoAPagar ?? row.saldoPendiente ?? row.total));
                                                    setAbonoError('');
                                                    setAbonoModalOpen(true);
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
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
                                    <div className="space-y-2">
                                        {totalFacturasElectronicas > 0 && (
                                            <div className="flex justify-between">
                                                <span>Facturas electrónicas:</span>
                                                <span>{formatCLP(totalFacturasElectronicas)}</span>
                                            </div>
                                        )}
                                        {totalFacturasExentas > 0 && (
                                            <div className="flex justify-between">
                                                <span>Facturas exentas:</span>
                                                <span>{formatCLP(totalFacturasExentas)}</span>
                                            </div>
                                        )}
                                        {totalNotasCreditoAplicadas > 0 && (
                                            <div className="flex justify-between text-red-400">
                                                <span>Notas de crédito:</span>
                                                <span>-{formatCLP(totalNotasCreditoAplicadas)}</span>
                                            </div>
                                        )}
                                        <hr className="my-2 border-white/20" />
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Monto total:</span>
                                            <span className={isLightTheme ? "text-green-600" : "text-green-400"}>{formatCLP(totalDocumentos)}</span>
                                        </div>
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
                    <Modal className="w-[75%] min-w-[70%]" alignTop onClickOutside={() => setProcesarModal(false)}>
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
                                {/* Fecha de pago y Total */}
                                <div className="flex justify-between items-end gap-4">
                                    <div className="flex-shrink-0">
                                        <DatepickerField
                                            label="Fecha de pago"
                                            selectedDate={fechaPagoSeleccionada}
                                            onChange={(date) => setFechaPagoSeleccionada(date)}
                                            placeholder="Seleccione fecha"
                                            maxDate={new Date()}
                                            className="w-48"
                                        />
                                    </div>
                                    <div className={`flex items-center gap-4 p-3 rounded-lg ${
                                        isLightTheme ? 'bg-gray-100' : 'bg-black/20'
                                    }`}>
                                        <span className={`text-lg font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>Total Egreso:</span>
                                        <span className={`text-2xl font-black ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}>{formatCLP(totalDocumentos)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <XButton
                                        className="ml-2"
                                        text="Cancelar"
                                        onClick={() => setProcesarModal(false)}
                                        disabled={isProcessing}
                                    />
                                    <YButton
                                        className="mr-2"
                                        text={isProcessing ? "Procesando..." : "Confirmar y Generar Egreso"}
                                        onClick={() => handleProcesarDocs()}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>
                        )}
                    </Modal>
                )}

                {/* Modal de edición de abono */}
                {abonoModalOpen && editingAbonoDoc && (
                    <Modal className="w-96" alignTop onClickOutside={() => setAbonoModalOpen(false)}>
                        <p className="text-xl font-black mb-4 text-center">Modificar monto a pagar</p>

                        <div className={`p-3 rounded-lg mb-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/20'}`}>
                            <div className="text-sm mb-1">
                                <span className="text-gray-400">Documento:</span>{' '}
                                <span className="font-semibold">{editingAbonoDoc.tipoDocLabel} #{editingAbonoDoc.numeroDoc}</span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-400">Saldo pendiente:</span>{' '}
                                <span className="font-semibold text-cyan-400">{formatCLP(editingAbonoDoc.saldoPendiente ?? editingAbonoDoc.total)}</span>
                            </div>
                            {editingAbonoDoc.tieneAbono && (
                                <div className="text-sm mt-1">
                                    <span className="text-gray-400">Total abonado anteriormente:</span>{' '}
                                    <span className="font-semibold text-green-400">{formatCLP(editingAbonoDoc.totalAbonado || 0)}</span>
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className={`block text-sm font-medium mb-2 ${isLightTheme ? 'text-gray-700' : 'text-gray-300'}`}>
                                Monto a pagar
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={abonoAmount ? formatCLP(Number(abonoAmount.toString().replace(/\D/g, ''))) : ''}
                                onChange={(e) => {
                                    // Extract only digits from the input
                                    const rawValue = e.target.value.replace(/\D/g, '');
                                    setAbonoAmount(rawValue);
                                    setAbonoError('');
                                }}
                                placeholder="$0"
                                className={`w-full px-3 py-2 rounded-lg border-2 text-lg font-semibold outline-none transition-colors ${
                                    isLightTheme
                                        ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-accent-blue'
                                        : 'bg-black/20 border-white/20 text-white placeholder-gray-400 focus:border-accent-blue'
                                } ${abonoError ? 'border-red-500' : ''}`}
                            />
                            {abonoError && (
                                <p className="text-red-500 text-sm mt-1">{abonoError}</p>
                            )}
                        </div>

                        <div className="flex justify-between gap-4">
                            <XButton
                                text="Cancelar"
                                onClick={() => {
                                    setAbonoModalOpen(false);
                                    setEditingAbonoDoc(null);
                                    setAbonoAmount('');
                                    setAbonoError('');
                                }}
                            />
                            <YButton
                                text="Confirmar"
                                onClick={() => {
                                    const monto = Number(abonoAmount);
                                    const saldoPendiente = editingAbonoDoc.saldoPendiente ?? editingAbonoDoc.total;

                                    // Validaciones
                                    if (!abonoAmount || isNaN(monto)) {
                                        setAbonoError('Ingrese un monto válido');
                                        return;
                                    }
                                    if (monto <= 0) {
                                        setAbonoError('El monto debe ser mayor a 0');
                                        return;
                                    }
                                    if (monto > saldoPendiente) {
                                        setAbonoError(`El monto no puede superar el saldo pendiente (${formatCLP(saldoPendiente)})`);
                                        return;
                                    }

                                    // Actualizar el documento en documentosAgregados
                                    setDocumentosAgregados((prev) =>
                                        prev.map((doc, idx) =>
                                            idx === editingAbonoDoc.index
                                                ? { ...doc, montoAPagar: monto }
                                                : doc
                                        )
                                    );

                                    // Cerrar modal
                                    setAbonoModalOpen(false);
                                    setEditingAbonoDoc(null);
                                    setAbonoAmount('');
                                    setAbonoError('');
                                }}
                            />
                        </div>
                    </Modal>
                )}

                <LoadingModal isOpen={loadingModal} message="Procesando documentos..." />
                </div>

                {/* Footer */}
                <Footer />
            </div>
        </div>
    );
};

export default RProcesar;
