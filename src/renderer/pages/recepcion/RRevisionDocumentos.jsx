import { SidebarWithContentSeparator } from "../../components/sidebar";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { Modal } from "../../components/modal";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, TextButton, ImgButton, YButton } from "../../components/Button";
import { DropdownMenu, DatepickerRange, DatepickerField, Textfield } from "../../components/Textfield";

import { doc, getDoc, getDocs, collection, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { Card } from "../../components/Container";
import { cleanRUT, formatRUT } from "../../utils/formatRUT";
import { formatCLP } from "../../utils/formatCurrency";
import { generarPDF } from "../../utils/generarPDF";

//Imagenes
import searchIcon from "../../assets/Logos/search.png";
import reportIcon from "../../assets/Logos/inDoc.png";
import configIcon from "../../assets/Logos/config.png";

const RRevisionDocumentos = () => {
  const navigate = useNavigate();

  const [empresasConDocs, setEmpresasConDocs] = useState([]);
  const unsubscribeRef = useRef(null);

  const [seObtuvoTipo, setSeObtuvoTipo] = useState(true);

  //Informacion documento
  const [iNumeroDoc, setINumeroDoc] = useState("");
  const [iFechaE, setIFechaE] = useState("");
  const [iFechaV, setIFechaV] = useState("");
  const [iEstado, setIEstado] = useState("");
  const [iFormaPago, setIFormaPago] = useState("");
  const [iTipoDoc, setITipoDoc] = useState("");
  const [iNeto, setINeto] = useState("");
  const [iIva, setIIva] = useState("");
  const [iFlete, setIFlete] = useState("");
  const [iRetencion, setIRetencion] = useState("");
  const [iTotal, setITotal] = useState("");
  const [iOtros, setIOtros] = useState("");
  const [iNotasCredito, setINotasCredito] = useState([]);
  const [iAbonoNc, setIAbonoNc] = useState("");
  const [iTotalDescontado, setITotalDescontado] = useState("");
  const [iNumeroDocNc, setINumeroDocNc] = useState("");
  const [iUsuarioIngreso, setIUsuarioIngreso] = useState("");
  const [iFechaIngreso, setIFechaIngreso] = useState("");
  const [iUsuarioPago, setIUsuarioPago] = useState("");
  const [iFechaPago, setIFechaPago] = useState("");

  //Edición de documento
  const [iNumeroDocNuevo, setINumeroDocNuevo] = useState("");
  const [iFechaENuevo, setIFechaENuevo] = useState("");
  const [iFechaVNuevo, setIFechaVNuevo] = useState("");
  const [iEstadoNuevo, setIEstadoNuevo] = useState("");
  const [iFormaPagoNuevo, setIFormaPagoNuevo] = useState("");
  const [iTipoDocNuevo, setITipoDocNuevo] = useState("");
  const [iNetoNuevo, setINetoNuevo] = useState("");
  const [iIvaNuevo, setIIvaNuevo] = useState("");
  const [iFleteNuevo, setIFleteNuevo] = useState("");
  const [iRetencionNuevo, setIRetencionNuevo] = useState("");
  const [iTotalNuevo, setITotalNuevo] = useState("");
  const [iOtrosNuevo, setIOtrosNuevo] = useState("");
  const [iNotasCreditoNuevo, setINotasCreditoNuevo] = useState([]);
  const [iAbonoNcNuevo, setIAbonoNcNuevo] = useState("");
  const [iTotalDescontadoNuevo, setITotalDescontadoNuevo] = useState("");
  const [iNumeroDocNcNuevo, setINumeroDocNcNuevo] = useState("");
  const [iUsuarioIngresoNuevo, setIUsuarioIngresoNuevo] = useState("");
  const [iFechaIngresoNuevo, setIFechaIngresoNuevo] = useState("");
  const [iUsuarioPagoNuevo, setIUsuarioPagoNuevo] = useState("");
  const [iFechaPagoNuevo, setIFechaPagoNuevo] = useState("");

  //Modal
  const [pdfModal, setPdfModal] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [revisionModal, setRevisionModal] = useState(false);
  const [editarModal, setEditarModal] = useState(false);
  

  // Estados de filtros
  const [selectedTipoDoc, setSelectedTipoDoc] = useState("Todos");
  const [selectedEstadoDoc, setSelectedEstadoDoc] = useState("Todos");
  const [selectedFormaPago, setSelectedFormaPago] = useState("Todos");
  const [rangoFecha, setRangoFecha] = useState([null, null]);
  const [fechaInicio, fechaFin] = rangoFecha;
  const [filtroRut, setFiltroRut] = useState("");
  const [filtroFolio, setFiltroFolio] = useState("");


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
  }, [cambioValoresEdit])
  
  const [nuevoChanged, setNuevoChanged] = useState(false);
  const [confirmarEdicion, setConfirmarEdicion] = useState(false);

  useEffect(() => {
    const fechaENueva = toDate(iFechaENuevo);
    const fechaE = toDate(iFechaE);
    const fechaVNueva = toDate(iFechaVNuevo);
    const fechaV = toDate(iFechaV);
    if(iNumeroDocNuevo !== iNumeroDoc || 
      fechaENueva?.getTime() != fechaE?.getTime() || 
      fechaVNueva?.getTime() !== fechaV?.getTime() || 
      iNetoNuevo !== iNeto || 
      iFleteNuevo !== iFlete || 
      iRetencionNuevo !== iRetencion || 
      iIvaNuevo !== iIva || 
      iOtrosNuevo !== iOtros || 
      iTotalNuevo !== iTotal)
    {
      setConfirmarEdicion(true);
    }
    else{
      setConfirmarEdicion(false);
    }
  }, [nuevoChanged])

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
  }

  const handleBuscar = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const empresasRef = collection(db, "empresas");

    const unsubscribe = onSnapshot(empresasRef, (snapshotEmpresas) => {
      const promises = snapshotEmpresas.docs.map((empresaDoc) => {
        const empresaData = empresaDoc.data();
        const rut = empresaDoc.id;

        // Mapear opción del filtro a subcolecciones
        const mapTipoDocToSubcol = {
          "Todos": ["facturas", "facturasExentas", "boletas", "notasCredito", "guiasElectronicas"],
          "Factura electrónica": ["facturas"],
          "Factura exenta": ["facturasExentas"],
          "Boleta": ["boletas"],
          "Nota de crédito": ["notasCredito"],
          "Guía electrónica": ["guiasElectronicas"],
        };

        const subcolecciones = mapTipoDocToSubcol[selectedTipoDoc] || [];

        const listeners = subcolecciones.map((sub) => {
          return new Promise((resolve) => {
            const subRef = collection(db, "empresas", rut, sub);

            onSnapshot(subRef, (snapshotDocs) => {
              const docsData = snapshotDocs.docs.map((d) => ({
                id: d.id,
                ...d.data(),
                tipo: sub,
              }));
              resolve(docsData);
            });
          });
        });

        return Promise.all(listeners).then((resultados) => {
          let documentos = resultados.flat();

          // === Aplicar filtros adicionales ===

          // Estado documento
          if (selectedEstadoDoc !== "Todos") {
            documentos = documentos.filter(
              (d) => d.estado?.toLowerCase() === selectedEstadoDoc.toLowerCase()
            );
          }

          // Forma de pago (solo facturas y facturasExentas tienen este campo)
          if (selectedFormaPago !== "Todos") {
            documentos = documentos.filter((d) => {
              if (["facturas", "facturasExentas"].includes(d.tipo)) {
                return d.formaPago === selectedFormaPago;
              }
              // los demás documentos son siempre Contado
              return selectedFormaPago === "Contado";
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

          // Filtro por RUT (id de empresa)
          if (filtroRut) {
            // lo comparamos sin puntos ni guion para evitar problemas
            const rutNormalizado = filtroRut.replace(/\./g, "").replace("-", "").toLowerCase();
            if (!empresaDoc.id.replace(/\./g, "").replace("-", "").toLowerCase().includes(rutNormalizado)) {
              return null; // esta empresa se descarta
            }
          }

          // Filtro por Folio (numeroDoc)
          if (filtroFolio) {
            documentos = documentos.filter((d) => String(d.numeroDoc || "") === String(filtroFolio));
          }

          // Ordenar
          const ordenTipo = {
            facturas: 1,
            facturasExentas: 2,
            boletas: 3,
            notasCredito: 4,
            guiasElectronicas: 5,
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

      Promise.all(promises).then((empresas) => {
        const filtradas = empresas.filter((e) => e && e.documentos.length > 0);
        setEmpresasConDocs(filtradas);
      });
    });

    unsubscribeRef.current = unsubscribe;
  };

  // traer valores estáticos
  useEffect(() => {
    const fetchValues = async () => {
      try {
        const tipoDocSnap = await getDoc(doc(db, "values", "tipo-doc"));
        if (tipoDocSnap.exists()) {
          setRowTipoDoc(Object.values(tipoDocSnap.data()));
        }

        const formaPagoSnap = await getDoc(doc(db, "values", "formas-pago"));
        if (formaPagoSnap.exists()) {
          setRowFormaPago(Object.values(formaPagoSnap.data()));
        }

        const estadoPagoSnap = await getDoc(doc(db, "values", "estado-pago"));
        if (estadoPagoSnap.exists()) {
          setRowEstadoDoc(Object.values(estadoPagoSnap.data()));
        }
      } catch (error) {
        console.error("Error obteniendo valores:", error);
      }
    };
    fetchValues();
  }, []);

  const handleGenerarPDF = async (rut, numeroDoc, docTipo) => {
    try {
      setLoadingModal(true);
      const pagoRef = collection(db, "pago_recepcion");
      const snapshot = await getDocs(pagoRef);
  
      let egresoEncontrado = null;
  
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
  
        if (Array.isArray(data.facturas)) {
          const match = data.facturas.find((empresa) => {
            if (empresa.rut !== rut || !Array.isArray(empresa.facturas)) return false;
  
            if (docTipo === "facturas") {
              // Buscar en facturas directamente
              return empresa.facturas.some(
                (factura) => String(factura.numeroDoc) === String(numeroDoc)
              );
            }
  
            if (docTipo === "notasCredito") {
              // Buscar en las notas de crédito dentro de cada factura
              return empresa.facturas.some((factura) => {
                if (!Array.isArray(factura.notasCredito)) return false;
                return factura.notasCredito.some(
                  (nc) => String(nc.numeroDoc) === String(numeroDoc)
                );
              });
            }
  
            return false;
          });
  
          if (match) {
            egresoEncontrado = { id: docSnap.id, ...data };
          }
        }
      });
  
      if (!egresoEncontrado) {
        setLoadingModal(false);
        setPdfModal(true);
        return;
      }
  
      const facturasPorEmpresa = egresoEncontrado.facturas.map((empresa) => ({
        rut: empresa.rut,
        facturas: empresa.facturas.map((f) => f.numeroDoc),
      }));
  
      await generarPDF(
        egresoEncontrado.numeroEgreso,
        facturasPorEmpresa,
        egresoEncontrado.totalEgreso
      );
  
      setLoadingModal(false);
    } catch (error) {
      console.error("Error generando PDF:", error);
      setLoadingModal(false);
    }
  };

  const handleSetParams = (docData, tipoDoc) => {

    setSeObtuvoTipo(false);
    handleResetParams();

    if(tipoDoc == "facturas"){
      if(docData.notasCredito){
        setIAbonoNc(docData.abonoNc);
        setINotasCredito(docData.notasCredito);
        setITotalDescontado(docData.totalDescontado);
      }
      setIEstado(docData.estado);
      if (docData.fechaE) {
        setIFechaE(docData.fechaE.toDate());
      } else {
        setIFechaE(null);
      }
      
      if (docData.fechaV) {
        setIFechaV(docData.fechaV.toDate());
      } else {
        setIFechaV(null);
      }

      setIFlete(docData.flete);
      setIFormaPago(docData.formaPago);
      setIIva(docData.iva);
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setIOtros(docData.otros);
      setIRetencion(docData.retencion);
      setITotal(docData.total);
      setITipoDoc("Factura electrónica");
      setIUsuarioIngreso(docData.ingresoUsuario);
      if (docData.fechaIngreso) {
        setIFechaIngreso(
          docData.fechaIngreso.toDate().toLocaleDateString('es-CL')
        );
      } else {
        setIFechaIngreso("");
      }

      setIUsuarioPago(docData.pagoUsuario);
      if (docData.fechaPago) {
        setIFechaPago(
          docData.fechaPago.toDate().toLocaleDateString('es-CL')
        );
      } else {
        setIFechaPago("");
      }

      setSeObtuvoTipo(true);
    }

    if(tipoDoc == "notasCredito"){
      setIEstado(docData.estado);
      if (docData.fechaE) {
        setIFechaE(docData.fechaE.toDate());
      } else {
        setIFechaE(null);
      }
      setIFlete(docData.flete);
      setIIva(docData.iva);
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setINumeroDocNc(docData.numeroDocNc);
      setIOtros(docData.otros);
      setIRetencion(docData.retencion);
      setITotal(docData.total);
      setITipoDoc("Nota de crédito");
      setIUsuarioIngreso(docData.ingresoUsuario);
      if (docData.fechaIngreso) {
        setIFechaIngreso(
          docData.fechaIngreso.toDate().toLocaleDateString('es-CL')
        );
      } else {
        setIFechaIngreso("");
      }

      setIUsuarioPago(docData.pagoUsuario);
      if (docData.fechaPago) {
        setIFechaPago(
          docData.fechaPago.toDate().toLocaleDateString('es-CL')
        );
      } else {
        setIFechaPago("");
      }

      setSeObtuvoTipo(true);
    }

    if(tipoDoc == "boletas"){
      setIEstado(docData.estado);
      if (docData.fechaE) {
        setIFechaE(docData.fechaE.toDate());
      } else {
        setIFechaE(null);
      }
      setIIva(docData.iva);
      setINeto(docData.neto);
      setINumeroDoc(docData.numeroDoc);
      setITotal(docData.total);
      setITipoDoc("Boleta");
      setIUsuarioIngreso(docData.ingresoUsuario);
      if (docData.fechaIngreso) {
        setIFechaIngreso(
          docData.fechaIngreso.toDate().toLocaleDateString('es-CL')
        );
      } else {
        setIFechaIngreso("");
      }

      setSeObtuvoTipo(true);
    }

    if (!(seObtuvoTipo)){
      setErrorModal("Error - No se pudo obtener el tipo de documento");
    }
  };

  const handleRevisionDoc = async (rut, numeroDoc, tipoDoc) => {
    try {
      setLoadingModal(true);
      handleResetParams();
      const docRef = doc(db, "empresas", String(rut), String(tipoDoc), String(numeroDoc));
      const docSnap = await getDoc(docRef);

      if(!docSnap.exists()){
        console.warn("Error obteniendo documento en la base de datos");
        setErrorModal("Error obteniendo documento en la base de datos");
        setLoadingModal(false);
        return;
      }

      const docData = docSnap.data();
      handleSetParams(docData, tipoDoc);

      if(seObtuvoTipo){
        setRevisionModal(true);
      }

      setLoadingModal(false);
    } catch (error) {
      console.error("Error obteniendo información de documento:", error);
      setLoadingModal(false);
    }
    
  };

  const handleEditarDoc = async (rut, numeroDoc, tipoDoc) => {
    setLoadingModal(true);
    handleResetParams();

    try {
      setLoadingModal(true);
      handleResetParams();
      const docRef = doc(db, "empresas", String(rut), String(tipoDoc), String(numeroDoc));
      const docSnap = await getDoc(docRef);

      if(!docSnap.exists()){
        console.warn("Error obteniendo documento en la base de datos");
        setErrorModal("Error obteniendo documento en la base de datos");
        setLoadingModal(false);
        return;
      }

      const docData = docSnap.data();

      if((tipoDoc == "facturas" && docData.estado !== "pagado") || (tipoDoc == "notasCredito" && docData.estado !== "pagado") || (tipoDoc == "boletas")){
        console.log("es modificable");
        handleSetParams(docData, tipoDoc);
        if(seObtuvoTipo){
          setCambioValoresEdit(true);
          setEditarModal(true);
          setLoadingModal(false);
        } 
      }
      else{
        setErrorModal("El documento no se puede modificar ya que se ha hecho pago en sistema.");
        setLoadingModal(false);
      }
    } catch (error) {
      console.error("Error obteniendo información de documento:", error);
      setLoadingModal(false);
    }
    
    setLoadingModal(false);
  };

  const handleResetParams = () => {
    setINumeroDoc("");
    setIFechaE("");
    setIFechaV("");
    setIEstado("");
    setIFormaPago("");
    setITipoDoc("");
    setINeto("");
    setIIva("");
    setIFlete("");
    setIRetencion("");
    setITotal("");
    setIOtros("");
    setINotasCredito("");
    setIAbonoNc("");
    setITotalDescontado("");
    setINumeroDocNc("");
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
        <H1Tittle text="Revisión de documentos" />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-wrap justify-start gap-4 mt-2 ml-5 mr-5">
        <div className="grid gap-x-12 gap-y-2 grid-cols-4 grid-rows-2">
          <DropdownMenu 
            classNameMenu="w-[1/3]"
            tittle="Tipo documento"
            items={rowTipoDoc.map((item) => item)}
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

          <div></div>

          <DatepickerRange
            classNameField="w-[1/3]"
            label="Rango de fechas"
            startDate={fechaInicio}
            endDate={fechaFin}
            onChange={(update) => setRangoFecha(update)}
          />
          
          <Textfield 
            classNameInput="w-[1/3]"
            label="RUT"
            type="rut"
            value={filtroRut}
            onChange={(e) => setFiltroRut(e.target.value)}
          />

          <Textfield 
            classNameInput="w-[1/3]"
            label="N° Folio"
            type="number"
            value={filtroFolio}
            onChange={(e) => setFiltroFolio(e.target.value)}
          />

          <TextButton 
            text="Buscar" 
            className="bg-white self-end hover:bg-white/60 active:bg-white/30 h-7 w-fit place-self-center" 
            classNameText="font-black"
            onClick={handleBuscar} 
          />
        </div>

        <Card
          hasButton={false}
          contentClassName="max-h-[calc(100vh-25rem)] overflow-y-auto scrollbar-custom flex flex-col w-full"
          content={
            <div>
              {/* Encabezado */}
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

              {/* Contenido dinámico */}
              <div className="flex flex-col">
                {empresasConDocs.map((empresa) => (
                  <div key={empresa.rut} className="mb-4">
                    <div className="flex gap-6 items-center p-2 bg-black/10 border border-black mb-2">
                      <p className="font-semibold">RUT: {formatRUT(empresa.rut)}</p>
                      <p className="font-semibold">NOMBRE: {empresa.razon}</p>
                    </div>

                    {empresa.documentos.map((doc) => (
                      <div
                        key={`${empresa.rut}-${doc.tipo}-${doc.id}`}
                        className="flex items-center mb-1 border-b py-2"
                      >
                        <div className="w-[20%] text-center text-sm px-2">
                          {doc.tipo === "facturas"
                            ? "Factura electrónica"
                            : doc.tipo === "facturasExentas"
                            ? "Factura exenta"
                            : doc.tipo === "boletas"
                            ? "Boleta"
                            : doc.tipo === "notasCredito"
                            ? "Nota de crédito"
                            : "Guía electrónica"}
                        </div>
                        <div className="w-[10%] text-center text-sm px-2">
                          {doc.numeroDoc ?? "-"}
                        </div>
                        <div className="w-[15%] text-center text-sm px-2">
                          {doc.fechaE?.toDate ? doc.fechaE.toDate().toLocaleDateString("es-CL") : "-"}
                        </div>
                        <div className="w-[15%] text-center text-sm px-2">
                          {doc.fechaV?.toDate ? doc.fechaV.toDate().toLocaleDateString("es-CL") : "-"}
                        </div>
                        <div className="w-[20%] text-center text-sm px-2">
                          {doc.total != null ? `$${doc.total.toLocaleString("es-CL")}` : "-"}
                        </div>
                        <div className="w-[10%] text-center text-sm px-2">
                          {doc.estado ?? "-"}
                        </div>
                        <div className="w-[10%] flex justify-center gap-x-2">
                          <ImgButton 
                            src={searchIcon} 
                            classNameImg="w-5" 
                            className="flex-none" 
                            onClick={() => handleRevisionDoc(empresa.rut, doc.numeroDoc, doc.tipo)}
                            title="Detalles"
                          />
                          <ImgButton 
                            src={reportIcon} 
                            classNameImg="w-5" 
                            className="flex-none"
                            onClick={() => handleGenerarPDF(empresa.rut, doc.numeroDoc, doc.tipo)} 
                            title="Egreso"
                          />
                          <ImgButton 
                            src={configIcon} 
                            classNameImg="w-5" 
                            className="flex-none"
                            title="Editar"
                            onClick={() => handleEditarDoc(empresa.rut, doc.numeroDoc, doc.tipo)}
                          />
                        </div>
                        
                      </div>
                    ))}
                  </div>
                ))}
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

      {loadingModal && (
            <Modal>
                <p className="font-black">Cargando</p>
            </Modal>
      )}

      {errorModal && (
        <Modal onClickOutside={() => setErrorModal("")}>
            <div className="flex flex-col items-center gap-4 p-4">
                <p className="text-red-300 font-bold">{errorModal}</p>
                <YButton
                    text="Cerrar"
                    onClick={() => setErrorModal("")}
                />
            </div>
        </Modal>
      )}

      {revisionModal && (
        <Modal 
          onClickOutside={() => setRevisionModal(false)}
          className="!absolute !top-24"
        >
          <p className="font-black text-3xl text-center">
            {`${iTipoDoc} N°${iNumeroDoc}`}
          </p>

          {/* Sección 1 */}
          <div>
            <p className="mt-10 font-bold text-xl">Información del documento</p>
            <div className="grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 bg-black/40 rounded-xl p-4">
              <div className="flex justify-between gap-x-4">
                <span>Fecha de emisión:</span>
                <span>{iFechaE.toLocaleDateString('es-CL')}</span>
              </div>

              {iFechaV ? (
                <div className="flex justify-between gap-x-4">
                  <span>Fecha de vencimiento:</span>
                  <span>{iFechaV.toLocaleDateString('es-CL')}</span>
                </div>
              ) : <div></div>}

              <div className="flex justify-between gap-x-4">
                <span>Estado:</span>
                <span>{iEstado}</span>
              </div>

              {iFormaPago ? (
                <div className="flex justify-between gap-x-4">
                  <span>Forma de pago:</span>
                  <span>{iFormaPago}</span>
                </div>
              ) : <div></div>}

              {iNumeroDocNc ? (
                <div className="flex justify-between gap-x-4">
                  <span>Folio documento asociado:</span>
                  <span>{iNumeroDocNc}</span>
                </div>
              ) : <div></div>}
            </div>
          </div>
          

          {/* Sección 2 */}
          <div>
              <p className="mt-4 font-bold text-xl">Montos del documento</p>
              <div className="grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 bg-black/40 rounded-xl p-4">
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
              ) : <div></div>}

              {iRetencion ? (
                <div className="flex justify-between gap-x-4">
                  <span>Retención:</span>
                  <span>{formatCLP(iRetencion)}</span>
                </div>
              ) : <div></div>}

              {iFlete ? (
                <div className="flex justify-between gap-x-4">
                  <span>Flete:</span>
                  <span>{formatCLP(iFlete)}</span>
                </div>
              ) : <div></div>}

              <div></div>

              {iTotal ? (
                <div className="flex justify-between font-black gap-x-4">
                  <span>Monto documento:</span>
                  <span>{formatCLP(iTotal)}</span>
                </div>
              ) : <div></div>}
            </div>
          </div>
         

          {/* Sección Notas de crédito */}
          {iNotasCredito != [""] && (
            <div>
              <p className="mt-4 font-bold text-xl">Nota(s) de crédito</p>
              <div className="grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 bg-black/40 rounded-xl p-4">
              {iNotasCredito && iNotasCredito.length > 0 && iNotasCredito[0] !== "" ? (
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
              ) : <div></div>}

                {iAbonoNc != [""] ? (
                  <div className="flex justify-between gap-x-4">
                    <span>Valor total notas de crédito:</span>
                    <span>{formatCLP(iAbonoNc)}</span>
                  </div>
                ) : <div></div>}

                {iTotalDescontado != [""] ? (
                  <div className="flex justify-between font-black gap-x-4">
                    <span>Monto de pago:</span>
                    <span>{formatCLP(iTotalDescontado)}</span>
                  </div>
                ) : <div></div>}
              </div>
            </div>
            
          )}

          {/* Sección Usuario / Fechas */}
          {iUsuarioIngreso && (
            <div>
              <p className="mt-4 font-bold text-xl">Movimientos del documento</p>
              <div className="grid grid-cols-2 grid-rows-16 gap-x-12 gap-y-2 bg-black/40 rounded-xl p-4">
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
                    <span>Fecha de procesamiento:</span>
                    <span>{iFechaPago}</span>
                  </div>
                )}
              </div>
            </div>
            
          )}
        </Modal>
      )}

      {editarModal && (
        <Modal onClickOutside={() => setEditarModal(false)}
        className="!absolute !top-24">
          <p className="font-black text-3xl text-center">
            {`Editar ${iTipoDoc} N°${iNumeroDoc}`}
          </p>
          <div className="grid grid-cols-2 mt-4 gap-x-4">
            <div className="flex flex-col">
              <p className="text-center font-semibold">Editar parámetros de documento</p>
              <div className="border-[12px] p-2 border-transparent rounded-xl bg-black/40 grid grid-cols-1 gap-y-4 max-h-96 overflow-y-scroll overflow-hidden scrollbar-custom">
                <div>
                  <Textfield 
                    label="Número de documento: "
                    value={iNumeroDocNuevo}
                    onChange={
                      (e) => {
                        setINumeroDocNuevo(e.target.value);
                        setNuevoChanged(!nuevoChanged);
                    }}
                    type="number"
                  />
                </div>

                <div>
                  <DatepickerField 
                    label="Fecha de emisión: "
                    selectedDate={iFechaENuevo}
                    onChange={(datev) => {
                      setIFechaENuevo(datev);
                      setNuevoChanged(!nuevoChanged);
                    }}
                  />
                </div>

                {iFechaV && (
                  <div>
                    <DatepickerField 
                      label="Fecha de vencimiento: "
                      selectedDate={iFechaVNuevo}
                      onChange={(datev) => {
                        setIFechaVNuevo(datev);
                        setNuevoChanged(!nuevoChanged);
                      }}
                    />
                  </div>
                )}

                <div>
                  <Textfield 
                    label="Monto neto: "
                    value={iNetoNuevo}
                    onChange={(e) => {
                      setINetoNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />
                </div>

                <div>
                  <Textfield 
                    label="Flete: "
                    value={iFleteNuevo}
                    onChange={(e) => {
                      setIFleteNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />
                </div>

                <div>
                  <Textfield 
                    label="Retención: "
                    value={iRetencionNuevo}
                    onChange={(e) => {
                      setIRetencionNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />
                </div>

                <div>
                  <Textfield 
                    label="IVA: "
                    value={iIvaNuevo}
                    onChange={(e) => {
                      setIIvaNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />
                </div>

                <div>
                  <Textfield 
                    label="Otros impuestos: "
                    value={iOtrosNuevo}
                    onChange={(e) => {
                      setIOtrosNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                  />
                </div>

                <div>
                  <Textfield 
                    label="Total: "
                    value={iTotalNuevo}
                    onChange={(e) => {
                      setITotalNuevo(e.target.value);
                      setNuevoChanged(!nuevoChanged);
                    }}
                    currency
                    readOnly
                  />
                </div>
              </div>

            </div>

            <div className="flex flex-col items-center">
              <p className="text-center font-semibold">Configuración documento</p>
              <div className="flex flex-col items-center gap-y-2 rounded-xl bg-black/40 p-2 h-full">
                <TextButton 
                  text="Desvincular nota de crédito"
                  className="bg-white text-black font-black m-2 hover:bg-white/50 active:bg-white/20 w-[95%] justify-center"
                />
                <TextButton 
                  text="Eliminar documento"
                  className="bg-white text-black font-black m-2 hover:bg-white/50 active:bg-white/20 w-[95%] justify-center"
                />
                <TextButton 
                  text="Confirmar edición"
                  disabled={!confirmarEdicion}
                  className="bg-white text-black font-black hover:bg-white/50 active:bg-white/20  w-[95%] justify-center mt-auto mb-2"
                />
              </div>
              
            </div>
            
          </div>
          
          
        </Modal>
      )}

      {/* Footer fijo */}
      <div className="absolute bottom-0 left-0 w-full z-10">
        <Footer />
      </div>
    </div>
  );
};

export default RRevisionDocumentos;

function toDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
