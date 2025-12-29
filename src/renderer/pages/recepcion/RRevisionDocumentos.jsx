import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../../components/Footer';
import { Modal, LoadingModal, AlertModal } from '../../components/modal';
import { H1Tittle } from '../../components/Fonts';
import { VolverButton, TextButton, ImgButton } from '../../components/Button';
import {
  DropdownMenu,
  DatepickerRange,
  DatepickerField,
  Textfield,
} from '../../components/Textfield';

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
  updateDoc,
  deleteField,
  arrayUnion,
  addDoc,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Card } from '../../components/Container';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCompany } from '../../context/CompanyContext';
import { cleanRUT, formatRUT } from '../../utils/formatRUT';
import { formatCLP } from '../../utils/formatCurrency';
import { generarPDF } from '../../utils/generarPDF';
import { validateNeto } from '../../utils/validation';

//Imagenes
import searchIcon from '../../assets/Logos/search.png';
import reportIcon from '../../assets/Logos/inDoc.png';
import configIcon from '../../assets/Logos/config.png';

const RRevisionDocumentos = () => {
  const navigate = useNavigate();
  const { tienePermiso, esAdmin, user } = useAuth();
  const { isLightTheme } = useTheme();
  const { currentCompanyRUT } = useCompany();

  // Permisos del usuario
  const puedeEditar = tienePermiso('EDITAR_DOCUMENTOS');
  const puedeEliminar = tienePermiso('ELIMINAR_DOCUMENTOS');
  const puedeReversarPago = esAdmin(); // Solo admin y super_admin pueden reversar pagos

  const [empresasConDocs, setEmpresasConDocs] = useState([]);
  const unsubscribeRef = useRef(null);

  const [seObtuvoTipo, setSeObtuvoTipo] = useState(true);

  //Informacion documento
  const [iNumeroDoc, setINumeroDoc] = useState('');
  const [iFechaE, setIFechaE] = useState('');
  const [iFechaV, setIFechaV] = useState('');
  const [iEstado, setIEstado] = useState('');
  const [iFormaPago, setIFormaPago] = useState('');
  const [iTipoDoc, setITipoDoc] = useState('');
  const [iNeto, setINeto] = useState('');
  const [iIva, setIIva] = useState('');
  const [iFlete, setIFlete] = useState('');
  const [iRetencion, setIRetencion] = useState('');
  const [iTotal, setITotal] = useState('');
  const [iOtros, setIOtros] = useState('');
  const [iNotasCredito, setINotasCredito] = useState([]);
  const [iAbonoNc, setIAbonoNc] = useState('');
  const [iTotalDescontado, setITotalDescontado] = useState('');
  const [iNumeroDocNc, setINumeroDocNc] = useState('');
  const [iUsuarioIngreso, setIUsuarioIngreso] = useState('');
  const [iFechaIngreso, setIFechaIngreso] = useState('');
  const [iUsuarioPago, setIUsuarioPago] = useState('');
  const [iFechaPago, setIFechaPago] = useState('');
  const [iFechaProceso, setIFechaProceso] = useState('');

  // Abono (partial payment) tracking
  const [iAbonos, setIAbonos] = useState([]);
  const [iTotalAbonado, setITotalAbonado] = useState(0);
  const [iSaldoPendiente, setISaldoPendiente] = useState(0);

  //Edición de documento
  const [iNumeroDocNuevo, setINumeroDocNuevo] = useState('');
  const [iFechaENuevo, setIFechaENuevo] = useState('');
  const [iFechaVNuevo, setIFechaVNuevo] = useState('');
  const [iNetoNuevo, setINetoNuevo] = useState('');
  const [iIvaNuevo, setIIvaNuevo] = useState('');
  const [iFleteNuevo, setIFleteNuevo] = useState('');
  const [iRetencionNuevo, setIRetencionNuevo] = useState('');
  const [iTotalNuevo, setITotalNuevo] = useState('');
  const [iOtrosNuevo, setIOtrosNuevo] = useState('');

  //Modal
  const [pdfModal, setPdfModal] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [errorModal, setErrorModal] = useState('');
  const [revisionModal, setRevisionModal] = useState(false);
  const [editarModal, setEditarModal] = useState(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState({ rut: '', tipoDoc: '', numeroDoc: '' });
  // Modal de factura con notas de crédito
  const [hasNotasCreditoModal, setHasNotasCreditoModal] = useState(false);
  // Modal para vincular notas a otra factura
  const [vincularModal, setVincularModal] = useState(false);
  const [vincularTipoDoc, setVincularTipoDoc] = useState('Factura electrónica'); // label user-friendly
  const [vincularNumeroDoc, setVincularNumeroDoc] = useState('');

  const [vincularSinEliminar, setVincularSinEliminar] = useState(false);

  // Estado para guardar info del documento actual en edición (solo se usa el setter)
  const [, setCurrentDocRut] = useState('');
  const [, setCurrentDocTipo] = useState('');

  // Estados para reversión de pago (solo admin/super_admin)
  const [reversarPagoModal, setReversarPagoModal] = useState(false);
  const [confirmReversarModal, setConfirmReversarModal] = useState(false);
  const [egresoData, setEgresoData] = useState(null); // Datos del egreso encontrado
  const [egresoDocumentos, setEgresoDocumentos] = useState([]); // Todos los documentos del egreso
  const [documentosAEliminar, setDocumentosAEliminar] = useState([]); // IDs de documentos seleccionados para eliminar
  const [accionReversar, setAccionReversar] = useState(''); // "revertir" | "eliminar" | "parcial"

  // Estados para reversión de abonos (documentos con pagos parciales)
  const [reversarAbonoModal, setReversarAbonoModal] = useState(false);
  const [confirmReversarAbonoModal, setConfirmReversarAbonoModal] = useState(false);
  const [egresosConAbono, setEgresosConAbono] = useState([]); // Lista de todos los egresos donde aparece el documento
  const [egresosSeleccionados, setEgresosSeleccionados] = useState([]); // IDs de egresos seleccionados para reversar
  const [documentoActualAbono, setDocumentoActualAbono] = useState(null); // Documento actual para reversión de abonos

  // Estados para selección de egreso al descargar PDF (documentos con múltiples egresos)
  const [seleccionarEgresoModal, setSeleccionarEgresoModal] = useState(false);
  const [egresosParaPDF, setEgresosParaPDF] = useState([]); // Lista de egresos disponibles para descargar PDF
  const [documentoParaPDF, setDocumentoParaPDF] = useState(null); // Documento seleccionado para PDF

  // Estados de filtros
  const [selectedTipoDoc, setSelectedTipoDoc] = useState('Todos');
  const [selectedEstadoDoc, setSelectedEstadoDoc] = useState('Todos');
  const [selectedFormaPago, setSelectedFormaPago] = useState('Todos');
  const [rangoFecha, setRangoFecha] = useState([null, null]);
  const [fechaInicio, fechaFin] = rangoFecha;
  const [filtroRut, setFiltroRut] = useState('');
  const [filtroFolio, setFiltroFolio] = useState('');
  const [dateRangeError, setDateRangeError] = useState(false);

  // Lista de empresas para el dropdown
  const [empresas, setEmpresas] = useState([]);

  // Sorting state for documents table
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  // Collapsed providers state - all collapsed by default
  const [collapsedProviders, setCollapsedProviders] = useState({});

  // Quick search filter within results
  const [busquedaRapida, setBusquedaRapida] = useState('');

  // Toggle provider collapse state
  const toggleProviderCollapse = (rut) => {
    setCollapsedProviders((prev) => ({
      ...prev,
      [rut]: !prev[rut],
    }));
  };

  // Check if provider is expanded (default is collapsed, so undefined = collapsed)
  const isProviderExpanded = (rut) => collapsedProviders[rut] === true;

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
  const getDateValue = (fecha) => {
    if (!fecha) return 0;
    if (fecha.toDate) return fecha.toDate().getTime();
    if (fecha.seconds) return fecha.seconds * 1000;
    return 0;
  };

  // Sort documents within each empresa
  const sortDocuments = (docs) => {
    if (!sortColumn) return docs;

    return [...docs].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case 'tipo':
          aValue = a.tipo || '';
          bValue = b.tipo || '';
          break;
        case 'folio':
          aValue = Number(a.numeroDoc) || 0;
          bValue = Number(b.numeroDoc) || 0;
          break;
        case 'fechaE':
          aValue = getDateValue(a.fechaE);
          bValue = getDateValue(b.fechaE);
          break;
        case 'fechaV':
          aValue = getDateValue(a.fechaV);
          bValue = getDateValue(b.fechaV);
          break;
        case 'monto':
          aValue = a.total ?? 0;
          bValue = b.total ?? 0;
          break;
        case 'estado':
          aValue = a.estado || '';
          bValue = b.estado || '';
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
  };

  // Filter empresas and documents based on quick search
  const filtrarResultados = (empresas) => {
    if (!busquedaRapida.trim()) return empresas;

    const searchLower = busquedaRapida.toLowerCase().trim();
    // Remove $ and . for number searches (e.g., "$1.500.000" -> "1500000")
    const searchNumber = searchLower.replace(/[$.,]/g, '');

    return empresas
      .map((empresa) => {
        // Check if empresa matches (RUT or razón social)
        const empresaMatches =
          empresa.rut?.toLowerCase().includes(searchLower) ||
          formatRUT(empresa.rut)?.toLowerCase().includes(searchLower) ||
          empresa.razon?.toLowerCase().includes(searchLower);

        // Filter documents that match the search
        const docsFiltered = empresa.documentos.filter((doc) => {
          const tipoLabel =
            doc.tipo === 'facturas'
              ? 'factura electrónica'
              : doc.tipo === 'facturasExentas'
                ? 'factura exenta'
                : doc.tipo === 'boletas'
                  ? 'boleta'
                  : 'nota de crédito';

          // Format total for comparison (both raw and formatted)
          const totalStr = String(doc.total || '');
          const totalFormatted = doc.total != null ? doc.total.toLocaleString('es-CL') : '';

          return (
            String(doc.numeroDoc || '').includes(searchLower) ||
            tipoLabel.includes(searchLower) ||
            (doc.estado || '').toLowerCase().includes(searchLower) ||
            (searchNumber && totalStr.includes(searchNumber)) ||
            totalFormatted.includes(searchLower.replace(/\$/g, ''))
          );
        });

        // If empresa matches, show all its documents; otherwise show filtered docs
        if (empresaMatches) {
          return empresa;
        } else if (docsFiltered.length > 0) {
          return { ...empresa, documentos: docsFiltered };
        }

        return null;
      })
      .filter((e) => e !== null && e.documentos.length > 0);
  };

  const empresasFiltradas = filtrarResultados(empresasConDocs);

  const [rowTipoDoc, setRowTipoDoc] = useState([]);
  const [rowFormaPago, setRowFormaPago] = useState([]);
  const [rowEstadoDoc, setRowEstadoDoc] = useState([]);

  useEffect(() => {
    const netoNumber = Number(iNetoNuevo) || 0;
    const fleteNumber = Number(iFleteNuevo) || 0;
    setIIvaNuevo(((netoNumber + fleteNumber) * 0.19).toFixed(0)); // redondeado sin decimales
    setNuevoChanged(!nuevoChanged);
  }, [iNetoNuevo, iFleteNuevo]);

  //const total = (Number(neto) || 0) + (Number(iva) || 0) + (Number(otros) || 0) + (Number(flete) || 0) - (Number(retencion) || 0);

  useEffect(() => {
    const netoNumber = Number(iNetoNuevo) || 0;
    const ivaNumber = Number(iIvaNuevo) || 0;
    const otrosNumber = Number(iOtrosNuevo) || 0;
    const fleteNumber = Number(iFleteNuevo) || 0;
    const retencionNumber = Number(iRetencionNuevo) || 0;

    setITotalNuevo(netoNumber + ivaNumber + otrosNumber + fleteNumber - retencionNumber);
    setNuevoChanged(!nuevoChanged);
  }, [iIvaNuevo, iOtrosNuevo, iRetencionNuevo]);

  const [cambioValoresEdit, setCambioValoresEdit] = useState();

  useEffect(() => {
    handleCopiarParams();
    setCambioValoresEdit(false);
  }, [cambioValoresEdit]);

  const [nuevoChanged, setNuevoChanged] = useState(false);
  const [confirmarEdicion, setConfirmarEdicion] = useState(false);

  useEffect(() => {
    const fechaENueva = toDate(iFechaENuevo);
    const fechaE = toDate(iFechaE);
    const fechaVNueva = toDate(iFechaVNuevo);
    const fechaV = toDate(iFechaV);
    if (
      iNumeroDocNuevo !== iNumeroDoc ||
      fechaENueva?.getTime() != fechaE?.getTime() ||
      fechaVNueva?.getTime() !== fechaV?.getTime() ||
      iNetoNuevo !== iNeto ||
      iFleteNuevo !== iFlete ||
      iRetencionNuevo !== iRetencion ||
      iIvaNuevo !== iIva ||
      iOtrosNuevo !== iOtros ||
      iTotalNuevo !== iTotal
    ) {
      setConfirmarEdicion(true);
    } else {
      setConfirmarEdicion(false);
    }
  }, [nuevoChanged]);

  const handleCopiarParams = () => {
    setINumeroDocNuevo(iNumeroDoc);
    setIFechaENuevo(iFechaE);
    setIFechaVNuevo(iFechaV);
    setINetoNuevo(iNeto);
    setIFleteNuevo(iFlete);
    setIRetencionNuevo(iRetencion);
    setIIvaNuevo(iIva);
    setIOtrosNuevo(iOtros);
    setITotalNuevo(iTotal);
  };

  const handleBuscar = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const empresasRef = collection(db, currentCompanyRUT, '_root', 'empresas');

    const unsubscribe = onSnapshot(
      empresasRef,
      (snapshotEmpresas) => {
        const promises = snapshotEmpresas.docs.map((empresaDoc) => {
          const empresaData = empresaDoc.data();
          const rut = empresaDoc.id;

          // Mapear opción del filtro a subcolecciones
          const mapTipoDocToSubcol = {
            Todos: ['facturas', 'facturasExentas', 'boletas', 'notasCredito'],
            'Factura electrónica': ['facturas'],
            'Factura exenta': ['facturasExentas'],
            Boleta: ['boletas'],
            'Nota de crédito': ['notasCredito'],
          };

          const subcolecciones = mapTipoDocToSubcol[selectedTipoDoc] || [];

          const listeners = subcolecciones.map((sub) => {
            return new Promise((resolve) => {
              const subRef = collection(db, currentCompanyRUT, '_root', 'empresas', rut, sub);

              onSnapshot(
                subRef,
                async (snapshotDocs) => {
                  const hoy = new Date();
                  hoy.setHours(0, 0, 0, 0);

                  // Check and update overdue documents
                  const updatePromises = [];
                  for (const d of snapshotDocs.docs) {
                    const data = d.data();
                    if (
                      data.estado === 'pendiente' &&
                      data.fechaV?.toDate &&
                      data.fechaV.toDate() < hoy
                    ) {
                      const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', rut, sub, d.id);
                      updatePromises.push(updateDoc(docRef, { estado: 'vencido' }));
                    }
                  }

                  // Execute updates in parallel (fire and forget for UI responsiveness)
                  if (updatePromises.length > 0) {
                    Promise.all(updatePromises).catch((err) =>
                      console.error('Error updating overdue status:', err)
                    );
                  }

                  const docsData = snapshotDocs.docs.map((d) => {
                    const data = d.data();
                    const fechaV = data.fechaV?.toDate ? data.fechaV.toDate() : null;
                    const isOverdue = fechaV && fechaV < hoy && data.estado === 'pendiente';
                    return {
                      id: d.id,
                      ...data,
                      tipo: sub,
                      estado: isOverdue ? 'vencido' : data.estado,
                    };
                  });
                  resolve(docsData);
                },
                (error) => {
                  // Ignorar errores de permisos durante el logout
                  if (error.code === 'permission-denied') {
                    resolve([]);
                    return;
                  }
                  console.error('Error en listener de subcolección:', error);
                  resolve([]);
                }
              );
            });
          });

          return Promise.all(listeners).then((resultados) => {
            let documentos = resultados.flat();

            // === Aplicar filtros adicionales ===

            // Estado documento
            if (selectedEstadoDoc !== 'Todos') {
              documentos = documentos.filter((d) => {
                const estado = d.estado?.toLowerCase();
                const filtro = selectedEstadoDoc.toLowerCase();

                // "Pagado" includes "pagado" and "parcialmente_pagado"
                if (filtro === 'pagado') {
                  return estado === 'pagado' || estado === 'parcialmente_pagado';
                }
                // "Pendiente" includes "pendiente" and "parcialmente_pagado"
                if (filtro === 'pendiente') {
                  return estado === 'pendiente' || estado === 'parcialmente_pagado';
                }
                // "Vencido" includes "vencido" and "parcialmente_vencido"
                if (filtro === 'vencido') {
                  return estado === 'vencido' || estado === 'parcialmente_vencido';
                }
                // Direct match for other filters
                return estado === filtro;
              });
            }

            // Forma de pago (solo facturas y facturasExentas tienen este campo)
            if (selectedFormaPago !== 'Todos') {
              documentos = documentos.filter((d) => {
                if (['facturas', 'facturasExentas'].includes(d.tipo)) {
                  return d.formaPago === selectedFormaPago;
                }
                // los demás documentos son siempre Contado
                return selectedFormaPago === 'Contado';
              });
            }

            // Filtro por rango de fechas
            if (fechaInicio && fechaFin) {
              documentos = documentos.filter((d) => {
                if (d.fechaE?.toDate) {
                  const fecha = d.fechaE.toDate();
                  return fecha >= fechaInicio && fecha <= fechaFin;
                }
                return false;
              });
            }

            // Filtro por empresa (RUT exacto)
            if (filtroRut) {
              if (empresaDoc.id !== filtroRut) {
                return null; // esta empresa se descarta
              }
            }

            // Filtro por Folio (numeroDoc)
            if (filtroFolio) {
              documentos = documentos.filter(
                (d) => String(d.numeroDoc || '') === String(filtroFolio)
              );
            }

            // Ordenar
            const ordenTipo = {
              facturas: 1,
              facturasExentas: 2,
              boletas: 3,
              notasCredito: 4,
            };

            documentos.sort((a, b) => {
              if (a.tipo !== b.tipo) {
                return ordenTipo[a.tipo] - ordenTipo[b.tipo];
              }
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
        setLoadingModal(false);
        Promise.all(promises).then((empresas) => {
          const filtradas = empresas.filter((e) => e && e.documentos.length > 0);
          setEmpresasConDocs(filtradas);
        });
      },
      (error) => {
        // Ignorar errores de permisos durante el logout
        if (error.code === 'permission-denied') return;
        console.error('Error en listener de empresas:', error);
        setLoadingModal(false);
      }
    );
    setLoadingModal(false);
    unsubscribeRef.current = unsubscribe;
  };

  // traer valores estáticos
  useEffect(() => {
    if (!currentCompanyRUT) return;
    const fetchValues = async () => {
      try {
        const tipoDocSnap = await getDoc(doc(db, currentCompanyRUT, '_root', 'values', 'tipo-doc'));
        if (tipoDocSnap.exists()) {
          setRowTipoDoc(Object.values(tipoDocSnap.data()));
        }

        const formaPagoSnap = await getDoc(doc(db, currentCompanyRUT, '_root', 'values', 'formas-pago'));
        if (formaPagoSnap.exists()) {
          setRowFormaPago(Object.values(formaPagoSnap.data()));
        }

        const estadoPagoSnap = await getDoc(doc(db, currentCompanyRUT, '_root', 'values', 'estado-pago'));
        if (estadoPagoSnap.exists()) {
          setRowEstadoDoc(Object.values(estadoPagoSnap.data()));
        }
      } catch (error) {
        console.error('Error obteniendo valores:', error);
      }
    };
    fetchValues();
  }, [currentCompanyRUT]);

  // Cargar lista de empresas para el dropdown
  useEffect(() => {
    if (!currentCompanyRUT) return;
    const fetchEmpresas = async () => {
      try {
        const empresasRef = collection(db, currentCompanyRUT, '_root', 'empresas');
        const snapshot = await getDocs(empresasRef);
        const listaEmpresas = snapshot.docs.map((doc) => ({
          rut: doc.id,
          razon: doc.data().razon || '',
        }));
        // Ordenar por razón social
        listaEmpresas.sort((a, b) => a.razon.localeCompare(b.razon));
        setEmpresas(listaEmpresas);
      } catch (error) {
        console.error('Error obteniendo empresas:', error);
      }
    };
    fetchEmpresas();
  }, [currentCompanyRUT]);

  const handleGenerarPDF = async (rut, numeroDoc, docTipo) => {
    try {
      setLoadingModal(true);

      // Buscar TODOS los egresos que contienen este documento
      const egresosEncontrados = await findAllEgresosForDocument(rut, numeroDoc, docTipo);

      if (egresosEncontrados.length === 0) {
        setLoadingModal(false);
        setPdfModal(true);
        return;
      }

      // Si hay más de un egreso, mostrar modal para seleccionar
      if (egresosEncontrados.length > 1) {
        setEgresosParaPDF(egresosEncontrados);
        setDocumentoParaPDF({ rut, numeroDoc, docTipo });
        setSeleccionarEgresoModal(true);
        setLoadingModal(false);
        return;
      }

      // Si solo hay un egreso, generar PDF directamente
      const egresoEncontrado = egresosEncontrados[0];
      await descargarPDFdeEgreso(egresoEncontrado);

      setLoadingModal(false);
    } catch (error) {
      console.error('Error generando PDF:', error);
      setLoadingModal(false);
    }
  };

  // Función auxiliar para descargar PDF de un egreso específico
  const descargarPDFdeEgreso = async (egreso) => {
    const facturasPorEmpresa = egreso.facturas.map((empresa) => ({
      rut: empresa.rut,
      facturas: empresa.facturas.map((f) => ({
        numeroDoc: f.numeroDoc,
        tipoDoc: f.tipoDoc || 'facturas',
        esAbono: f.esAbono || false,
        // montoPagado is the field stored in pago_recepcion, montoAPagar is passed during processing
        montoAPagar: f.montoPagado || f.montoAPagar || f.totalDescontado || f.total,
        // Include the flag to show credit notes (stored in pago_recepcion when processing)
        includeNotaCredito: f.includeNotaCredito ?? true, // Default to true for backwards compatibility
      })),
    }));

    await generarPDF(
      egreso.numeroEgreso,
      facturasPorEmpresa,
      egreso.totalEgreso,
      egreso.fechaPago || null,
      currentCompanyRUT
    );
  };

  // Handler para seleccionar un egreso del modal y descargar su PDF
  const handleSeleccionarEgresoParaPDF = async (egresoId) => {
    try {
      setSeleccionarEgresoModal(false);
      setLoadingModal(true);

      const egresoSeleccionado = egresosParaPDF.find((e) => e.id === egresoId);
      if (egresoSeleccionado) {
        await descargarPDFdeEgreso(egresoSeleccionado);
      }

      setLoadingModal(false);
      setEgresosParaPDF([]);
      setDocumentoParaPDF(null);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      setLoadingModal(false);
    }
  };

  const handleSetParams = (docData, tipoDoc) => {
    setSeObtuvoTipo(false);
    handleResetParams();

    // Factura electrónica
    if (tipoDoc === 'facturas') {
      if (docData.notasCredito) {
        setIAbonoNc(docData.abonoNc);
        setINotasCredito(docData.notasCredito);
        setITotalDescontado(docData.totalDescontado);
      }
      setIEstado(docData.estado);
      setIFechaE(toDate(docData.fechaE));
      setIFechaV(toDate(docData.fechaV));
      setIFlete(docData.flete);
      setIFormaPago(docData.formaPago);
      setIIva(docData.iva);
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setIOtros(docData.otros);
      setIRetencion(docData.retencion);
      setITotal(docData.total);
      setITipoDoc('Factura electrónica');
      setIUsuarioIngreso(docData.ingresoUsuario);
      setIFechaIngreso(toDateString(docData.fechaIngreso));
      setIUsuarioPago(docData.pagoUsuario);
      setIFechaPago(toDateString(docData.fechaPago));
      setIFechaProceso(toDateString(docData.fechaProceso));
      // Load abono data
      setIAbonos(docData.abonos || []);
      setITotalAbonado(docData.totalAbonado || 0);
      setISaldoPendiente(docData.saldoPendiente ?? docData.totalDescontado ?? docData.total ?? 0);
      setSeObtuvoTipo(true);
    }

    // Factura exenta
    if (tipoDoc === 'facturasExentas') {
      if (docData.notasCredito) {
        setIAbonoNc(docData.abonoNc);
        setINotasCredito(docData.notasCredito);
        setITotalDescontado(docData.totalDescontado);
      }
      setIEstado(docData.estado);
      setIFechaE(toDate(docData.fechaE));
      setIFechaV(toDate(docData.fechaV));
      setIFlete(docData.flete);
      setIFormaPago(docData.formaPago);
      setIIva(0); // Factura exenta no tiene IVA
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setIOtros(docData.otros);
      setIRetencion(docData.retencion);
      setITotal(docData.total);
      setITipoDoc('Factura exenta');
      setIUsuarioIngreso(docData.ingresoUsuario);
      setIFechaIngreso(toDateString(docData.fechaIngreso));
      setIUsuarioPago(docData.pagoUsuario);
      setIFechaPago(toDateString(docData.fechaPago));
      setIFechaProceso(toDateString(docData.fechaProceso));
      // Load abono data
      setIAbonos(docData.abonos || []);
      setITotalAbonado(docData.totalAbonado || 0);
      setISaldoPendiente(docData.saldoPendiente ?? docData.totalDescontado ?? docData.total ?? 0);
      setSeObtuvoTipo(true);
    }

    // Nota de crédito
    if (tipoDoc === 'notasCredito') {
      setIEstado(docData.estado);
      setIFechaE(toDate(docData.fechaE));
      setIFlete(docData.flete);
      setIIva(docData.iva);
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setINumeroDocNc(docData.numeroDocNc);
      setIOtros(docData.otros);
      setIRetencion(docData.retencion);
      setITotal(docData.total);
      setITipoDoc('Nota de crédito');
      setIUsuarioIngreso(docData.ingresoUsuario);
      setIFechaIngreso(toDateString(docData.fechaIngreso));
      setIUsuarioPago(docData.pagoUsuario);
      setIFechaPago(toDateString(docData.fechaPago));
      setIFechaProceso(toDateString(docData.fechaProceso));
      setSeObtuvoTipo(true);
    }

    // Boleta
    if (tipoDoc === 'boletas') {
      setIEstado(docData.estado);
      setIFechaE(toDate(docData.fechaE));
      setIIva(docData.iva);
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setITotal(docData.total);
      setITipoDoc('Boleta');
      setIUsuarioIngreso(docData.ingresoUsuario);
      setIFechaIngreso(toDateString(docData.fechaIngreso));
      setSeObtuvoTipo(true);
    }
  };

  const handleRevisionDoc = async (rut, numeroDoc, tipoDoc) => {
    try {
      setLoadingModal(true);
      handleResetParams();
      const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn('Error obteniendo documento en la base de datos');
        setErrorModal('Error obteniendo documento en la base de datos');
        setLoadingModal(false);
        return;
      }

      const docData = docSnap.data();
      handleSetParams(docData, tipoDoc);

      if (seObtuvoTipo) {
        setRevisionModal(true);
      }

      setLoadingModal(false);
    } catch (error) {
      console.error('Error obteniendo información de documento:', error);
      setLoadingModal(false);
    }
  };

  const handleEditarDoc = async (rut, numeroDoc, tipoDoc) => {
    setLoadingModal(true);
    handleResetParams();

    try {
      const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErrorModal('Error obteniendo documento en la base de datos');
        setLoadingModal(false);
        return;
      }

      const docData = docSnap.data();

      // "Contado" documents are marked as "pagado" immediately when entered,
      // but they don't go through the payment process (no egreso created).
      // These should be editable/deletable like boletas.
      const esContadoSinEgreso =
        (tipoDoc === 'facturas' || tipoDoc === 'facturasExentas') &&
        docData.formaPago === 'Contado' &&
        docData.estado === 'pagado' &&
        !docData.pagoUsuario; // If pagoUsuario is set, it was processed through payment system

      // Solo permitir editar documentos no pagados (excepto boletas que siempre son pagadas)
      const puedeEditarDoc =
        esContadoSinEgreso || // Allow editing "Contado" documents without egreso
        (tipoDoc === 'facturas' &&
          docData.estado !== 'pagado' &&
          docData.estado !== 'parcialmente_pagado' &&
          docData.estado !== 'parcialmente_vencido') ||
        (tipoDoc === 'facturasExentas' &&
          docData.estado !== 'pagado' &&
          docData.estado !== 'parcialmente_pagado' &&
          docData.estado !== 'parcialmente_vencido') ||
        (tipoDoc === 'notasCredito' && docData.estado !== 'pagado') ||
        tipoDoc === 'boletas';

      if (puedeEditarDoc) {
        handleSetParams(docData, tipoDoc);
        setCambioValoresEdit(true);
        setDeleteInfo({ rut, tipoDoc, numeroDoc });
        setCurrentDocRut(rut);
        setCurrentDocTipo(tipoDoc);
        setEditarModal(true);
      } else if (
        puedeReversarPago &&
        (docData.estado === 'parcialmente_pagado' || docData.estado === 'parcialmente_vencido')
      ) {
        // Si es admin/super_admin y el documento tiene abonos, buscar TODOS los egresos
        const egresos = await findAllEgresosForDocument(rut, numeroDoc, tipoDoc);

        if (egresos.length > 0) {
          // Preparar datos del documento actual
          handleSetParams(docData, tipoDoc);
          setDeleteInfo({ rut, tipoDoc, numeroDoc });
          setCurrentDocRut(rut);
          setCurrentDocTipo(tipoDoc);

          // Guardar información del documento actual y sus egresos
          setDocumentoActualAbono({
            rut,
            numeroDoc,
            tipoDoc,
            total: docData.total,
            totalAbonado: docData.totalAbonado || 0,
            saldoPendiente: docData.saldoPendiente || docData.total,
            abonos: docData.abonos || [],
          });
          setEgresosConAbono(egresos);
          setEgresosSeleccionados([]);

          // Mostrar modal de reversión de abonos
          setReversarAbonoModal(true);
        } else {
          setErrorModal('Error: No se encontraron egresos asociados a este documento.');
        }
      } else if (puedeReversarPago && docData.estado === 'pagado') {
        // Si es admin/super_admin y el documento está pagado, buscar TODOS los egresos
        const egresos = await findAllEgresosForDocument(rut, numeroDoc, tipoDoc);

        if (egresos.length > 0) {
          // Preparar datos del documento actual
          handleSetParams(docData, tipoDoc);
          setDeleteInfo({ rut, tipoDoc, numeroDoc });
          setCurrentDocRut(rut);
          setCurrentDocTipo(tipoDoc);

          // Determinar si el documento tiene múltiples abonos reales (pagos parciales en diferentes egresos)
          // Un documento tiene abonos reales si:
          // 1. Tiene un array de abonos con más de 1 entrada, O
          // 2. Está en múltiples egresos diferentes (egresos.length > 1)
          const tieneAbonosReales =
            (docData.abonos && docData.abonos.length > 1) ||
            egresos.length > 1;

          if (tieneAbonosReales) {
            // Documento con múltiples abonos - mostrar modal de reversión de abonos
            setDocumentoActualAbono({
              rut,
              numeroDoc,
              tipoDoc,
              total: docData.total,
              totalAbonado: docData.totalAbonado || docData.totalDescontado || docData.total,
              saldoPendiente: docData.saldoPendiente || 0,
              abonos: docData.abonos || [],
            });
            setEgresosConAbono(egresos);
            setEgresosSeleccionados([]);

            // Mostrar modal de reversión de abonos
            setReversarAbonoModal(true);
          } else {
            // Pago único (un solo egreso, sin múltiples abonos)
            // Usar el modal de reversión de pago tradicional
            const egreso = egresos[0];
            setEgresoData(egreso);

            // Preparar lista de todos los documentos del egreso
            const todosDocumentos = prepararDocumentosEgreso(egreso);
            setEgresoDocumentos(todosDocumentos);
            setDocumentosAEliminar([]);
            setAccionReversar('');

            // Mostrar modal de reversión de pago
            setReversarPagoModal(true);
          }
        } else {
          setErrorModal('Error: No se encontró el egreso asociado a este documento.');
        }
      } else {
        setErrorModal('El documento no se puede modificar ya que tiene egreso.');
      }
      setLoadingModal(false);
    } catch (error) {
      console.error('Error obteniendo información de documento:', error);
      setLoadingModal(false);
    }
  };

  // Buscar el egreso que contiene un documento específico
  const findEgresoForDocument = async (rut, numeroDoc, tipoDoc) => {
    try {
      const pagoRef = collection(db, currentCompanyRUT, '_root', 'pago_recepcion');
      const snapshot = await getDocs(pagoRef);

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        if (Array.isArray(data.facturas)) {
          for (const empresa of data.facturas) {
            if (empresa.rut !== rut || !Array.isArray(empresa.facturas)) continue;

            // Buscar en facturas/facturasExentas
            if (tipoDoc === 'facturas' || tipoDoc === 'facturasExentas') {
              const found = empresa.facturas.some((f) => {
                const matchNumero = String(f.numeroDoc) === String(numeroDoc);
                // Si el egreso tiene tipoDoc guardado, verificar que coincida
                // Si no tiene tipoDoc (egresos antiguos), asumir "facturas"
                const facturaTipo = f.tipoDoc || 'facturas';
                return matchNumero && facturaTipo === tipoDoc;
              });
              if (found) return { id: docSnap.id, ...data };
            }

            // Buscar en notas de crédito dentro de cada factura
            // Only include egresos where the NC was actually applied (includeNotaCredito === true)
            if (tipoDoc === 'notasCredito') {
              const found = empresa.facturas.some((f) => {
                if (!Array.isArray(f.notasCredito)) return false;
                const ncExists = f.notasCredito.some((nc) => String(nc.numeroDoc) === String(numeroDoc));
                return ncExists && f.includeNotaCredito === true;
              });
              if (found) return { id: docSnap.id, ...data };
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('Error buscando egreso:', error);
      return null;
    }
  };

  // Buscar TODOS los egresos que contienen un documento específico (para documentos con abonos)
  const findAllEgresosForDocument = async (rut, numeroDoc, tipoDoc) => {
    try {
      const pagoRef = collection(db, currentCompanyRUT, '_root', 'pago_recepcion');
      const snapshot = await getDocs(pagoRef);
      const egresosEncontrados = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        if (Array.isArray(data.facturas)) {
          for (const empresa of data.facturas) {
            if (empresa.rut !== rut || !Array.isArray(empresa.facturas)) continue;

            // Buscar en facturas/facturasExentas
            if (tipoDoc === 'facturas' || tipoDoc === 'facturasExentas') {
              const facturaEncontrada = empresa.facturas.find((f) => {
                const matchNumero = String(f.numeroDoc) === String(numeroDoc);
                const facturaTipo = f.tipoDoc || 'facturas';
                return matchNumero && facturaTipo === tipoDoc;
              });
              if (facturaEncontrada) {
                egresosEncontrados.push({
                  id: docSnap.id,
                  ...data,
                  // Información específica del abono en este egreso
                  esAbono: facturaEncontrada.esAbono || false,
                  montoAPagar:
                    facturaEncontrada.montoPagado ||
                    facturaEncontrada.montoAPagar ||
                    facturaEncontrada.totalDescontado ||
                    facturaEncontrada.total,
                });
              }
            }

            // Buscar en notas de crédito dentro de cada factura
            // Only include egresos where the NC was actually applied (includeNotaCredito === true)
            if (tipoDoc === 'notasCredito') {
              const found = empresa.facturas.some((f) => {
                if (!Array.isArray(f.notasCredito)) return false;
                // Check if NC is in this factura AND if it was actually included in this payment
                const ncExists = f.notasCredito.some((nc) => String(nc.numeroDoc) === String(numeroDoc));
                // Only count this egreso if the NC was actually applied (includeNotaCredito is true)
                return ncExists && f.includeNotaCredito === true;
              });
              if (found) {
                egresosEncontrados.push({
                  id: docSnap.id,
                  ...data,
                  esAbono: false,
                  montoAPagar: null,
                });
              }
            }
          }
        }
      }
      return egresosEncontrados;
    } catch (error) {
      console.error('Error buscando egresos:', error);
      return [];
    }
  };

  // Preparar lista plana de documentos del egreso para mostrar en el modal
  const prepararDocumentosEgreso = (egreso) => {
    const documentos = [];

    if (!egreso || !Array.isArray(egreso.facturas)) return documentos;

    egreso.facturas.forEach((empresa) => {
      if (!Array.isArray(empresa.facturas)) return;

      empresa.facturas.forEach((factura) => {
        // Agregar factura
        documentos.push({
          id: `${empresa.rut}-${factura.tipoDoc}-${factura.numeroDoc}`,
          rut: empresa.rut,
          tipoDoc: factura.tipoDoc,
          tipoDocLabel:
            factura.tipoDoc === 'facturas'
              ? 'Factura electrónica'
              : factura.tipoDoc === 'facturasExentas'
                ? 'Factura exenta'
                : 'Factura',
          numeroDoc: factura.numeroDoc,
          total: factura.total,
          totalDescontado: factura.totalDescontado,
          esNotaCredito: false,
        });

        // Agregar notas de crédito si existen
        if (Array.isArray(factura.notasCredito)) {
          factura.notasCredito.forEach((nc) => {
            documentos.push({
              id: `${empresa.rut}-notasCredito-${nc.numeroDoc}`,
              rut: empresa.rut,
              tipoDoc: 'notasCredito',
              tipoDocLabel: 'Nota de crédito',
              numeroDoc: nc.numeroDoc,
              total: nc.total,
              esNotaCredito: true,
              facturaAsociada: factura.numeroDoc,
            });
          });
        }
      });
    });

    return documentos;
  };

  // Calcular nuevo estado basado en fecha de vencimiento
  const calcularNuevoEstado = (fechaV) => {
    if (!fechaV) return 'pendiente';

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let fechaVencimiento;
    if (fechaV?.toDate) {
      fechaVencimiento = fechaV.toDate();
    } else if (fechaV instanceof Date) {
      fechaVencimiento = fechaV;
    } else {
      return 'pendiente';
    }

    fechaVencimiento.setHours(0, 0, 0, 0);
    return fechaVencimiento < hoy ? 'vencido' : 'pendiente';
  };

  // Reversar pago - cambiar estado de documentos y eliminar egreso
  const handleReversarPago = async () => {
    try {
      setConfirmReversarModal(false);
      setReversarPagoModal(false);
      setLoadingModal(true);

      const egresoId = egresoData.id;

      // Preparar datos para auditoría
      const documentosAfectados = [];
      if (egresoData && Array.isArray(egresoData.facturas)) {
        for (const empresa of egresoData.facturas) {
          if (Array.isArray(empresa.facturas)) {
            for (const factura of empresa.facturas) {
              // Agregar la factura
              documentosAfectados.push({
                rut: empresa.rut,
                tipoDoc: factura.tipoDoc,
                numeroDoc: factura.numeroDoc,
                total: factura.total || factura.totalDescontado,
              });
              // Agregar las notas de crédito asociadas
              if (Array.isArray(factura.notasCredito)) {
                for (const nc of factura.notasCredito) {
                  documentosAfectados.push({
                    rut: empresa.rut,
                    tipoDoc: 'notasCredito',
                    numeroDoc: nc.numeroDoc,
                    total: nc.total || 0,
                  });
                }
              }
            }
          }
        }
      }

      if (accionReversar === 'revertir') {
        // Opción 1: Solo revertir el pago (cambiar estados, eliminar egreso)
        await revertirDocumentosEgreso(egresoData, []);
        await deleteDoc(doc(db, currentCompanyRUT, '_root', 'pago_recepcion', egresoId));

        // Registrar en auditoría
        try {
          const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
          await addDoc(auditoriaRef, {
            tipo: 'reversion_pago',
            accion: 'revertir',
            egresoId: egresoId,
            numeroEgreso: egresoData.numeroEgreso,
            totalEgreso: egresoData.totalEgreso,
            documentosAfectados: documentosAfectados,
            documentosRevertidos: documentosAfectados.length,
            documentosEliminados: 0,
            reversadoPor: user?.email || 'desconocido',
            fechaReversion: new Date().toISOString(),
            descripcion: 'Pago revertido - documentos restaurados a pendiente',
          });
        } catch (auditError) {
          console.warn('No se pudo registrar reversión en auditoría:', auditError);
        }

        setErrorModal(
          'Egreso revertido correctamente. Los documentos ahora están pendientes de pago.'
        );
      } else if (accionReversar === 'eliminar') {
        // Opción 2: Eliminar todo (documentos y egreso)
        await eliminarDocumentosEgreso(egresoData);
        await deleteDoc(doc(db, currentCompanyRUT, '_root', 'pago_recepcion', egresoId));

        // Registrar en auditoría
        try {
          const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
          await addDoc(auditoriaRef, {
            tipo: 'reversion_pago',
            accion: 'eliminar_todo',
            egresoId: egresoId,
            numeroEgreso: egresoData.numeroEgreso,
            totalEgreso: egresoData.totalEgreso,
            documentosAfectados: documentosAfectados,
            documentosRevertidos: 0,
            documentosEliminados: documentosAfectados.length,
            reversadoPor: user?.email || 'desconocido',
            fechaReversion: new Date().toISOString(),
            descripcion: 'Pago y documentos eliminados completamente',
          });
        } catch (auditError) {
          console.warn('No se pudo registrar eliminación en auditoría:', auditError);
        }

        setErrorModal('Egreso y documentos eliminados correctamente.');
      } else if (accionReversar === 'parcial') {
        // Opción 3: Eliminar algunos documentos, revertir otros
        await revertirDocumentosEgreso(egresoData, documentosAEliminar);
        await deleteDoc(doc(db, currentCompanyRUT, '_root', 'pago_recepcion', egresoId));

        // Separar documentos eliminados y revertidos para auditoría
        const docsEliminados = documentosAfectados.filter((doc) =>
          documentosAEliminar.includes(`${doc.rut}-${doc.tipoDoc}-${doc.numeroDoc}`)
        );
        const docsRevertidos = documentosAfectados.filter(
          (doc) => !documentosAEliminar.includes(`${doc.rut}-${doc.tipoDoc}-${doc.numeroDoc}`)
        );

        // Registrar en auditoría
        try {
          const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
          await addDoc(auditoriaRef, {
            tipo: 'reversion_pago',
            accion: 'parcial',
            egresoId: egresoId,
            numeroEgreso: egresoData.numeroEgreso,
            totalEgreso: egresoData.totalEgreso,
            documentosAfectados: documentosAfectados,
            documentosEliminadosDetalle: docsEliminados,
            documentosRevertidosDetalle: docsRevertidos,
            documentosRevertidos: docsRevertidos.length,
            documentosEliminados: docsEliminados.length,
            reversadoPor: user?.email || 'desconocido',
            fechaReversion: new Date().toISOString(),
            descripcion: `Reversión parcial - ${docsEliminados.length} eliminados, ${docsRevertidos.length} revertidos`,
          });
        } catch (auditError) {
          console.warn('No se pudo registrar reversión parcial en auditoría:', auditError);
        }

        setErrorModal(
          'Egreso eliminado. Documentos seleccionados eliminados y resto revertidos a pendientes.'
        );
      }

      setLoadingModal(false);
      handleBuscar();
    } catch (error) {
      console.error('Error reversando pago:', error);
      setLoadingModal(false);
      setErrorModal('Error al reversar el pago: ' + error.message);
    }
  };

  // Reversar abonos seleccionados - restaurar documento y actualizar egresos
  const handleRevertirAbonos = async () => {
    try {
      setConfirmReversarAbonoModal(false);
      setReversarAbonoModal(false);
      setLoadingModal(true);

      if (!documentoActualAbono || egresosSeleccionados.length === 0) {
        setErrorModal('No hay egresos seleccionados para reversar');
        setLoadingModal(false);
        return;
      }

      const { rut, numeroDoc, tipoDoc } = documentoActualAbono;

      // Obtener el documento actual de la base de datos para tener datos actualizados
      const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setErrorModal('Error: El documento no existe');
        setLoadingModal(false);
        return;
      }

      const docData = docSnap.data();
      const abonosRestantes = [...(docData.abonos || [])];
      let montoRevertido = 0;

      // Para cada egreso seleccionado
      for (const egresoId of egresosSeleccionados) {
        const egresoSeleccionado = egresosConAbono.find((e) => e.id === egresoId);
        if (!egresoSeleccionado) continue;

        const numeroEgresoRevertido = egresoSeleccionado.numeroEgreso;

        // Encontrar y remover el abono correspondiente a este egreso
        const indiceAbono = abonosRestantes.findIndex(
          (a) => a.numeroEgreso === numeroEgresoRevertido
        );
        if (indiceAbono !== -1) {
          montoRevertido += abonosRestantes[indiceAbono].monto || 0;
          abonosRestantes.splice(indiceAbono, 1);
        }

        // Actualizar el egreso en pago_recepcion
        const egresoRef = doc(db, currentCompanyRUT, '_root', 'pago_recepcion', egresoId);
        const egresoSnap = await getDoc(egresoRef);

        if (egresoSnap.exists()) {
          const egresoData = egresoSnap.data();

          // Find the factura entry to check if it included NC
          let facturaConNC = null;
          for (const empresa of egresoData.facturas) {
            if (empresa.rut !== rut) continue;
            for (const f of empresa.facturas) {
              const facturaTipo = f.tipoDoc || 'facturas';
              if (String(f.numeroDoc) === String(numeroDoc) && facturaTipo === tipoDoc) {
                facturaConNC = f;
                break;
              }
            }
            if (facturaConNC) break;
          }

          // If this abono included NC, revert the credit note status
          if (facturaConNC && facturaConNC.includeNotaCredito === true && Array.isArray(facturaConNC.notasCredito)) {
            for (const nc of facturaConNC.notasCredito) {
              const ncNumero = typeof nc === 'object' ? nc.numeroDoc : nc;
              if (!ncNumero) continue;

              const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', rut, 'notasCredito', String(ncNumero));
              try {
                await updateDoc(ncRef, {
                  estado: 'pendiente',
                  pagoUsuario: deleteField(),
                  fechaPago: deleteField(),
                  fechaProceso: deleteField(),
                });
              } catch (ncError) {
                console.warn(`No se pudo revertir NC ${ncNumero}:`, ncError);
              }
            }
          }

          // Buscar y remover el documento de este egreso
          const nuevasFacturas = egresoData.facturas
            .map((empresa) => {
              if (empresa.rut !== rut) return empresa;

              const facturasActualizadas = empresa.facturas.filter((f) => {
                const facturaTipo = f.tipoDoc || 'facturas';
                return !(String(f.numeroDoc) === String(numeroDoc) && facturaTipo === tipoDoc);
              });

              return { ...empresa, facturas: facturasActualizadas };
            })
            .filter((empresa) => empresa.facturas && empresa.facturas.length > 0);

          // Si el egreso queda vacío o solo tenía este documento, eliminarlo
          if (nuevasFacturas.length === 0) {
            await deleteDoc(egresoRef);
          } else {
            // Recalcular el total del egreso
            let nuevoTotalEgreso = 0;
            nuevasFacturas.forEach((empresa) => {
              empresa.facturas.forEach((f) => {
                nuevoTotalEgreso += f.montoAPagar || f.totalDescontado || f.total || 0;
              });
            });

            await updateDoc(egresoRef, {
              facturas: nuevasFacturas,
              totalEgreso: nuevoTotalEgreso,
            });
          }
        }

        // Registrar en auditoría
        try {
          const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
          await addDoc(auditoriaRef, {
            tipo: 'reversion_abono',
            accion: 'revertir_abono',
            egresoId: egresoId,
            numeroEgreso: numeroEgresoRevertido,
            documento: {
              rut,
              tipoDoc,
              numeroDoc,
              montoRevertido: egresoSeleccionado.montoAPagar || montoRevertido,
            },
            reversadoPor: user?.email || 'desconocido',
            fechaReversion: new Date().toISOString(),
            descripcion: `Abono revertido del egreso N° ${numeroEgresoRevertido}`,
          });
        } catch (auditError) {
          console.warn('No se pudo registrar reversión de abono en auditoría:', auditError);
        }
      }

      // Actualizar el documento
      const nuevoTotalAbonado = abonosRestantes.reduce((sum, a) => sum + (a.monto || 0), 0);
      const nuevoSaldoPendiente = (docData.totalDescontado || docData.total) - nuevoTotalAbonado;

      // Determinar nuevo estado
      let nuevoEstado;
      if (abonosRestantes.length === 0) {
        // Ya no hay abonos, volver a pendiente o vencido
        nuevoEstado = calcularNuevoEstado(docData.fechaV);
      } else {
        // Aún hay abonos, mantener como parcialmente_pagado
        nuevoEstado = 'parcialmente_pagado';
      }

      // Preparar actualización del documento
      const updateData = {
        estado: nuevoEstado,
        totalAbonado: nuevoTotalAbonado,
        saldoPendiente: nuevoSaldoPendiente,
      };

      if (abonosRestantes.length === 0) {
        // Si no quedan abonos, limpiar el array y campos relacionados
        updateData.abonos = deleteField();
        updateData.totalAbonado = deleteField();
        updateData.saldoPendiente = deleteField();
      } else {
        updateData.abonos = abonosRestantes;
      }

      await updateDoc(docRef, updateData);

      setLoadingModal(false);

      const mensaje =
        abonosRestantes.length === 0
          ? 'Todos los abonos han sido revertidos. El documento está pendiente de pago.'
          : `Se revirtieron ${egresosSeleccionados.length} abono(s). Quedan ${abonosRestantes.length} abono(s) pendientes.`;

      setErrorModal(mensaje);
      handleBuscar();
    } catch (error) {
      console.error('Error reversando abonos:', error);
      setLoadingModal(false);
      setErrorModal('Error al reversar los abonos: ' + error.message);
    }
  };

  // Revertir documentos del egreso (cambiar estado a pendiente/vencido)
  // Now properly handles multiple egresos - only removes the specific abono for this egreso
  const revertirDocumentosEgreso = async (egreso, idsAEliminar) => {
    if (!egreso || !Array.isArray(egreso.facturas)) return;

    const numeroEgresoRevertido = egreso.numeroEgreso;

    for (const empresa of egreso.facturas) {
      if (!Array.isArray(empresa.facturas)) continue;

      for (const factura of empresa.facturas) {
        const facturaId = `${empresa.rut}-${factura.tipoDoc}-${factura.numeroDoc}`;

        // Si está en la lista de eliminar, eliminar el documento
        if (idsAEliminar.includes(facturaId)) {
          const facturaRef = doc(
            db,
            currentCompanyRUT,
            '_root',
            'empresas',
            empresa.rut,
            factura.tipoDoc,
            String(factura.numeroDoc)
          );
          await deleteDoc(facturaRef);

          // Eliminar notas de crédito asociadas si las hay
          if (Array.isArray(factura.notasCredito)) {
            for (const nc of factura.notasCredito) {
              const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', empresa.rut, 'notasCredito', String(nc.numeroDoc));
              await deleteDoc(ncRef);
            }
          }
        } else {
          // Revertir la factura - but only remove the abono for THIS egreso
          const facturaRef = doc(
            db,
            currentCompanyRUT,
            '_root',
            'empresas',
            empresa.rut,
            factura.tipoDoc,
            String(factura.numeroDoc)
          );
          const facturaSnap = await getDoc(facturaRef);

          if (facturaSnap.exists()) {
            const facturaData = facturaSnap.data();
            const currentAbonos = facturaData.abonos || [];

            // Filter out only the abono for this specific egreso
            const remainingAbonos = currentAbonos.filter(
              (abono) => abono.numeroEgreso !== numeroEgresoRevertido
            );

            if (remainingAbonos.length > 0) {
              // There are still other abonos - recalculate and keep partial payment status
              const nuevoTotalAbonado = remainingAbonos.reduce((sum, abono) => sum + (abono.monto || 0), 0);
              const montoOriginal = facturaData.totalDescontado ?? facturaData.total ?? 0;
              const nuevoSaldoPendiente = montoOriginal - nuevoTotalAbonado;

              // Determine status based on remaining balance and due date
              const hoy = new Date();
              hoy.setHours(0, 0, 0, 0);
              const fechaV = facturaData.fechaV?.toDate ? facturaData.fechaV.toDate() : null;
              const isOverdue = fechaV && fechaV < hoy;

              let nuevoEstado;
              if (nuevoSaldoPendiente <= 0) {
                nuevoEstado = 'pagado';
              } else if (isOverdue) {
                nuevoEstado = 'parcialmente_vencido';
              } else {
                nuevoEstado = 'parcialmente_pagado';
              }

              // Get the last remaining abono for tracking fields
              const ultimoAbono = remainingAbonos[remainingAbonos.length - 1];

              await updateDoc(facturaRef, {
                estado: nuevoEstado,
                abonos: remainingAbonos,
                totalAbonado: nuevoTotalAbonado,
                saldoPendiente: nuevoSaldoPendiente,
                ultimoAbonoUsuario: ultimoAbono.usuario || deleteField(),
                ultimoAbonoFecha: ultimoAbono.fecha || deleteField(),
                ultimoAbonoProceso: ultimoAbono.fechaProceso || deleteField(),
                // Clear full payment fields since it's no longer fully paid
                pagoUsuario: deleteField(),
                fechaPago: deleteField(),
                fechaProceso: deleteField(),
              });
            } else {
              // No remaining abonos - fully revert to pending/overdue
              const nuevoEstado = calcularNuevoEstado(facturaData.fechaV);

              await updateDoc(facturaRef, {
                estado: nuevoEstado,
                pagoUsuario: deleteField(),
                fechaPago: deleteField(),
                fechaProceso: deleteField(),
                // Clean up all abono-related fields
                abonos: deleteField(),
                totalAbonado: deleteField(),
                saldoPendiente: deleteField(),
                ultimoAbonoUsuario: deleteField(),
                ultimoAbonoFecha: deleteField(),
                ultimoAbonoProceso: deleteField(),
              });
            }
          }

          // Only revert notas de crédito if they were included in THIS egreso
          // Check the includeNotaCredito flag from the egreso data
          const shouldRevertNC = factura.includeNotaCredito === true;

          if (shouldRevertNC && Array.isArray(factura.notasCredito)) {
            for (const nc of factura.notasCredito) {
              const ncId = `${empresa.rut}-notasCredito-${nc.numeroDoc}`;

              if (idsAEliminar.includes(ncId)) {
                const ncRef = doc(
                  db,
                  currentCompanyRUT,
                  '_root',
                  'empresas',
                  empresa.rut,
                  'notasCredito',
                  String(nc.numeroDoc)
                );
                await deleteDoc(ncRef);
              } else {
                const ncRef = doc(
                  db,
                  currentCompanyRUT,
                  '_root',
                  'empresas',
                  empresa.rut,
                  'notasCredito',
                  String(nc.numeroDoc)
                );
                await updateDoc(ncRef, {
                  estado: 'pendiente',
                  pagoUsuario: deleteField(),
                  fechaPago: deleteField(),
                  fechaProceso: deleteField(),
                });
              }
            }
          }
        }
      }
    }
  };

  // Eliminar todos los documentos del egreso
  const eliminarDocumentosEgreso = async (egreso) => {
    if (!egreso || !Array.isArray(egreso.facturas)) return;

    for (const empresa of egreso.facturas) {
      if (!Array.isArray(empresa.facturas)) continue;

      for (const factura of empresa.facturas) {
        // Eliminar notas de crédito primero
        if (Array.isArray(factura.notasCredito)) {
          for (const nc of factura.notasCredito) {
            const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', empresa.rut, 'notasCredito', String(nc.numeroDoc));
            try {
              await deleteDoc(ncRef);
            } catch (err) {
              console.warn(`No se pudo eliminar NC ${nc.numeroDoc}:`, err);
            }
          }
        }

        // Eliminar factura
        const facturaRef = doc(
          db,
          currentCompanyRUT,
          '_root',
          'empresas',
          empresa.rut,
          factura.tipoDoc,
          String(factura.numeroDoc)
        );
        try {
          await deleteDoc(facturaRef);
        } catch (err) {
          console.warn(`No se pudo eliminar factura ${factura.numeroDoc}:`, err);
        }
      }
    }
  };

  const handleResetParams = () => {
    setINumeroDoc('');
    setIFechaE('');
    setIFechaV('');
    setIEstado('');
    setIFormaPago('');
    setITipoDoc('');
    setINeto('');
    setIIva('');
    setIFlete('');
    setIRetencion('');
    setITotal('');
    setIOtros('');
    setINotasCredito('');
    setIAbonoNc('');
    setITotalDescontado('');
    setINumeroDocNc('');
    setCurrentDocRut('');
    setCurrentDocTipo('');
    setIUsuarioIngreso('');
    setIFechaIngreso('');
    setIUsuarioPago('');
    setIFechaPago('');
    setIFechaProceso('');
    // Reset abono states
    setIAbonos([]);
    setITotalAbonado(0);
    setISaldoPendiente(0);
  };

  // Confirmar edición del documento
  const handleConfirmarEdicion = async () => {
    const { rut, tipoDoc, numeroDoc } = deleteInfo;

    // Validar neto antes de procesar
    const netoValidation = validateNeto(iNetoNuevo);
    if (!netoValidation.valid) {
      setErrorModal(netoValidation.error);
      return;
    }

    try {
      setLoadingModal(true);

      // Verificar si cambió el número de documento
      const numeroDocCambio = String(iNumeroDocNuevo) !== String(iNumeroDoc);

      if (numeroDocCambio) {
        // Verificar que el nuevo número no exista
        const nuevoDocRef = doc(
          db,
          currentCompanyRUT,
          '_root',
          'empresas',
          String(rut),
          String(tipoDoc),
          String(iNumeroDocNuevo)
        );
        const nuevoDocSnap = await getDoc(nuevoDocRef);

        if (nuevoDocSnap.exists()) {
          setLoadingModal(false);
          setErrorModal('Ya existe un documento con ese número');
          return;
        }
      }

      // Si es una nota de crédito y cambió el total, validar que no exceda el saldo de la factura
      if (tipoDoc === 'notasCredito' && Number(iTotalNuevo) !== Number(iTotal)) {
        // Obtener la nota de crédito actual para saber la factura asociada
        const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', String(numeroDoc));
        const ncSnap = await getDoc(ncRef);

        if (ncSnap.exists()) {
          const ncData = ncSnap.data();
          const tipoFactura = ncData.tipoFacturaAsociada || 'facturas';
          const facturaRef = doc(
            db,
            currentCompanyRUT,
            '_root',
            'empresas',
            String(rut),
            tipoFactura,
            String(ncData.numeroDocNc)
          );
          const facturaSnap = await getDoc(facturaRef);

          if (facturaSnap.exists()) {
            const facturaData = facturaSnap.data();
            const totalFactura = Number(facturaData.total || 0);
            const abonoActual = Number(facturaData.abonoNc || 0);
            const totalNcAnterior = Number(iTotal || 0);
            const totalNcNuevo = Number(iTotalNuevo || 0);

            // Calcular el nuevo abono: restar el anterior y sumar el nuevo
            const nuevoAbono = abonoActual - totalNcAnterior + totalNcNuevo;

            if (nuevoAbono > totalFactura) {
              setLoadingModal(false);
              setErrorModal(
                `Error - El nuevo monto de la nota de crédito (${formatCLP(totalNcNuevo)}) excede el saldo disponible de la factura`
              );
              return;
            }
          }
        }
      }

      // Preparar datos actualizados con campos de auditoría
      const fechaEdicionActual = new Date().toISOString();
      const datosActualizados = {
        numeroDoc: iNumeroDocNuevo,
        fechaE: iFechaENuevo,
        neto: Number(iNetoNuevo) || 0,
        flete: Number(iFleteNuevo) || 0,
        retencion: Number(iRetencionNuevo) || 0,
        otros: Number(iOtrosNuevo) || 0,
        total: Number(iTotalNuevo) || 0,
        // Campos de auditoría
        editadoPor: user?.email || 'desconocido',
        fechaEdicion: fechaEdicionActual,
      };

      // Solo agregar IVA si no es factura exenta
      if (tipoDoc !== 'facturasExentas') {
        datosActualizados.iva = Number(iIvaNuevo) || 0;
      }

      // Solo agregar fechaV si existe (para documentos a crédito)
      if (iFechaVNuevo) {
        datosActualizados.fechaV = iFechaVNuevo;
      }

      if (numeroDocCambio) {
        // Si cambió el número, crear nuevo doc y eliminar el antiguo
        const docRefAntiguo = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
        const docSnapAntiguo = await getDoc(docRefAntiguo);

        if (docSnapAntiguo.exists()) {
          const datosOriginales = docSnapAntiguo.data();
          const nuevoDocRef = doc(
            db,
            currentCompanyRUT,
            '_root',
            'empresas',
            String(rut),
            String(tipoDoc),
            String(iNumeroDocNuevo)
          );

          // Crear entrada de historial con valores anteriores
          const historialEdicion = {
            fecha: fechaEdicionActual,
            usuario: user?.email || 'desconocido',
            valoresAnteriores: {
              numeroDoc: datosOriginales.numeroDoc,
              fechaE: datosOriginales.fechaE,
              fechaV: datosOriginales.fechaV,
              neto: datosOriginales.neto,
              iva: datosOriginales.iva,
              flete: datosOriginales.flete,
              retencion: datosOriginales.retencion,
              otros: datosOriginales.otros,
              total: datosOriginales.total,
            },
          };

          // Combinar datos originales con actualizados, incluyendo historial
          const historialExistente = datosOriginales.historialEdiciones || [];
          await setDoc(nuevoDocRef, {
            ...datosOriginales,
            ...datosActualizados,
            historialEdiciones: [...historialExistente, historialEdicion],
          });
          await deleteDoc(docRefAntiguo);

          // Si es una nota de crédito, actualizar la referencia en la factura asociada
          if (tipoDoc === 'notasCredito' && datosOriginales.numeroDocNc) {
            const tipoFactura = datosOriginales.tipoFacturaAsociada || 'facturas';
            const facturaRef = doc(
              db,
              currentCompanyRUT,
              '_root',
              'empresas',
              String(rut),
              tipoFactura,
              String(datosOriginales.numeroDocNc)
            );
            const facturaSnap = await getDoc(facturaRef);

            if (facturaSnap.exists()) {
              const facturaData = facturaSnap.data();
              if (Array.isArray(facturaData.notasCredito)) {
                const nuevasNotas = facturaData.notasCredito.map((nc) => {
                  const ncNum = typeof nc === 'object' ? nc.numeroDoc : nc;
                  if (String(ncNum) === String(numeroDoc)) {
                    return typeof nc === 'object'
                      ? { ...nc, numeroDoc: iNumeroDocNuevo }
                      : iNumeroDocNuevo;
                  }
                  return nc;
                });
                await updateDoc(facturaRef, { notasCredito: nuevasNotas });
              }
            }
          }

          // Si es una factura con notas de crédito vinculadas, actualizar numeroDocNc en cada NC
          if (
            (tipoDoc === 'facturas' || tipoDoc === 'facturasExentas') &&
            Array.isArray(datosOriginales.notasCredito) &&
            datosOriginales.notasCredito.length > 0
          ) {
            await Promise.all(
              datosOriginales.notasCredito.map(async (nc) => {
                const ncNumero = typeof nc === 'object' ? nc.numeroDoc : nc;
                if (!ncNumero) return;

                const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', String(ncNumero));
                try {
                  await updateDoc(ncRef, { numeroDocNc: iNumeroDocNuevo });
                } catch (err) {
                  console.warn(`No se pudo actualizar numeroDocNc en NC ${ncNumero}:`, err);
                }
              })
            );
          }
        }
      } else {
        // Si no cambió el número, obtener datos actuales para historial y actualizar
        const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
        const docSnapActual = await getDoc(docRef);

        if (docSnapActual.exists()) {
          const datosActuales = docSnapActual.data();

          // Crear entrada de historial con valores anteriores
          const historialEdicion = {
            fecha: fechaEdicionActual,
            usuario: user?.email || 'desconocido',
            valoresAnteriores: {
              numeroDoc: datosActuales.numeroDoc,
              fechaE: datosActuales.fechaE,
              fechaV: datosActuales.fechaV,
              neto: datosActuales.neto,
              iva: datosActuales.iva,
              flete: datosActuales.flete,
              retencion: datosActuales.retencion,
              otros: datosActuales.otros,
              total: datosActuales.total,
            },
          };

          await updateDoc(docRef, {
            ...datosActualizados,
            historialEdiciones: arrayUnion(historialEdicion),
          });
        } else {
          // Si el documento no existe, solo actualizar sin historial
          await updateDoc(docRef, datosActualizados);
        }
      }

      // Si es una nota de crédito y cambió el total, actualizar la factura asociada
      if (tipoDoc === 'notasCredito' && Number(iTotalNuevo) !== Number(iTotal)) {
        try {
          const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', String(iNumeroDocNuevo));
          const ncSnap = await getDoc(ncRef);

          if (ncSnap.exists()) {
            const ncData = ncSnap.data();
            const tipoFactura = ncData.tipoFacturaAsociada || 'facturas';
            const facturaRef = doc(
              db,
              currentCompanyRUT,
              '_root',
              'empresas',
              String(rut),
              tipoFactura,
              String(ncData.numeroDocNc)
            );
            const facturaSnap = await getDoc(facturaRef);

            if (facturaSnap.exists()) {
              const facturaData = facturaSnap.data();
              const totalFactura = Number(facturaData.total || 0);
              const abonoActual = Number(facturaData.abonoNc || 0);
              const totalNcAnterior = Number(iTotal || 0);
              const totalNcNuevo = Number(iTotalNuevo || 0);

              // Calcular el nuevo abono
              const nuevoAbono = abonoActual - totalNcAnterior + totalNcNuevo;
              const nuevoTotalDescontado = totalFactura - nuevoAbono;

              await updateDoc(facturaRef, {
                abonoNc: nuevoAbono,
                totalDescontado: nuevoTotalDescontado,
              });
            }
          }
        } catch (err) {
          console.warn('No se pudo actualizar la factura asociada:', err);
        }
      }

      // Registrar edición en auditoría (con fallback si falla)
      try {
        const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
        await addDoc(auditoriaRef, {
          tipo: 'edicion',
          tipoDocumento: tipoDoc,
          numeroDocumento: iNumeroDocNuevo,
          numeroDocumentoAnterior: numeroDocCambio ? numeroDoc : null,
          empresaRut: rut,
          editadoPor: user?.email || 'desconocido',
          fechaEdicion: fechaEdicionActual,
          cambios: {
            numeroDoc: { anterior: numeroDoc, nuevo: iNumeroDocNuevo },
            fechaE: {
              anterior: iFechaE
                ? iFechaE instanceof Date
                  ? iFechaE.toISOString()
                  : iFechaE
                : null,
              nuevo: iFechaENuevo
                ? iFechaENuevo instanceof Date
                  ? iFechaENuevo.toISOString()
                  : iFechaENuevo
                : null,
            },
            fechaV: {
              anterior: iFechaV
                ? iFechaV instanceof Date
                  ? iFechaV.toISOString()
                  : iFechaV
                : null,
              nuevo: iFechaVNuevo
                ? iFechaVNuevo instanceof Date
                  ? iFechaVNuevo.toISOString()
                  : iFechaVNuevo
                : null,
            },
            neto: { anterior: iNeto, nuevo: iNetoNuevo },
            iva: { anterior: iIva, nuevo: iIvaNuevo },
            flete: { anterior: iFlete, nuevo: iFleteNuevo },
            retencion: { anterior: iRetencion, nuevo: iRetencionNuevo },
            otros: { anterior: iOtros, nuevo: iOtrosNuevo },
            total: { anterior: iTotal, nuevo: iTotalNuevo },
          },
        });
      } catch (auditError) {
        console.warn('No se pudo registrar edición en auditoría:', auditError);
      }

      setLoadingModal(false);
      setEditarModal(false);
      setErrorModal('Documento actualizado correctamente');
      handleBuscar();
    } catch (error) {
      console.error('Error actualizando documento:', error);
      setLoadingModal(false);
      setErrorModal('Error al actualizar el documento');
    }
  };

  const handleConfirmDelete = async () => {
    const { rut, tipoDoc, numeroDoc } = deleteInfo;
    try {
      setConfirmDeleteModal(false); // cerramos el modal primario
      setLoadingModal(true);

      const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setLoadingModal(false);
        setErrorModal('El documento no existe en Firestore');
        return;
      }

      const docData = docSnap.data();

      // Si es factura y tiene notasCredito (array no vacío) -> abrir modal especial
      if (
        tipoDoc === 'facturas' &&
        Array.isArray(docData.notasCredito) &&
        docData.notasCredito.length > 0
      ) {
        setINotasCredito(docData.notasCredito);
        setLoadingModal(false);
        setHasNotasCreditoModal(true);
        return;
      }

      // Caso especial: si es una nota de crédito, actualizar la factura asociada
      if (tipoDoc === 'notasCredito' && docData.numeroDocNc) {
        // Buscar la factura en facturas o facturasExentas
        const tipoFactura = docData.tipoFacturaAsociada || 'facturas';
        let facturaRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), tipoFactura, String(docData.numeroDocNc));
        let facturaSnap = await getDoc(facturaRef);

        // Si no existe en el tipo guardado, buscar en el otro
        if (!facturaSnap.exists() && tipoFactura === 'facturas') {
          facturaRef = doc(
            db,
            currentCompanyRUT,
            '_root',
            'empresas',
            String(rut),
            'facturasExentas',
            String(docData.numeroDocNc)
          );
          facturaSnap = await getDoc(facturaRef);
        } else if (!facturaSnap.exists() && tipoFactura === 'facturasExentas') {
          facturaRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'facturas', String(docData.numeroDocNc));
          facturaSnap = await getDoc(facturaRef);
        }

        if (facturaSnap.exists()) {
          const facturaData = facturaSnap.data();

          // Filtrar la nota de crédito del array
          if (Array.isArray(facturaData.notasCredito)) {
            const nuevasNotas = facturaData.notasCredito.filter((nc) => {
              const ncNum = typeof nc === 'object' ? nc.numeroDoc : nc;
              return String(ncNum) !== String(numeroDoc);
            });

            // Restar el total de la NC del abonoNc
            const totalNc = Number(docData.total) || 0;
            const nuevoAbonoNc = Math.max((facturaData.abonoNc || 0) - totalNc, 0);
            const totalFactura = Number(facturaData.total) || 0;
            const nuevoTotalDescontado = totalFactura - nuevoAbonoNc;

            // Actualizar la factura
            if (nuevasNotas.length === 0) {
              // Si no quedan notas de crédito, eliminar los campos
              await updateDoc(facturaRef, {
                notasCredito: deleteField(),
                abonoNc: deleteField(),
                totalDescontado: deleteField(),
              });
            } else {
              await updateDoc(facturaRef, {
                notasCredito: nuevasNotas,
                abonoNc: nuevoAbonoNc,
                totalDescontado: nuevoTotalDescontado,
              });
            }
          }
        }
      }

      // Registrar en auditoría antes de eliminar (con fallback si falla)
      try {
        const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
        // Sanitizar datos para evitar problemas con Timestamps
        const datosParaAuditoria = JSON.parse(JSON.stringify(docData));
        await addDoc(auditoriaRef, {
          tipo: 'eliminacion',
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          empresaRut: rut,
          datosEliminados: datosParaAuditoria,
          eliminadoPor: user?.email || 'desconocido',
          fechaEliminacion: new Date().toISOString(),
        });
      } catch (auditError) {
        console.warn(
          'No se pudo registrar en auditoría (puede que las reglas no estén desplegadas):',
          auditError
        );
        // Continuar con la eliminación aunque falle el registro de auditoría
      }

      // Eliminar documento normalmente
      await deleteDoc(docRef);

      setLoadingModal(false);
      setEditarModal(false);
      setErrorModal('Documento eliminado correctamente');
      handleBuscar();
    } catch (error) {
      console.error('Error en handleConfirmDelete:', error);
      setLoadingModal(false);
      setErrorModal('Error eliminando documento');
    }
  };

  const handleEliminarConNotasCredito = async () => {
    const { rut, tipoDoc, numeroDoc } = deleteInfo;
    const fechaEliminacion = new Date().toISOString();
    const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');

    // Helper para registrar en auditoría con fallback
    const registrarAuditoria = async (datos) => {
      try {
        const datosParaAuditoria = JSON.parse(JSON.stringify(datos));
        await addDoc(auditoriaRef, datosParaAuditoria);
      } catch (auditError) {
        console.warn('No se pudo registrar en auditoría:', auditError);
      }
    };

    try {
      setHasNotasCreditoModal(false);
      setLoadingModal(true);

      // 1) Eliminar cada nota de crédito referenciada con registro de auditoría
      if (Array.isArray(iNotasCredito) && iNotasCredito.length > 0) {
        for (const nc of iNotasCredito) {
          const ncNumero =
            typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
          if (!ncNumero) continue;
          const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', ncNumero);
          try {
            const ncSnap = await getDoc(ncRef);
            if (ncSnap.exists()) {
              // Registrar en auditoría (no bloquea si falla)
              await registrarAuditoria({
                tipo: 'eliminacion',
                tipoDocumento: 'notasCredito',
                numeroDocumento: ncNumero,
                empresaRut: rut,
                datosEliminados: ncSnap.data(),
                eliminadoPor: user?.email || 'desconocido',
                fechaEliminacion: fechaEliminacion,
                motivoEliminacion: `Eliminación en cascada con factura ${numeroDoc}`,
              });
              await deleteDoc(ncRef);
            }
          } catch (err) {
            console.warn(`No se pudo eliminar nota de crédito ${ncNumero}:`, err);
          }
        }
      }

      // 2) Obtener datos de la factura para auditoría
      const facturaRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const facturaSnap = await getDoc(facturaRef);

      if (facturaSnap.exists()) {
        // Registrar eliminación de factura en auditoría (no bloquea si falla)
        await registrarAuditoria({
          tipo: 'eliminacion',
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          empresaRut: rut,
          datosEliminados: facturaSnap.data(),
          eliminadoPor: user?.email || 'desconocido',
          fechaEliminacion: fechaEliminacion,
          notasCreditoEliminadas: iNotasCredito.map((nc) =>
            typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc)
          ),
        });
      }

      // Eliminar la factura
      await deleteDoc(facturaRef);

      setLoadingModal(false);
      setEditarModal(false);
      setErrorModal('Factura y notas de crédito eliminadas correctamente');
      handleBuscar();
    } catch (error) {
      console.error('Error eliminando factura y notas de crédito:', error);
      setLoadingModal(false);
      setErrorModal('Error eliminando las notas de crédito o la factura');
    }
  };

  const handleVincularNotasCredito = async () => {
    const { rut, tipoDoc, numeroDoc } = deleteInfo;

    const destinoTipo = vincularTipoDoc === 'Factura electrónica' ? 'facturas' : 'facturasExentas';
    const destinoNumero = String(vincularNumeroDoc).trim();

    if (!destinoNumero) {
      setErrorModal('Error - Número de documento inexistente');
      return;
    }

    try {
      setLoadingModal(true);

      // 1) Validar existencia del documento destino
      const destinoRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), destinoTipo, destinoNumero);
      const destinoSnap = await getDoc(destinoRef);

      if (!destinoSnap.exists()) {
        setLoadingModal(false);
        setErrorModal('Error - Número de documento inexistente');
        return;
      }

      if (String(destinoNumero) === String(numeroDoc)) {
        setLoadingModal(false);
        setErrorModal('Error - El número de factura a vincular es el actual');
        return;
      }

      const destinoData = destinoSnap.data();
      if (destinoData.estado === 'pagado') {
        setLoadingModal(false);
        setErrorModal('Error - El documento destino se encuentra con egreso.');
        return;
      }

      const notasExistentes = Array.isArray(destinoData.notasCredito)
        ? destinoData.notasCredito
        : [];
      const notasAtrasladar = Array.isArray(iNotasCredito) ? iNotasCredito : [];

      // 2) Evitar duplicados
      const numerosExistentes = new Set(
        notasExistentes.map((n) =>
          typeof n === 'object' && n.numeroDoc ? String(n.numeroDoc) : String(n)
        )
      );
      const nuevasNotasConcatenadas = [...notasExistentes];

      for (const nc of notasAtrasladar) {
        const ncNum = typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
        if (!numerosExistentes.has(ncNum)) {
          nuevasNotasConcatenadas.push(nc);
          numerosExistentes.add(ncNum);
        }
      }

      // 3) Calcular abonoNc (suma de los totales de las notas de crédito)
      let abonoNc = 0;

      for (const nc of nuevasNotasConcatenadas) {
        const ncNum = typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
        if (!ncNum) continue;

        const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', ncNum);
        const ncSnap = await getDoc(ncRef);

        if (ncSnap.exists()) {
          const ncData = ncSnap.data();
          const totalNc = Number(ncData.total || 0);
          abonoNc += totalNc;
        }
      }

      // 4) Calcular totalDescontado (totalFactura - abonoNc)
      const totalFactura = Number(destinoData.total || 0);

      // Validar que el total de notas de crédito no exceda el total de la factura
      if (abonoNc > totalFactura) {
        setLoadingModal(false);
        setErrorModal(
          `Error - El total de notas de crédito (${formatCLP(abonoNc)}) excede el monto de la factura destino (${formatCLP(totalFactura)})`
        );
        return;
      }

      const totalDescontado = Math.max(totalFactura - abonoNc, 0);

      // 5) Actualizar documento destino
      await updateDoc(destinoRef, {
        notasCredito: nuevasNotasConcatenadas,
        abonoNc,
        totalDescontado,
      });

      // 6) Actualizar cada nota de crédito con su nuevo número de factura asociada
      for (const nc of notasAtrasladar) {
        const ncNum = typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
        if (!ncNum) continue;

        const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', ncNum);
        try {
          await updateDoc(ncRef, { numeroDocNc: destinoNumero });
        } catch (err) {
          console.warn(`No se pudo actualizar numeroDocNc para nota ${ncNum}:`, err);
        }
      }

      // 7) Obtener datos de la factura antes de eliminar para auditoría
      const facturaRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const facturaSnap = await getDoc(facturaRef);
      const facturaData = facturaSnap.exists() ? facturaSnap.data() : null;

      // 8) Registrar en auditoría antes de eliminar
      try {
        const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
        const datosParaAuditoria = facturaData ? JSON.parse(JSON.stringify(facturaData)) : {};
        await addDoc(auditoriaRef, {
          tipo: 'eliminacion',
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          empresaRut: rut,
          datosEliminados: datosParaAuditoria,
          eliminadoPor: user?.email || 'desconocido',
          fechaEliminacion: new Date().toISOString(),
          motivoEliminacion: `Notas de crédito revinculadas a ${destinoTipo === 'facturas' ? 'Factura' : 'Factura Exenta'} #${destinoNumero}`,
          notasCreditoRevinculadas: notasAtrasladar.map((nc) =>
            typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc)
          ),
        });
      } catch (auditError) {
        console.warn('No se pudo registrar en auditoría:', auditError);
      }

      // 9) Eliminar factura original
      await deleteDoc(facturaRef);

      setLoadingModal(false);
      setVincularModal(false);
      setEditarModal(false);
      setErrorModal('Notas vinculadas y factura actualizada correctamente');
      handleBuscar();
    } catch (error) {
      console.error('Error vinculando notas de crédito:', error);
      setLoadingModal(false);
      setErrorModal('Error al vincular las notas de crédito');
    }
  };

  const handleVincularSinEliminarNotasCredito = async () => {
    const { rut, tipoDoc, numeroDoc } = deleteInfo;

    const destinoTipo = vincularTipoDoc === 'Factura electrónica' ? 'facturas' : 'facturasExentas';
    const destinoNumero = String(vincularNumeroDoc).trim();

    if (!destinoNumero) {
      setErrorModal('Error - Número de documento inexistente');
      return;
    }

    try {
      setLoadingModal(true);

      // 1) Obtener factura origen
      const facturaRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), String(tipoDoc), String(numeroDoc));
      const facturaSnap = await getDoc(facturaRef);
      if (!facturaSnap.exists()) {
        setLoadingModal(false);
        setErrorModal('Error - La factura origen no existe');
        return;
      }
      const facturaData = facturaSnap.data();

      // 2) Verificar que tenga notas de crédito asociadas
      const notasAtrasladar = Array.isArray(facturaData.notasCredito)
        ? facturaData.notasCredito
        : [];
      if (notasAtrasladar.length === 0) {
        setLoadingModal(false);
        setErrorModal('Error - La factura no tiene notas de crédito para desvincular');
        return;
      }

      // 3) Evitar vincular a sí misma
      if (String(destinoNumero) === String(numeroDoc)) {
        setLoadingModal(false);
        setErrorModal('Error - El número de factura a vincular es el actual');
        return;
      }

      // 4) Validar destino
      const destinoRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), destinoTipo, destinoNumero);
      const destinoSnap = await getDoc(destinoRef);
      if (!destinoSnap.exists()) {
        setLoadingModal(false);
        setErrorModal('Error - El documento destino no existe');
        return;
      }
      const destinoData = destinoSnap.data();

      if (destinoData.estado === 'pagado') {
        setLoadingModal(false);
        setErrorModal('Error - El documento destino se encuentra con egreso.');
        return;
      }

      // 5) Agregar notas al destino (evitando duplicados)
      const notasExistentesDestino = Array.isArray(destinoData.notasCredito)
        ? destinoData.notasCredito
        : [];
      const numerosExistentes = new Set(
        notasExistentesDestino.map((n) =>
          typeof n === 'object' && n.numeroDoc ? String(n.numeroDoc) : String(n)
        )
      );

      const nuevasNotasDestino = [...notasExistentesDestino];
      for (const nc of notasAtrasladar) {
        const ncNum = typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
        if (!numerosExistentes.has(ncNum)) {
          nuevasNotasDestino.push(nc);
          numerosExistentes.add(ncNum);
        }
      }

      // 6) Recalcular abonoNc y totalDescontado del destino
      let abonoNcDestino = 0;
      for (const nc of nuevasNotasDestino) {
        const ncNum = typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
        if (!ncNum) continue;

        const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', ncNum);
        const ncSnap = await getDoc(ncRef);
        if (ncSnap.exists()) {
          const ncData = ncSnap.data();
          abonoNcDestino += Number(ncData.total || 0);
        }
      }

      const totalFacturaDestino = Number(destinoData.total || 0);

      // Validar que el total de notas de crédito no exceda el total de la factura
      if (abonoNcDestino > totalFacturaDestino) {
        setLoadingModal(false);
        setErrorModal(
          `Error - El total de notas de crédito (${formatCLP(abonoNcDestino)}) excede el monto de la factura destino (${formatCLP(totalFacturaDestino)})`
        );
        return;
      }

      const totalDescontadoDestino = Math.max(totalFacturaDestino - abonoNcDestino, 0);

      // 7) Actualizar destino
      await updateDoc(destinoRef, {
        notasCredito: nuevasNotasDestino,
        abonoNc: abonoNcDestino,
        totalDescontado: totalDescontadoDestino,
      });

      // 8) Actualizar cada nota de crédito con su nueva factura asociada
      for (const nc of notasAtrasladar) {
        const ncNum = typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc);
        if (!ncNum) continue;

        const ncRef = doc(db, currentCompanyRUT, '_root', 'empresas', String(rut), 'notasCredito', ncNum);
        await updateDoc(ncRef, { numeroDocNc: destinoNumero });
      }

      // 9) Quitar las notas de crédito de la factura origen
      await updateDoc(facturaRef, {
        notasCredito: deleteField(),
        abonoNc: deleteField(),
        totalDescontado: deleteField(),
      });

      // 10) Registrar revinculación en auditoría
      try {
        const auditoriaRef = collection(db, currentCompanyRUT, '_root', 'auditoria');
        await addDoc(auditoriaRef, {
          tipo: 'revinculacion',
          tipoDocumento: tipoDoc,
          numeroDocumento: numeroDoc,
          empresaRut: rut,
          revinculadoPor: user?.email || 'desconocido',
          fechaRevinculacion: new Date().toISOString(),
          documentoDestino: {
            tipo: destinoTipo,
            numero: destinoNumero,
          },
          notasCreditoRevinculadas: notasAtrasladar.map((nc) =>
            typeof nc === 'object' && nc.numeroDoc ? String(nc.numeroDoc) : String(nc)
          ),
        });
      } catch (auditError) {
        console.warn('No se pudo registrar revinculación en auditoría:', auditError);
      }

      handleBuscar();
      setLoadingModal(false);
      setVincularModal(false);
      setEditarModal(false);
      setErrorModal('Notas de crédito desvinculadas y asociadas al nuevo documento correctamente');
      handleBuscar();
    } catch (error) {
      console.error('Error al desvincular notas de crédito:', error);
      setLoadingModal(false);
      setErrorModal('Error al desvincular las notas de crédito');
    }
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
            <VolverButton onClick={() => navigate('/recepcion-index')} />
          </div>
          <H1Tittle text="Revisión de documentos" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col flex-wrap justify-start gap-4 px-3 sm:px-5 py-2 overflow-x-auto">
          <div className="grid gap-x-12 gap-y-2 grid-cols-4 grid-rows-2">
            <div className="relative">
              <DatepickerRange
                classNameField="w-full"
                label={
                  <>
                    Rango de fechas *
                    {dateRangeError && (
                      <span className="text-red-400 font-normal ml-2">- Requerido</span>
                    )}
                  </>
                }
                startDate={fechaInicio}
                endDate={fechaFin}
                onChange={(update) => {
                  setRangoFecha(update);
                  if (update[0] && update[1]) {
                    setDateRangeError(false);
                  }
                }}
              />
            </div>
            <DropdownMenu
              classNameMenu="w-[1/3]"
              tittle="Tipo documento"
              items={rowTipoDoc.filter((item) => item !== 'Guía electrónica')}
              value={selectedTipoDoc}
              onSelect={setSelectedTipoDoc}
            />
            <DropdownMenu
              classNameMenu="w-[1/3]"
              tittle="Estado de documentos"
              items={rowEstadoDoc.map((item) => item)}
              value={selectedEstadoDoc}
              onSelect={setSelectedEstadoDoc}
            />
            <DropdownMenu
              classNameMenu="w-[1/3]"
              tittle="Forma de pago"
              items={rowFormaPago.map((item) => item)}
              value={selectedFormaPago}
              onSelect={setSelectedFormaPago}
            />

            <DropdownMenu
              classNameMenu="w-[1/3]"
              tittle="Empresa"
              searchable={true}
              items={['Todas', ...empresas.map((e) => `${formatRUT(e.rut)} ${e.razon}`)]}
              value={
                filtroRut
                  ? `${formatRUT(filtroRut)} ${empresas.find((e) => e.rut === filtroRut)?.razon || ''}`
                  : 'Todas'
              }
              onSelect={(val) => {
                if (val === 'Todas') {
                  setFiltroRut('');
                } else {
                  // Extraer el RUT del string seleccionado
                  const rutMatch = val.match(/^[\d.]+-[\dkK]/);
                  if (rutMatch) {
                    const rutLimpio = cleanRUT(rutMatch[0]);
                    setFiltroRut(rutLimpio);
                  }
                }
              }}
            />

            <Textfield
              classNameInput="w-[1/3]"
              label="N° Folio"
              type="number"
              value={filtroFolio}
              onChange={(e) => setFiltroFolio(e.target.value)}
            />

            <div></div>

            <TextButton
              text="Buscar"
              className="bg-accent-blue text-white self-end hover:bg-blue-600 active:bg-blue-700 h-7 w-fit place-self-center px-5 py-5"
              classNameText="font-black"
              onClick={() => {
                if (!fechaInicio || !fechaFin) {
                  setDateRangeError(true);
                  return;
                }
                setDateRangeError(false);
                handleBuscar();
                setLoadingModal(true);
              }}
            />
          </div>

          <Card
            hasButton={false}
            contentClassName="max-h-[calc(100vh-22rem)] overflow-y-auto scrollbar-custom flex flex-col w-full"
            content={
              <div>
                {/* Search input for quick filtering */}
                <div className="mb-3 relative">
                  <input
                    type="text"
                    placeholder="Buscar por RUT, razón social, folio, tipo, estado o monto..."
                    value={busquedaRapida}
                    onChange={(e) => setBusquedaRapida(e.target.value)}
                    className={`w-full rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue/50 transition-all ${
                      isLightTheme
                        ? 'bg-white border border-gray-300 text-gray-800 placeholder-gray-400'
                        : 'bg-white/5 border border-white/10 text-white placeholder-slate-400'
                    }`}
                  />
                  <svg
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isLightTheme ? 'text-gray-400' : 'text-slate-400'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  {busquedaRapida && (
                    <button
                      onClick={() => setBusquedaRapida('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                        isLightTheme
                          ? 'text-gray-400 hover:text-gray-700'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Encabezado - Clickable for sorting */}
                <div
                  className={`flex items-center font-semibold text-xs mb-2 rounded-lg py-2 ${
                    isLightTheme ? 'bg-gray-50 text-gray-600' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <button
                    onClick={() => handleSort('tipo')}
                    className="w-[17%] text-center hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                  >
                    Tipo
                    {sortColumn === 'tipo' && (
                      <span className="text-accent-blue">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('folio')}
                    className="w-[10%] text-center hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                  >
                    Folio
                    {sortColumn === 'folio' && (
                      <span className="text-accent-blue">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('fechaE')}
                    className="w-[14%] text-center hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                  >
                    Emisión
                    {sortColumn === 'fechaE' && (
                      <span className="text-accent-blue">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('fechaV')}
                    className="w-[14%] text-center hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                  >
                    Vencimiento
                    {sortColumn === 'fechaV' && (
                      <span className="text-accent-blue">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('monto')}
                    className="w-[15%] text-center hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                  >
                    Monto
                    {sortColumn === 'monto' && (
                      <span className="text-accent-blue">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('estado')}
                    className="w-[12%] text-center hover:text-accent-blue transition-colors flex items-center justify-center gap-1"
                  >
                    Estado
                    {sortColumn === 'estado' && (
                      <span className="text-accent-blue">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <div className="w-[18%] text-center">Acciones</div>
                </div>

                {/* Results count */}
                {empresasConDocs.length > 0 && (
                  <div className="text-xs text-slate-400 mb-2 flex justify-between items-center">
                    <span>
                      {busquedaRapida
                        ? `${empresasFiltradas.reduce((acc, e) => acc + e.documentos.length, 0)} de ${empresasConDocs.reduce((acc, e) => acc + e.documentos.length, 0)} documentos`
                        : `${empresasConDocs.reduce((acc, e) => acc + e.documentos.length, 0)} documentos en ${empresasConDocs.length} empresa${empresasConDocs.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                )}

                {/* Contenido dinámico */}
                <div className="flex flex-col">
                  {empresasFiltradas.length === 0 && empresasConDocs.length > 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      <p className="text-sm">
                        No se encontraron resultados para "{busquedaRapida}"
                      </p>
                    </div>
                  ) : (
                    empresasFiltradas.map((empresa) => (
                      <div key={empresa.rut} className="mb-4">
                        <button
                          onClick={() => toggleProviderCollapse(empresa.rut)}
                          className={`w-full flex gap-6 items-center p-3 rounded-lg mb-2 transition-all duration-200 cursor-pointer ${
                            isLightTheme
                              ? 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-accent-blue/30'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent-blue/30'
                          }`}
                        >
                          <span
                            className={`text-accent-blue transition-transform duration-300 ${isProviderExpanded(empresa.rut) ? 'rotate-90' : ''}`}
                          >
                            ▶
                          </span>
                          <p
                            className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                          >
                            RUT: {formatRUT(empresa.rut)}
                          </p>
                          <p
                            className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                          >
                            NOMBRE: {empresa.razon}
                          </p>
                          <p
                            className={`text-sm ml-auto ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                          >
                            {empresa.documentos.length} documento
                            {empresa.documentos.length !== 1 ? 's' : ''} •{' '}
                            <span className="font-medium">
                              $
                              {empresa.documentos
                                .reduce((sum, doc) => sum + (doc.total || 0), 0)
                                .toLocaleString('es-CL')}
                            </span>
                          </p>
                        </button>

                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            isProviderExpanded(empresa.rut)
                              ? 'grid-rows-[1fr] opacity-100'
                              : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden">
                            {sortDocuments(empresa.documentos).map((doc) => (
                              <div
                                key={`${empresa.rut}-${doc.tipo}-${doc.id}`}
                                className={`flex items-center py-2 rounded-lg border-b ${
                                  isLightTheme
                                    ? 'hover:bg-gray-50 border-gray-100'
                                    : 'hover:bg-white/5 border-white/5'
                                }`}
                              >
                                <div className="w-[17%] text-center text-xs px-1">
                                  {doc.tipo === 'facturas'
                                    ? 'Fact. electrónica'
                                    : doc.tipo === 'facturasExentas'
                                      ? 'Fact. exenta'
                                      : doc.tipo === 'boletas'
                                        ? 'Boleta'
                                        : 'Nota crédito'}
                                </div>
                                <div className="w-[10%] text-center text-xs font-medium">
                                  {doc.numeroDoc ?? '-'}
                                </div>
                                <div className="w-[14%] text-center text-xs">
                                  {doc.fechaE?.toDate
                                    ? doc.fechaE.toDate().toLocaleDateString('es-CL')
                                    : '-'}
                                </div>
                                <div className="w-[14%] text-center text-xs">
                                  {doc.fechaV?.toDate
                                    ? doc.fechaV.toDate().toLocaleDateString('es-CL')
                                    : '-'}
                                </div>
                                <div className="w-[15%] text-center text-xs font-medium">
                                  {doc.total != null
                                    ? `$${doc.total.toLocaleString('es-CL')}`
                                    : '-'}
                                </div>
                                <div className="w-[12%] flex justify-center">
                                  <span
                                    className={`
                                inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                ${
                                  doc.estado === 'pagado'
                                    ? 'bg-success/20 text-success'
                                    : doc.estado === 'parcialmente_pagado'
                                      ? 'bg-cyan-500/20 text-cyan-400'
                                      : doc.estado === 'vencido' ||
                                          doc.estado === 'parcialmente_vencido'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-slate-500/20 text-slate-400'
                                }
                              `}
                                  >
                                    {doc.estado === 'parcialmente_pagado'
                                      ? 'Parc. pagado'
                                      : doc.estado === 'parcialmente_vencido'
                                        ? 'Parc. vencido'
                                        : (doc.estado ?? '-')}
                                  </span>
                                </div>
                                <div className="w-[18%] flex justify-center gap-1">
                                  <ImgButton
                                    src={searchIcon}
                                    classNameImg="w-4"
                                    className="flex-none p-1"
                                    onClick={() =>
                                      handleRevisionDoc(empresa.rut, doc.numeroDoc, doc.tipo)
                                    }
                                    title="Detalles"
                                  />
                                  <ImgButton
                                    src={reportIcon}
                                    classNameImg="w-4"
                                    className="flex-none p-1"
                                    onClick={() =>
                                      handleGenerarPDF(empresa.rut, doc.numeroDoc, doc.tipo)
                                    }
                                    title="Egreso"
                                  />
                                  {puedeEditar && (
                                    <ImgButton
                                      src={configIcon}
                                      classNameImg="w-4"
                                      className="flex-none p-1"
                                      title="Editar"
                                      onClick={() =>
                                        handleEditarDoc(empresa.rut, doc.numeroDoc, doc.tipo)
                                      }
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            }
          />
        </div>

        {pdfModal && (
          <Modal onClickOutside={() => setPdfModal(false)}>
            <p className="font-black">Este documento no tiene egreso.</p>
          </Modal>
        )}

        {revisionModal && (
          <Modal onClickOutside={() => setRevisionModal(false)} className="!absolute !top-24">
            <p className="font-black text-3xl text-center">{`${iTipoDoc} N°${iNumeroDoc}`}</p>

            {/* Sección 1 */}
            <div>
              <p className="mt-10 font-bold text-xl">Información del documento</p>
              <div
                className={`grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 rounded-xl p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/40'}`}
              >
                <div className="flex justify-between gap-x-4">
                  <span>Fecha de emisión:</span>
                  <span>{iFechaE ? iFechaE.toLocaleDateString('es-CL') : '-'}</span>
                </div>

                {iFechaV ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Fecha de vencimiento:</span>
                    <span>{iFechaV.toLocaleDateString('es-CL')}</span>
                  </div>
                ) : null}

                <div className="flex justify-between gap-x-4">
                  <span>Estado:</span>
                  <span>{iEstado}</span>
                </div>

                {iFormaPago ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Forma de pago:</span>
                    <span>{iFormaPago}</span>
                  </div>
                ) : (
                  <div></div>
                )}

                {iNumeroDocNc ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Folio documento asociado:</span>
                    <span>{iNumeroDocNc}</span>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            </div>

            {/* Sección 2 */}
            <div>
              <p className="mt-4 font-bold text-xl">Montos del documento</p>
              <div
                className={`grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 rounded-xl p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/40'}`}
              >
                <div className="flex justify-between gap-x-4">
                  <span>Monto neto:</span>
                  <span>{formatCLP(iNeto)}</span>
                </div>

                <div className="flex justify-between gap-x-4">
                  <span>IVA:</span>
                  <span>{formatCLP(iIva)}</span>
                </div>

                {iOtros ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Otros impuestos:</span>
                    <span>{formatCLP(iOtros)}</span>
                  </div>
                ) : (
                  <div></div>
                )}

                {iRetencion ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Retención:</span>
                    <span>{formatCLP(iRetencion)}</span>
                  </div>
                ) : (
                  <div></div>
                )}

                {iFlete ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Flete:</span>
                    <span>{formatCLP(iFlete)}</span>
                  </div>
                ) : (
                  <div></div>
                )}

                <div></div>

                {iTotal ? (
                  <div className="flex justify-between font-black gap-x-4">
                    <span>Monto documento:</span>
                    <span>{formatCLP(iTotal)}</span>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            </div>

            {/* Sección Notas de crédito */}
            {iNotasCredito != [''] && (
              <div>
                <p className="mt-4 font-bold text-xl">Nota(s) de crédito</p>
                <div
                  className={`grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 rounded-xl p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/40'}`}
                >
                  {iNotasCredito && iNotasCredito.length > 0 && iNotasCredito[0] !== '' ? (
                    <div className="flex justify-between gap-x-4">
                      <span>Notas de crédito asociadas:</span>
                      <div>
                        {iNotasCredito.map((nota, index) => (
                          <span key={index} className="mr-1">
                            {nota}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {iAbonoNc != [''] ? (
                    <div className="flex justify-between gap-x-4">
                      <span>Valor total notas de crédito:</span>
                      <span>{formatCLP(iAbonoNc)}</span>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {iTotalDescontado != [''] ? (
                    <div className="flex justify-between font-black gap-x-4">
                      <span>Monto de pago:</span>
                      <span>{formatCLP(iTotalDescontado)}</span>
                    </div>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
            )}

            {/* Sección Usuario / Fechas */}
            {iUsuarioIngreso && (
              <div>
                <p className="mt-4 font-bold text-xl">Movimientos del documento</p>
                <div
                  className={`grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 rounded-xl p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/40'}`}
                >
                  <div className="flex justify-between gap-x-4">
                    <span>Ingresado por:</span>
                    <span>{iUsuarioIngreso}</span>
                  </div>

                  <div className="flex justify-between gap-x-4">
                    <span>Fecha de ingreso:</span>
                    <span>{iFechaIngreso}</span>
                  </div>

                  {iUsuarioPago && (
                    <div className="flex justify-between gap-x-4">
                      <span>Procesado por:</span>
                      <span>{iUsuarioPago}</span>
                    </div>
                  )}

                  {iFechaPago && (
                    <div className="flex justify-between gap-x-4">
                      <span>Fecha de pago:</span>
                      <span className="font-semibold text-green-400">{iFechaPago}</span>
                    </div>
                  )}

                  {iFechaProceso && (
                    <div className="flex justify-between gap-x-4">
                      <span>Fecha de procesamiento:</span>
                      <span>{iFechaProceso}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sección Historial de Abonos */}
            {iAbonos && iAbonos.length > 0 && (
              <div>
                <p className="mt-4 font-bold text-xl">Historial de abonos</p>
                <div className={`rounded-xl p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/40'}`}>
                  {/* Table header */}
                  <div className="grid grid-cols-4 gap-2 font-semibold text-sm mb-2 border-b border-white/20 pb-2">
                    <span>Fecha</span>
                    <span className="text-right">Monto</span>
                    <span className="text-center">N° Egreso</span>
                    <span className="text-right">Usuario</span>
                  </div>

                  {/* Abono entries */}
                  {iAbonos.map((abono, index) => {
                    // Parse fecha - can be Date, Firestore Timestamp, or ISO string
                    let fechaDisplay = '-';
                    if (abono.fecha) {
                      if (abono.fecha.toDate) {
                        fechaDisplay = abono.fecha.toDate().toLocaleDateString('es-CL');
                      } else if (abono.fecha.seconds) {
                        fechaDisplay = new Date(abono.fecha.seconds * 1000).toLocaleDateString(
                          'es-CL'
                        );
                      } else if (typeof abono.fecha === 'string') {
                        fechaDisplay = new Date(abono.fecha).toLocaleDateString('es-CL');
                      } else if (abono.fecha instanceof Date) {
                        fechaDisplay = abono.fecha.toLocaleDateString('es-CL');
                      }
                    }

                    return (
                      <div key={index} className="grid grid-cols-4 gap-2 text-sm py-1">
                        <span>{fechaDisplay}</span>
                        <span className="text-right text-cyan-600">{formatCLP(abono.monto)}</span>
                        <span className="text-center">#{abono.numeroEgreso || '-'}</span>
                        <span className="text-right truncate" title={abono.usuario}>
                          {abono.usuario || '-'}
                        </span>
                      </div>
                    );
                  })}

                  {/* Summary */}
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="flex justify-between font-semibold">
                      <span>Total abonado:</span>
                      <span className="text-green-400">{formatCLP(iTotalAbonado)}</span>
                    </div>
                    {iEstado !== 'pagado' && (
                      <div className="flex justify-between font-semibold mt-1">
                        <span>Saldo pendiente:</span>
                        <span className="text-yellow-400">{formatCLP(iSaldoPendiente)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Modal>
        )}

        {editarModal && (
          <Modal
            onClickOutside={() => setEditarModal(false)}
            className="!absolute !top-20 !max-w-4xl"
          >
            <p className="font-black text-2xl text-center mb-4">
              Editar {iTipoDoc} N°{iNumeroDoc}
            </p>

            <div className="grid grid-cols-2 gap-6">
              {/* Columna izquierda - Campos editables */}
              <div className="flex flex-col gap-4">
                <p
                  className={`font-semibold text-lg pb-2 border-b ${isLightTheme ? 'border-gray-200' : 'border-white/30'}`}
                >
                  Datos del documento
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Textfield
                    label="N° Documento"
                    value={iNumeroDocNuevo}
                    onChange={(e) => {
                      setINumeroDocNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    type="number"
                  />

                  <DatepickerField
                    label="Fecha de emisión"
                    selectedDate={iFechaENuevo}
                    onChange={(date) => {
                      setIFechaENuevo(date);
                      setNuevoChanged(!nuevoChanged);
                    }}
                  />

                  {iFechaV && (
                    <DatepickerField
                      label="Fecha vencimiento"
                      selectedDate={iFechaVNuevo}
                      onChange={(date) => {
                        setIFechaVNuevo(date);
                        setNuevoChanged(!nuevoChanged);
                      }}
                    />
                  )}
                </div>

                <p
                  className={`font-semibold text-lg pb-2 mt-2 border-b ${isLightTheme ? 'border-gray-200' : 'border-white/30'}`}
                >
                  Montos
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Textfield
                    label="Neto"
                    value={iNetoNuevo}
                    onChange={(e) => {
                      setINetoNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />

                  <Textfield
                    label="Flete"
                    value={iFleteNuevo}
                    onChange={(e) => {
                      setIFleteNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />

                  <Textfield
                    label="Retención"
                    value={iRetencionNuevo}
                    onChange={(e) => {
                      setIRetencionNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />

                  <Textfield
                    label="Otros impuestos"
                    value={iOtrosNuevo}
                    onChange={(e) => {
                      setIOtrosNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />

                  {/* IVA solo para documentos que lo tienen */}
                  {iTipoDoc !== 'Factura exenta' && (
                    <Textfield
                      label="IVA (19%)"
                      value={iIvaNuevo}
                      onChange={(e) => {
                        setIIvaNuevo(e.target.value);
                        setNuevoChanged(!nuevoChanged);
                      }}
                      currency
                      readOnly
                    />
                  )}

                  <Textfield
                    label="Total"
                    value={iTotalNuevo}
                    currency
                    readOnly
                    classNameInput={`font-bold ${isLightTheme ? 'bg-gray-100' : 'bg-black/20'}`}
                  />
                </div>
              </div>

              {/* Columna derecha - Acciones */}
              <div className="flex flex-col">
                <p
                  className={`font-semibold text-lg pb-2 mb-4 border-b ${isLightTheme ? 'border-gray-200' : 'border-white/30'}`}
                >
                  Acciones
                </p>

                <div
                  className={`flex flex-col gap-3 rounded-xl p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-black/20'}`}
                >
                  {/* Info sobre notas de crédito vinculadas */}
                  {iNotasCredito && iNotasCredito.length > 0 && iNotasCredito[0] !== '' && (
                    <div
                      className={`rounded-lg p-3 mb-2 ${isLightTheme ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-500/20 border border-yellow-500/50'}`}
                    >
                      <p
                        className={`text-sm font-semibold ${isLightTheme ? 'text-yellow-700' : 'text-yellow-200'}`}
                      >
                        Notas de crédito asociadas: {iNotasCredito.length}
                      </p>
                      <p
                        className={`text-xs mt-1 ${isLightTheme ? 'text-yellow-600' : 'text-yellow-100/80'}`}
                      >
                        Este documento tiene notas de crédito vinculadas
                      </p>
                    </div>
                  )}

                  {/* Botón desvincular NC - solo para facturas con NC y usuarios con permiso de edición */}
                  {puedeEditar &&
                    (iTipoDoc === 'Factura electrónica' || iTipoDoc === 'Factura exenta') &&
                    iNotasCredito &&
                    iNotasCredito.length > 0 &&
                    iNotasCredito[0] !== '' && (
                      <TextButton
                        text="Desvincular notas de crédito"
                        className="bg-accent-blue text-white font-semibold hover:bg-blue-600 active:bg-blue-700 w-full justify-center py-3 rounded-lg"
                        onClick={() => {
                          setVincularNumeroDoc('');
                          setVincularTipoDoc('Factura electrónica');
                          setVincularSinEliminar(true);
                          setVincularModal(true);
                        }}
                      />
                    )}

                  {puedeEliminar && (
                    <TextButton
                      text="Eliminar documento"
                      className="bg-danger text-white font-semibold hover:bg-danger-hover active:bg-danger-active w-full justify-center py-3 rounded-lg"
                      onClick={() => setConfirmDeleteModal(true)}
                    />
                  )}

                  <div className="flex-grow" />

                  <TextButton
                    text={confirmarEdicion ? 'Guardar cambios' : 'Sin cambios'}
                    disabled={!confirmarEdicion}
                    className={`font-semibold w-full justify-center py-3 mt-4 rounded-lg ${
                      confirmarEdicion
                        ? 'bg-success text-white hover:bg-success-hover active:bg-success-active'
                        : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    }`}
                    onClick={confirmarEdicion ? handleConfirmarEdicion : undefined}
                  />

                  <TextButton
                    text="Cancelar"
                    className="bg-slate-600 text-white font-semibold hover:bg-slate-500 active:bg-slate-700 w-full justify-center py-2 rounded-lg"
                    onClick={() => setEditarModal(false)}
                  />
                </div>
              </div>
            </div>
          </Modal>
        )}

        {confirmDeleteModal && (
          <Modal onClickOutside={() => setConfirmDeleteModal(false)} className="!absolute !top-24">
            <div className="flex flex-col items-center gap-6 p-6">
              <p className="text-lg font-bold text-center">
                ¿Está seguro que desea eliminar la {iTipoDoc} N° {iNumeroDoc}?
              </p>
              <div className="flex gap-24">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-black m-2 hover:bg-slate-500 active:bg-slate-700 w-[95%] justify-center px-4 rounded-3xl"
                  onClick={() => setConfirmDeleteModal(false)}
                />
                <TextButton
                  text="Confirmar"
                  className="bg-danger text-white font-black m-2 hover:bg-danger-hover active:bg-danger-active w-[95%] justify-center px-4 rounded-3xl"
                  onClick={handleConfirmDelete}
                />
              </div>
            </div>
          </Modal>
        )}

        {hasNotasCreditoModal && (
          <Modal
            onClickOutside={() => setHasNotasCreditoModal(false)}
            className="!absolute !top-24"
          >
            <div className="flex flex-col items-center gap-4 p-6 max-w-[100%]">
              <p className="text-lg font-bold text-center">
                La {iTipoDoc} N°{iNumeroDoc} tiene Notas de crédito asociadas:
              </p>

              <div className="w-full max-h-56 overflow-y-auto bg-black/20 rounded p-3">
                <ul className="list-disc pl-5">
                  {iNotasCredito && iNotasCredito.length > 0 ? (
                    iNotasCredito.map((nc, idx) => (
                      <li key={idx} className="mb-1">
                        {typeof nc === 'object' && nc.numeroDoc
                          ? `Nota de crédito N°${nc.numeroDoc}`
                          : `Nota de crédito N°${nc}`}
                      </li>
                    ))
                  ) : (
                    <li>No se encontraron notas de crédito</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-4 mt-4 w-full">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-black m-2 hover:bg-slate-500 active:bg-slate-700 w-[95%] justify-center py-7 rounded-3xl"
                  onClick={() => setHasNotasCreditoModal(false)}
                />

                <TextButton
                  text="Eliminar Notas de crédito"
                  className="bg-danger text-white font-black m-2 hover:bg-danger-hover active:bg-danger-active w-[95%] justify-center py-7 rounded-3xl"
                  onClick={async () => {
                    // llama función que elimina factura + notas
                    await handleEliminarConNotasCredito();
                  }}
                />

                <TextButton
                  text="Vincular a otro documento y eliminar"
                  className="bg-accent-blue text-white font-black m-2 hover:bg-blue-600 active:bg-blue-700 w-[95%] justify-center py-7 rounded-3xl"
                  onClick={() => {
                    setHasNotasCreditoModal(false);
                    setVincularNumeroDoc('');
                    setVincularTipoDoc('Factura electrónica');
                    setVincularModal(true);
                  }}
                />
              </div>
            </div>
          </Modal>
        )}

        {vincularModal && (
          <Modal
            onClickOutside={() => {
              setVincularModal(false);
              setVincularSinEliminar(false); // ← reseteamos también si el usuario hace clic fuera
            }}
            className="!absolute !top-24"
          >
            <div className="flex flex-col gap-4 p-6 w-[90%] max-w-xl">
              <p className="text-lg font-bold">Vincular notas de crédito a otro documento</p>

              <div className="relative overflow-visible">
                <DropdownMenu
                  classNameMenu="w-full"
                  classNameList="!z-[9999]"
                  tittle="Tipo de documento destino"
                  items={['Factura electrónica', 'Factura exenta']}
                  value={vincularTipoDoc}
                  onSelect={setVincularTipoDoc}
                />
              </div>

              <Textfield
                label="Número de documento para relacionar las notas de crédito"
                type="number"
                value={vincularNumeroDoc}
                onChange={(e) => setVincularNumeroDoc(e.target.value)}
              />

              <div className="flex gap-3 mt-4">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-black m-2 hover:bg-slate-500 active:bg-slate-700 w-[95%] justify-center rounded-3xl py-2"
                  onClick={() => {
                    setVincularModal(false);
                    setVincularSinEliminar(false);
                  }}
                />
                <TextButton
                  text="Confirmar"
                  className="bg-success text-white font-black m-2 hover:bg-success-hover active:bg-success-active w-[95%] justify-center rounded-3xl py-2"
                  onClick={async () => {
                    if (vincularSinEliminar) {
                      await handleVincularSinEliminarNotasCredito();
                    } else {
                      await handleVincularNotasCredito();
                    }
                  }}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de reversión de pago (solo admin/super_admin) */}
        {reversarPagoModal && egresoData && (
          <Modal
            onClickOutside={() => setReversarPagoModal(false)}
            className="!absolute !top-16 !max-w-3xl"
          >
            <div className="flex flex-col gap-4 p-4">
              <p
                className={`text-xl font-black text-center ${isLightTheme ? 'text-yellow-600' : 'text-yellow-400'}`}
              >
                Reversión de Egreso N° {egresoData.numeroEgreso}
              </p>

              {/* Información del egreso */}
              <div
                className={`rounded-lg p-4 ${isLightTheme ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-500/10 border border-yellow-500/30'}`}
              >
                <p
                  className={`text-sm font-semibold mb-2 ${isLightTheme ? 'text-yellow-800' : 'text-yellow-200'}`}
                >
                  Este documento está asociado a un egreso procesado.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Total del egreso:
                  </span>
                  <span
                    className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    {formatCLP(egresoData.totalEgreso)}
                  </span>
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Fecha de pago:
                  </span>
                  <span className={isLightTheme ? 'text-gray-800' : 'text-white'}>
                    {egresoData.fechaPago?.toDate
                      ? egresoData.fechaPago.toDate().toLocaleDateString('es-CL')
                      : '-'}
                  </span>
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Documentos en egreso:
                  </span>
                  <span
                    className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    {egresoDocumentos.filter((d) => !d.esNotaCredito).length} factura(s)
                  </span>
                </div>
              </div>

              {/* Lista de documentos del egreso */}
              <div
                className={`rounded-lg p-3 max-h-48 overflow-y-auto scrollbar-custom ${isLightTheme ? 'bg-gray-100' : 'bg-black/20'}`}
              >
                <p
                  className={`font-semibold text-sm mb-2 ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                >
                  Documentos en este egreso:
                </p>
                <div className="space-y-1">
                  {egresoDocumentos.map((docEgreso) => (
                    <div
                      key={docEgreso.id}
                      className={`flex items-center justify-between text-xs p-2 rounded ${
                        docEgreso.esNotaCredito
                          ? isLightTheme
                            ? 'bg-blue-50 ml-4'
                            : 'bg-blue-500/10 ml-4'
                          : isLightTheme
                            ? 'bg-white'
                            : 'bg-white/5'
                      } ${
                        deleteInfo.numeroDoc === docEgreso.numeroDoc &&
                        deleteInfo.tipoDoc === docEgreso.tipoDoc &&
                        deleteInfo.rut === docEgreso.rut
                          ? 'ring-2 ring-accent-blue'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {accionReversar === 'parcial' && (
                          <input
                            type="checkbox"
                            checked={documentosAEliminar.includes(docEgreso.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // If this is an invoice (not credit note), also check its associated credit notes
                                if (!docEgreso.esNotaCredito) {
                                  const associatedNCs = egresoDocumentos.filter(
                                    (d) =>
                                      d.esNotaCredito &&
                                      d.facturaAsociada === docEgreso.numeroDoc &&
                                      d.rut === docEgreso.rut
                                  );
                                  const idsToAdd = [
                                    docEgreso.id,
                                    ...associatedNCs.map((nc) => nc.id),
                                  ];
                                  const newIds = idsToAdd.filter(
                                    (id) => !documentosAEliminar.includes(id)
                                  );
                                  setDocumentosAEliminar([...documentosAEliminar, ...newIds]);
                                } else {
                                  // If this is a credit note, just add it (don't auto-check parent invoice)
                                  setDocumentosAEliminar([...documentosAEliminar, docEgreso.id]);
                                }
                              } else {
                                setDocumentosAEliminar(
                                  documentosAEliminar.filter((id) => id !== docEgreso.id)
                                );
                              }
                            }}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-accent-blue focus:ring-accent-blue"
                          />
                        )}
                        <span className={isLightTheme ? 'text-gray-500' : 'text-slate-400'}>
                          {formatRUT(docEgreso.rut)}
                        </span>
                        <span
                          className={
                            docEgreso.esNotaCredito
                              ? isLightTheme
                                ? 'text-blue-600'
                                : 'text-blue-400'
                              : isLightTheme
                                ? 'text-gray-800'
                                : 'text-white'
                          }
                        >
                          {docEgreso.tipoDocLabel} N° {docEgreso.numeroDoc}
                        </span>
                      </div>
                      <span
                        className={
                          docEgreso.esNotaCredito
                            ? 'text-red-500'
                            : isLightTheme
                              ? 'text-green-600'
                              : 'text-green-400'
                        }
                      >
                        {docEgreso.esNotaCredito ? '-' : ''}
                        {formatCLP(docEgreso.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opciones según escenario */}
              <div className="flex flex-col gap-2">
                <p
                  className={`font-semibold text-sm ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                >
                  Seleccione una acción:
                </p>

                {/* Opción 1: Solo revertir pago */}
                <button
                  onClick={() => setAccionReversar('revertir')}
                  className={`p-3 rounded-lg text-left transition-all ${
                    accionReversar === 'revertir'
                      ? 'bg-accent-blue/20 border-2 border-accent-blue'
                      : isLightTheme
                        ? 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p
                    className={`font-semibold text-sm ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    Revertir pago
                  </p>
                  <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                    Elimina el egreso y cambia el estado de todos los documentos a "pendiente" o
                    "vencido" según corresponda.
                  </p>
                </button>

                {/* Opción 2: Eliminar todo */}
                <button
                  onClick={() => setAccionReversar('eliminar')}
                  className={`p-3 rounded-lg text-left transition-all ${
                    accionReversar === 'eliminar'
                      ? 'bg-danger/20 border-2 border-danger'
                      : isLightTheme
                        ? 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <p className="font-semibold text-sm text-danger">Eliminar egreso y documentos</p>
                  <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                    Elimina el egreso y todos los documentos asociados permanentemente.
                  </p>
                </button>

                {/* Opción 3: Eliminación parcial (solo si hay más de un documento) */}
                {egresoDocumentos.filter((d) => !d.esNotaCredito).length > 1 && (
                  <button
                    onClick={() => setAccionReversar('parcial')}
                    className={`p-3 rounded-lg text-left transition-all ${
                      accionReversar === 'parcial'
                        ? isLightTheme
                          ? 'bg-yellow-50 border-2 border-yellow-400'
                          : 'bg-yellow-500/20 border-2 border-yellow-500'
                        : isLightTheme
                          ? 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <p
                      className={`font-semibold text-sm ${isLightTheme ? 'text-yellow-700' : 'text-yellow-400'}`}
                    >
                      Eliminación selectiva
                    </p>
                    <p className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                      Selecciona qué documentos eliminar. Los no seleccionados serán revertidos a
                      "pendiente".
                    </p>
                  </button>
                )}
              </div>

              {/* Info adicional para eliminación parcial */}
              {accionReversar === 'parcial' && (
                <div
                  className={`rounded-lg p-3 ${isLightTheme ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-500/10 border border-yellow-500/30'}`}
                >
                  <p className={`text-xs ${isLightTheme ? 'text-yellow-800' : 'text-yellow-200'}`}>
                    Marque los documentos que desea eliminar en la lista de arriba. Los documentos
                    no marcados serán revertidos a estado pendiente.
                  </p>
                  <p
                    className={`text-xs mt-1 ${isLightTheme ? 'text-yellow-800' : 'text-yellow-200'}`}
                  >
                    Documentos a eliminar: {documentosAEliminar.length}
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-4 mt-2">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-semibold hover:bg-slate-500 active:bg-slate-700 flex-1 justify-center py-3 rounded-lg"
                  onClick={() => {
                    setReversarPagoModal(false);
                    setAccionReversar('');
                    setDocumentosAEliminar([]);
                  }}
                />
                <TextButton
                  text="Continuar"
                  disabled={
                    !accionReversar ||
                    (accionReversar === 'parcial' && documentosAEliminar.length === 0)
                  }
                  className={`flex-1 justify-center py-3 rounded-lg font-semibold ${
                    accionReversar &&
                    (accionReversar !== 'parcial' || documentosAEliminar.length > 0)
                      ? 'bg-yellow-600 text-white hover:bg-yellow-500 active:bg-yellow-700'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (accionReversar) {
                      setConfirmReversarModal(true);
                    }
                  }}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de confirmación de reversión */}
        {confirmReversarModal && (
          <Modal
            onClickOutside={() => setConfirmReversarModal(false)}
            className="!absolute !top-24"
          >
            <div className="flex flex-col items-center gap-6 p-6">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-yellow-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <p
                className={`text-lg font-bold text-center ${isLightTheme ? 'text-yellow-600' : 'text-yellow-400'}`}
              >
                {accionReversar === 'revertir' && '¿Confirmar reversión de pago?'}
                {accionReversar === 'eliminar' && '¿Confirmar eliminación de egreso y documentos?'}
                {accionReversar === 'parcial' && '¿Confirmar eliminación selectiva?'}
              </p>

              <div className="text-sm text-center text-slate-300">
                {accionReversar === 'revertir' && (
                  <p>
                    Se eliminará el egreso N° {egresoData?.numeroEgreso} y todos los documentos
                    cambiarán a estado "pendiente" o "vencido".
                  </p>
                )}
                {accionReversar === 'eliminar' && (
                  <p className="text-danger">
                    Se eliminarán permanentemente el egreso N° {egresoData?.numeroEgreso} y todos
                    sus documentos asociados. Esta acción no se puede deshacer.
                  </p>
                )}
                {accionReversar === 'parcial' && (
                  <p>
                    Se eliminará el egreso N° {egresoData?.numeroEgreso}.
                    {documentosAEliminar.length} documento(s) serán eliminados y el resto
                    revertidos.
                  </p>
                )}
              </div>

              <div className="flex gap-8 w-full">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-black hover:bg-slate-500 active:bg-slate-700 flex-1 justify-center py-3 rounded-xl"
                  onClick={() => setConfirmReversarModal(false)}
                />
                <TextButton
                  text="Confirmar"
                  className={`font-black flex-1 justify-center py-3 rounded-xl ${
                    accionReversar === 'eliminar'
                      ? 'bg-danger text-white hover:bg-danger-hover active:bg-danger-active'
                      : 'bg-yellow-600 text-white hover:bg-yellow-500 active:bg-yellow-700'
                  }`}
                  onClick={handleReversarPago}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de reversión de abonos (documentos con pagos parciales) */}
        {reversarAbonoModal && documentoActualAbono && (
          <Modal
            onClickOutside={() => setReversarAbonoModal(false)}
            className="!absolute !top-16 !max-w-2xl"
          >
            <div className="flex flex-col gap-4 p-4">
              <p
                className={`text-xl font-black text-center ${isLightTheme ? 'text-cyan-600' : 'text-cyan-400'}`}
              >
                Reversión de Abonos
              </p>

              {/* Información del documento */}
              <div
                className={`rounded-lg p-4 ${isLightTheme ? 'bg-cyan-50 border border-cyan-200' : 'bg-cyan-500/10 border border-cyan-500/30'}`}
              >
                <p
                  className={`text-sm font-semibold mb-2 ${isLightTheme ? 'text-cyan-800' : 'text-cyan-200'}`}
                >
                  Este documento tiene abonos (pagos parciales) asociados.
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Documento:
                  </span>
                  <span
                    className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                  >
                    {documentoActualAbono.tipoDoc === 'facturas' ? 'Factura' : 'Factura Exenta'} N°{' '}
                    {documentoActualAbono.numeroDoc}
                  </span>
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Total documento:
                  </span>
                  <span className={isLightTheme ? 'text-gray-800' : 'text-white'}>
                    {formatCLP(documentoActualAbono.total)}
                  </span>
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Total abonado:
                  </span>
                  <span
                    className={`font-semibold ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}
                  >
                    {formatCLP(documentoActualAbono.totalAbonado)}
                  </span>
                  <span className={isLightTheme ? 'text-gray-600' : 'text-slate-400'}>
                    Saldo pendiente:
                  </span>
                  <span
                    className={`font-semibold ${isLightTheme ? 'text-yellow-600' : 'text-yellow-400'}`}
                  >
                    {formatCLP(documentoActualAbono.saldoPendiente)}
                  </span>
                </div>
              </div>

              {/* Lista de egresos con abonos */}
              <div
                className={`rounded-lg p-3 max-h-64 overflow-y-auto scrollbar-custom ${isLightTheme ? 'bg-gray-100' : 'bg-black/20'}`}
              >
                <p
                  className={`font-semibold text-sm mb-2 ${isLightTheme ? 'text-gray-700' : 'text-slate-300'}`}
                >
                  Seleccione los egresos a reversar:
                </p>
                <div className="space-y-2">
                  {egresosConAbono.map((egreso) => (
                    <div
                      key={egreso.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        egresosSeleccionados.includes(egreso.id)
                          ? isLightTheme
                            ? 'bg-cyan-100 border-2 border-cyan-400'
                            : 'bg-cyan-500/20 border-2 border-cyan-500'
                          : isLightTheme
                            ? 'bg-white border border-gray-200 hover:bg-gray-50'
                            : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => {
                        if (egresosSeleccionados.includes(egreso.id)) {
                          setEgresosSeleccionados(
                            egresosSeleccionados.filter((id) => id !== egreso.id)
                          );
                        } else {
                          setEgresosSeleccionados([...egresosSeleccionados, egreso.id]);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={egresosSeleccionados.includes(egreso.id)}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <p
                            className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                          >
                            Egreso N° {egreso.numeroEgreso}
                            {egreso.esAbono && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-500">
                                Abono
                              </span>
                            )}
                          </p>
                          <p
                            className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                          >
                            Fecha:{' '}
                            {egreso.fechaPago?.toDate
                              ? egreso.fechaPago.toDate().toLocaleDateString('es-CL')
                              : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}
                        >
                          {formatCLP(egreso.montoAPagar || egreso.totalEgreso)}
                        </p>
                        <p
                          className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                        >
                          Monto abonado
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aviso */}
              <div
                className={`rounded-lg p-3 ${isLightTheme ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-500/10 border border-yellow-500/30'}`}
              >
                <p className={`text-xs ${isLightTheme ? 'text-yellow-800' : 'text-yellow-200'}`}>
                  Al reversar abonos, el monto se restaurará al saldo pendiente del documento.
                  {egresosSeleccionados.length === egresosConAbono.length &&
                    egresosConAbono.length > 0 && (
                      <span className="block mt-1 font-semibold">
                        Si reversa todos los abonos, el documento volverá a estado "pendiente" o
                        "vencido".
                      </span>
                    )}
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 mt-2">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-semibold hover:bg-slate-500 active:bg-slate-700 flex-1 justify-center py-3 rounded-lg"
                  onClick={() => {
                    setReversarAbonoModal(false);
                    setEgresosSeleccionados([]);
                    setDocumentoActualAbono(null);
                  }}
                />
                <TextButton
                  text={`Reversar ${egresosSeleccionados.length} abono(s)`}
                  disabled={egresosSeleccionados.length === 0}
                  className={`flex-1 justify-center py-3 rounded-lg font-semibold ${
                    egresosSeleccionados.length > 0
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (egresosSeleccionados.length > 0) {
                      setConfirmReversarAbonoModal(true);
                    }
                  }}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Modal de confirmación de reversión de abonos */}
        {confirmReversarAbonoModal && (
          <Modal
            onClickOutside={() => setConfirmReversarAbonoModal(false)}
            className="!absolute !top-24"
          >
            <div className="flex flex-col items-center gap-6 p-6">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-cyan-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <p
                className={`text-lg font-bold text-center ${isLightTheme ? 'text-cyan-600' : 'text-cyan-400'}`}
              >
                ¿Confirmar reversión de {egresosSeleccionados.length} abono(s)?
              </p>

              <div
                className={`text-sm text-center ${isLightTheme ? 'text-gray-600' : 'text-slate-300'}`}
              >
                <p>
                  Se revertirán los abonos seleccionados del documento N°{' '}
                  {documentoActualAbono?.numeroDoc}.
                </p>
                {egresosSeleccionados.length === egresosConAbono.length &&
                  egresosConAbono.length > 0 && (
                    <p
                      className={`mt-2 font-semibold ${isLightTheme ? 'text-yellow-600' : 'text-yellow-400'}`}
                    >
                      El documento volverá a estado "pendiente" o "vencido".
                    </p>
                  )}
              </div>

              <div className="flex gap-8 w-full">
                <TextButton
                  text="Cancelar"
                  className="bg-slate-600 text-white font-black hover:bg-slate-500 active:bg-slate-700 flex-1 justify-center py-3 rounded-xl"
                  onClick={() => setConfirmReversarAbonoModal(false)}
                />
                <TextButton
                  text="Confirmar"
                  className="font-black flex-1 justify-center py-3 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 active:bg-cyan-700"
                  onClick={handleRevertirAbonos}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Modal para seleccionar egreso al descargar PDF (documentos con múltiples egresos) */}
        {seleccionarEgresoModal && documentoParaPDF && (
          <Modal
            onClickOutside={() => {
              setSeleccionarEgresoModal(false);
              setEgresosParaPDF([]);
              setDocumentoParaPDF(null);
            }}
            className="!absolute !top-24 !max-w-lg"
          >
            <div className="flex flex-col gap-4 p-4">
              <p
                className={`text-xl font-black text-center ${isLightTheme ? 'text-blue-600' : 'text-blue-400'}`}
              >
                Seleccionar Egreso
              </p>

              <p
                className={`text-sm text-center ${isLightTheme ? 'text-gray-600' : 'text-slate-400'}`}
              >
                Este documento tiene múltiples egresos asociados. Seleccione cuál desea descargar:
              </p>

              {/* Lista de egresos disponibles */}
              <div
                className={`rounded-lg p-3 max-h-64 overflow-y-auto scrollbar-custom ${isLightTheme ? 'bg-gray-100' : 'bg-black/20'}`}
              >
                <div className="space-y-2">
                  {egresosParaPDF.map((egreso) => (
                    <button
                      key={egreso.id}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                        isLightTheme
                          ? 'bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                          : 'bg-white/5 border border-white/10 hover:bg-blue-500/20 hover:border-blue-500'
                      }`}
                      onClick={() => handleSeleccionarEgresoParaPDF(egreso.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${isLightTheme ? 'bg-blue-100' : 'bg-blue-500/20'}`}
                        >
                          <svg
                            className={`w-5 h-5 ${isLightTheme ? 'text-blue-600' : 'text-blue-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="text-left">
                          <p
                            className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                          >
                            Egreso N° {egreso.numeroEgreso}
                            {egreso.esAbono && (
                              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                                Abono
                              </span>
                            )}
                          </p>
                          <p
                            className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                          >
                            {egreso.fechaPago?.toDate
                              ? egreso.fechaPago.toDate().toLocaleDateString('es-CL')
                              : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-semibold ${isLightTheme ? 'text-green-600' : 'text-green-400'}`}
                        >
                          {formatCLP(egreso.montoAPagar || egreso.totalEgreso)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <TextButton
                text="Cancelar"
                className="bg-slate-600 text-white font-semibold hover:bg-slate-500 active:bg-slate-700 justify-center py-3 rounded-lg"
                onClick={() => {
                  setSeleccionarEgresoModal(false);
                  setEgresosParaPDF([]);
                  setDocumentoParaPDF(null);
                }}
              />
            </div>
          </Modal>
        )}

        <AlertModal
          isOpen={!!errorModal}
          onClose={() => setErrorModal('')}
          title={errorModal.includes('Error') ? 'Error' : 'Aviso'}
          message={errorModal}
          variant={
            errorModal.includes('Error')
              ? 'error'
              : errorModal.includes('correctamente')
                ? 'success'
                : 'info'
          }
        />

        <LoadingModal isOpen={loadingModal} message="Cargando..." />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default RRevisionDocumentos;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp
  if (value?.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toDateString(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString('es-CL') : '';
}
