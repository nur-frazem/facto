import { SidebarWithContentSeparator } from "../../components/sidebar";
import React, { useState, useEffect, useRef } from "react";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, YButton, XButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield, DropdownMenu, DatepickerField } from "../../components/Textfield";
import { Modal, LoadingModal, AlertModal } from "../../components/modal";
import { useTheme } from "../../context/ThemeContext";

import { doc, setDoc, getDoc, collection, onSnapshot, runTransaction, addDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";
import { validateNumeroDoc, validateAmount, validateNeto, validateTotal, validateEmissionDate, validateDueDate } from "../../utils/validation";

import { getAuth } from "firebase/auth";

const RIngresar = () => {
  const navigate = useNavigate();
  const { isLightTheme } = useTheme();

  const [userId, setUserId] = useState("");

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.email);
      } else {
        setUserId("");
      }
    });
  
    // Limpieza al desmontar
    return () => unsubscribe();
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
  }, []);
  const [rowTipoDoc, setRowTipoDoc] = useState([]);
  const [rowFormaPago, setRowFormaPago] = useState([]);

  // Valores de los campos
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedGiro, setSelectedGiro] = useState(null);
  const [giroRut, setGiroRut] = useState("");
  const [numeroDoc, setNumeroDoc] = useState("");
  const [numeroDocNc, setNumeroDocNc] = useState("");
  const [tipoDocNc, setTipoDocNc] = useState(""); // Tipo de documento a vincular con NC
  const [formaPago, setFormaPago] = useState("");

  const [fechaE, setFechaE] = useState(null);
  const [fechaV, setFechaV] = useState(null);
  const [creditoProveedor, setCreditoProveedor] = useState(0);

  // Valores monto documento textfield
  const [neto, setNeto] = useState("");
  const [iva, setIva] = useState("");
  const [otros, setOtros] = useState(0);
  const [flete, setFlete] = useState(0);
  const [retencion, setRetencion] = useState(0);

  // Calcular IVA automáticamente (solo para documentos que tienen IVA)
  useEffect(() => {
    if (selectedDoc === "Factura exenta") {
      setIva(0);
    } else {
      const netoNumber = Number(neto) || 0;
      const fleteNumber = Number(flete) || 0;
      setIva(((netoNumber + fleteNumber) * 0.19).toFixed(0));
    }
  }, [neto, flete, selectedDoc]);

  // Total calculado (Factura exenta no incluye IVA)
  const ivaParaTotal = selectedDoc === "Factura exenta" ? 0 : (Number(iva) || 0);
  const total = (Number(neto) || 0) + ivaParaTotal + (Number(otros) || 0) + (Number(flete) || 0) - (Number(retencion) || 0);

  useEffect(() => {
    setFormaPago("");
    setFechaE("");
    setFechaV("");
    setTipoDocNc("");
    setNumeroDocNc("");
  }, [selectedDoc, selectedGiro]);

  //modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);

  // Estado de errores y éxito
  const [errorDoc ,setErrorDoc] = useState("");
  const [successDoc, setSuccessDoc] = useState("");
  const [errors, setErrors] = useState({});
  const ECampo = "!";

  // Rate limiting - 3 segundos entre documentos (previene spam automatizado)
  const lastDocTime = useRef(0);
  const RATE_LIMIT_MS = 3000;

  useEffect(() => {
    if (fechaE && formaPago === "Crédito" && creditoProveedor > 0) {
      const nuevaFechaV = new Date(fechaE);
      nuevaFechaV.setDate(nuevaFechaV.getDate() + Number(creditoProveedor));
      setFechaV(nuevaFechaV);
    }
  }, [fechaE, formaPago, creditoProveedor]);

  const handleIngresar = () => {
    const newErrors = {};
  
    // Giro siempre visible
    if (!selectedGiro) newErrors.selectedGiro = ECampo;
  
    // Documento solo si giro seleccionado
    if (selectedGiro && !selectedDoc) newErrors.selectedDoc = ECampo;
  
    // Fecha de emisión solo si giro y documento seleccionados
    if (selectedGiro && selectedDoc && !fechaE) newErrors.fechaE = ECampo;
  
    // Fecha de vencimiento solo si corresponde y visible
    if (
      selectedGiro &&
      (formaPago === "Crédito") &&
      !fechaV
    ) {
      newErrors.fechaV = ECampo;
    }
  
    // Número de documento solo si visible
    if (selectedGiro && selectedDoc && numeroDoc === "") newErrors.numeroDoc = ECampo;

    if (selectedGiro && selectedDoc !== ""){
      if (selectedDoc === "Factura electrónica" || selectedDoc === "Factura exenta") {
        if(formaPago === "") newErrors.formaPago = ECampo;
      }
    } 
  
    // NC solo si visible
    if (selectedGiro && selectedDoc === "Nota de crédito") {
      if (!tipoDocNc) newErrors.tipoDocNc = ECampo;
      if (numeroDocNc === "") newErrors.numeroDocNc = ECampo;
    }
  
    // Totales solo si visible
    if (selectedGiro && selectedDoc && neto === "") newErrors.neto = ECampo;
    // IVA no es requerido para Factura exenta
    if (selectedGiro && selectedDoc && selectedDoc !== "Factura exenta" && iva === "") newErrors.iva = ECampo;
    if (selectedGiro && selectedDoc && flete === "") newErrors.flete = ECampo;
    if (selectedGiro && selectedDoc && retencion === "") newErrors.retencion = ECampo;
  
    setErrors(newErrors);


    if (Object.keys(newErrors).length === 0) {
      setIsModalOpen(true);
    }
  };
  
  const handleEnviarDoc = async () => {
    // Rate limiting check
    const now = Date.now();
    if (now - lastDocTime.current < RATE_LIMIT_MS) {
      const segundosRestantes = Math.ceil((RATE_LIMIT_MS - (now - lastDocTime.current)) / 1000);
      setErrorDoc(`Por favor espere ${segundosRestantes} segundo(s) antes de ingresar otro documento`);
      return;
    }

    // Validate inputs before processing
    const validationErrors = [];

    // Validate document number
    const numDocResult = validateNumeroDoc(numeroDoc);
    if (!numDocResult.valid) validationErrors.push(numDocResult.error);

    // Validate neto with $999.999.999 limit
    const netoResult = validateNeto(neto);
    if (!netoResult.valid) validationErrors.push(netoResult.error);

    if (selectedDoc !== "Factura exenta") {
      const ivaResult = validateAmount(iva, "IVA");
      if (!ivaResult.valid) validationErrors.push(ivaResult.error);
    }

    const fleteResult = validateAmount(flete, "flete");
    if (!fleteResult.valid) validationErrors.push(fleteResult.error);

    const retencionResult = validateAmount(retencion, "retención");
    if (!retencionResult.valid) validationErrors.push(retencionResult.error);

    // Validate total is positive
    const totalResult = validateTotal(total);
    if (!totalResult.valid) validationErrors.push(totalResult.error);

    // Validate emission date
    const fechaEResult = validateEmissionDate(fechaE);
    if (!fechaEResult.valid) validationErrors.push(fechaEResult.error);

    // Validate due date if applicable
    if (formaPago === "Crédito" && fechaV) {
      const fechaVResult = validateDueDate(fechaV, fechaE);
      if (!fechaVResult.valid) validationErrors.push(fechaVResult.error);
    }

    // Validate credit note reference
    if (selectedDoc === "Nota de crédito") {
      const ncNumResult = validateNumeroDoc(numeroDocNc);
      if (!ncNumResult.valid) validationErrors.push("N° documento asociado: " + ncNumResult.error);
    }

    // If validation errors, show them and return
    if (validationErrors.length > 0) {
      setErrorDoc(validationErrors.join(". "));
      return;
    }

    const fechaVDate = fechaV;
    const fechaActual = new Date();

    let estado = fechaVDate < fechaActual ? "vencido" : "pendiente";
    if(formaPago !== "Crédito"){
      estado = "pagado";
      if(selectedDoc === "Nota de crédito"){
        estado = "pendiente"
      }
    }

    const factura = {
      numeroDoc,
      formaPago,
      fechaE,
      fechaV,
      neto: Number(neto),
      flete: Number(flete),
      retencion: Number(retencion),
      otros: Number(otros),
      iva: Number(iva),
      total,
      estado,
      ingresoUsuario: userId,
      fechaIngreso: fechaActual
    };

    // Factura exenta no tiene IVA
    const facturaExenta = {
      numeroDoc,
      formaPago,
      fechaE,
      fechaV,
      neto: Number(neto),
      flete: Number(flete),
      retencion: Number(retencion),
      otros: Number(otros),
      total,
      estado,
      ingresoUsuario: userId,
      fechaIngreso: fechaActual
    };

    const boleta = {
      numeroDoc,
      fechaE,
      neto: Number(neto),
      iva: Number(iva),
      total,
      estado: "pagado",
      ingresoUsuario: userId,
      fechaIngreso: fechaActual
    };

    const notaCredito = {
      numeroDoc,
      numeroDocNc,
      fechaE,
      neto: Number(neto),
      flete: Number(flete),
      retencion: Number(retencion),
      otros: Number(otros),
      iva: Number(iva),
      total,
      estado,
      ingresoUsuario: userId,
      fechaIngreso: fechaActual
    };

    setLoadingModal(true);

    // Factura electrónica
    if(selectedDoc === "Factura electrónica"){
      try {
        const documentoRef = doc(db, "empresas", String(giroRut), "facturas", String(numeroDoc));
        const docSnap = await getDoc(documentoRef);

        if (docSnap.exists()) {
            setLoadingModal(false);
            setErrorDoc("Este documento ya está ingresado");
            return;
        }

        await setDoc(documentoRef, factura);

        // Registrar en auditoría
        try {
          await addDoc(collection(db, "auditoria"), {
            tipo: "creacion",
            tipoDocumento: "facturas",
            numeroDocumento: numeroDoc,
            empresaRut: giroRut,
            creadoPor: userId,
            fechaCreacion: new Date().toISOString(),
            datos: {
              total: total,
              neto: Number(neto),
              formaPago: formaPago,
              estado: estado
            }
          });
        } catch (auditErr) {
          console.warn("No se pudo registrar en auditoría:", auditErr);
        }

        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
        lastDocTime.current = Date.now();
        setSuccessDoc(`Factura electrónica N° ${numeroDoc} ingresada exitosamente`);
      } catch (err) {
        console.error("Error guardando documento:", err);
        setLoadingModal(false);
        setErrorDoc("Error al guardar el documento");
      }
    }

    // Factura exenta - va a colección facturasExentas
    if(selectedDoc === "Factura exenta"){
      try {
        const documentoRef = doc(db, "empresas", String(giroRut), "facturasExentas", String(numeroDoc));
        const docSnap = await getDoc(documentoRef);

        if (docSnap.exists()) {
            setLoadingModal(false);
            setErrorDoc("Este documento ya está ingresado");
            return;
        }

        await setDoc(documentoRef, facturaExenta);

        // Registrar en auditoría
        try {
          await addDoc(collection(db, "auditoria"), {
            tipo: "creacion",
            tipoDocumento: "facturasExentas",
            numeroDocumento: numeroDoc,
            empresaRut: giroRut,
            creadoPor: userId,
            fechaCreacion: new Date().toISOString(),
            datos: {
              total: total,
              neto: Number(neto),
              formaPago: formaPago,
              estado: estado
            }
          });
        } catch (auditErr) {
          console.warn("No se pudo registrar en auditoría:", auditErr);
        }

        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
        lastDocTime.current = Date.now();
        setSuccessDoc(`Factura exenta N° ${numeroDoc} ingresada exitosamente`);
      } catch (err) {
        console.error("Error guardando documento:", err);
        setLoadingModal(false);
        setErrorDoc("Error al guardar el documento");
      }
    }

    // Boleta
    if(selectedDoc === "Boleta"){
      try {
        const documentoRef = doc(db, "empresas", String(giroRut), "boletas", String(numeroDoc));
        const docSnap = await getDoc(documentoRef);

        if (docSnap.exists()) {
            setLoadingModal(false);
            setErrorDoc("Este documento ya está ingresado");
            return;
        }

        await setDoc(documentoRef, boleta);

        // Registrar en auditoría
        try {
          await addDoc(collection(db, "auditoria"), {
            tipo: "creacion",
            tipoDocumento: "boletas",
            numeroDocumento: numeroDoc,
            empresaRut: giroRut,
            creadoPor: userId,
            fechaCreacion: new Date().toISOString(),
            datos: {
              total: total,
              neto: Number(neto)
            }
          });
        } catch (auditErr) {
          console.warn("No se pudo registrar en auditoría:", auditErr);
        }

        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
        lastDocTime.current = Date.now();
        setSuccessDoc(`Boleta N° ${numeroDoc} ingresada exitosamente`);
      } catch (err) {
        console.error("Error guardando boleta:", err);
        setLoadingModal(false);
        setErrorDoc("Error al guardar la boleta");
      }
    }

    // Nota de crédito
    if(selectedDoc === "Nota de crédito"){
      try {
        const documentoRef = doc(db, "empresas", String(giroRut), "notasCredito", String(numeroDoc));
        const tipoFacturaAsociada = tipoDocNc === "Factura exenta" ? "facturasExentas" : "facturas";
        const facturaRef = doc(db, "empresas", String(giroRut), tipoFacturaAsociada, String(numeroDocNc));

        // Use transaction to prevent race conditions
        await runTransaction(db, async (transaction) => {
          // Read both documents within transaction
          const docSnap = await transaction.get(documentoRef);
          const facturaSnap = await transaction.get(facturaRef);

          if (docSnap.exists()) {
            throw new Error("DUPLICATE");
          }

          if (!facturaSnap.exists()) {
            throw new Error("FACTURA_NOT_FOUND");
          }

          const facturaData = facturaSnap.data();

          if (facturaData.estado === "pagado") {
            throw new Error("ALREADY_PAID");
          }

          // Calculate new values atomically using current data
          const abonoActual = facturaData.abonoNc || 0;
          const currentNotasCredito = facturaData.notasCredito || [];

          // Validate that NC total doesn't exceed remaining invoice balance
          const invoiceTotal = facturaData.total || 0;
          const remainingBalance = invoiceTotal - abonoActual;
          if (total > remainingBalance) {
            throw new Error("NC_EXCEEDS_BALANCE");
          }

          // Write credit note
          transaction.set(documentoRef, {
            ...notaCredito,
            tipoFacturaAsociada
          });

          // Update invoice atomically
          transaction.update(facturaRef, {
            abonoNc: abonoActual + total,
            notasCredito: [...currentNotasCredito, numeroDoc],
            totalDescontado: (facturaData.totalDescontado ?? facturaData.total) - total
          });
        });

        // Registrar en auditoría
        try {
          await addDoc(collection(db, "auditoria"), {
            tipo: "creacion",
            tipoDocumento: "notasCredito",
            numeroDocumento: numeroDoc,
            empresaRut: giroRut,
            creadoPor: userId,
            fechaCreacion: new Date().toISOString(),
            datos: {
              total: total,
              neto: Number(neto),
              documentoVinculado: {
                tipo: tipoDocNc,
                numero: numeroDocNc
              }
            }
          });
        } catch (auditErr) {
          console.warn("No se pudo registrar en auditoría:", auditErr);
        }

        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
        lastDocTime.current = Date.now();
        setSuccessDoc(`Nota de crédito N° ${numeroDoc} ingresada exitosamente`);
      } catch (err) {
        console.error("Error guardando nota de crédito:", err);
        setLoadingModal(false);

        if (err.message === "DUPLICATE") {
          setErrorDoc("Este documento ya está ingresado");
        } else if (err.message === "FACTURA_NOT_FOUND") {
          setErrorDoc(`No se encuentra la ${tipoDocNc.toLowerCase()} N° ${numeroDocNc}`);
        } else if (err.message === "ALREADY_PAID") {
          setErrorDoc("El documento asociado ya se encuentra pagado");
        } else if (err.message === "NC_EXCEEDS_BALANCE") {
          setErrorDoc("El monto de la nota de crédito excede el saldo restante de la factura");
        } else {
          setErrorDoc("Error al guardar la nota de crédito");
        }
      }
    }
  }

  const handleResetParams = () => {
    setSelectedGiro("");
    setGiroRut("");
    setSelectedDoc("");
    setNumeroDoc("");
    setFormaPago("");
    setFechaE("");
    setFechaV("");
    setNumeroDocNc("");
    setTipoDocNc("");
    setNeto(0);
    setFlete(0);
    setRetencion(0);
    setOtros(0);
    setIva(0);
}

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
          <H1Tittle text="Ingreso de documentos" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 px-4 sm:px-6 py-4 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-4">

            {/* Card 1: Información del Documento */}
            <div className={`backdrop-blur-sm rounded-xl p-5 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
            }`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Información del Documento
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Selección de empresa */}
                <DropdownMenu
                  tittle={
                    <>
                      Seleccione empresa
                      {errors.selectedGiro && (
                        <span className="text-red-300 font-black"> - {errors.selectedGiro}</span>
                      )}
                    </>
                  }
                  items={rows.map((row) => `${formatRUT(row.rut)} ${row.razon}`)}
                  value={selectedGiro}
                  searchable={true}
                  searchPlaceholder="Buscar por RUT o razón social..."
                  onSelect={async (item) => {
                    setSelectedGiro(item);
                    setErrors((prev) => ({ ...prev, selectedGiro: undefined }));
                    const rutSolo = item.split(" ")[0];
                    const rutLimpio = cleanRUT(rutSolo);
                    setGiroRut(rutLimpio);

                    const empresaRef = doc(db, "empresas", rutLimpio);
                    const empresaSnap = await getDoc(empresaRef);
                    if (empresaSnap.exists()) {
                      const data = empresaSnap.data();
                      setCreditoProveedor(data.credito_proveedor || 0);
                    } else {
                      setCreditoProveedor(0);
                    }
                  }}
                  classNameMenu={errors.selectedGiro ? "ring-red-400 ring-2" : ""}
                />

                {/* Selección de documento */}
                <div className={!selectedGiro ? "opacity-50 pointer-events-none" : ""}>
                  <DropdownMenu
                    tittle={
                      <>
                        Tipo de Documento
                        {errors.selectedDoc && (
                          <span className="text-red-300 font-black"> - {errors.selectedDoc}</span>
                        )}
                      </>
                    }
                    items={rowTipoDoc.slice(1).filter((item) => item !== "Guía electrónica")}
                    value={selectedDoc}
                    onSelect={(item) => {
                      setSelectedDoc(item);
                      setErrors((prev) => ({ ...prev, selectedDoc: undefined }));
                    }}
                    classNameMenu={errors.selectedDoc ? "ring-red-400 ring-2" : ""}
                  />
                </div>

                {/* Número de documento */}
                <div className={!selectedDoc ? "opacity-50 pointer-events-none" : ""}>
                  <Textfield
                    label={
                      <>
                        N° de Documento
                        {errors.numeroDoc && (
                          <span className="text-red-300 font-black"> - {errors.numeroDoc}</span>
                        )}
                      </>
                    }
                    type="number"
                    value={numeroDoc}
                    onChange={(e) => {
                      setNumeroDoc(e.target.value);
                      setErrors((prev) => ({ ...prev, numeroDoc: undefined }));
                    }}
                    readOnly={!selectedDoc}
                    classNameInput={errors.numeroDoc ? "ring-red-400 ring-2" : ""}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Pago y Fechas */}
            <div className={`backdrop-blur-sm rounded-xl p-5 transition-opacity ${!selectedDoc ? "opacity-50" : ""} ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
            }`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Pago y Fechas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Forma de pago - Solo para facturas */}
                {(selectedDoc === "Factura electrónica" || selectedDoc === "Factura exenta") ? (
                  <DropdownMenu
                    tittle={
                      <>
                        Forma de Pago
                        {errors.formaPago && (
                          <span className="text-red-300 font-black"> - {errors.formaPago}</span>
                        )}
                      </>
                    }
                    items={rowFormaPago.slice(1)}
                    value={formaPago}
                    onSelect={(item) => {
                      setFormaPago(item);
                      setErrors((prev) => ({ ...prev, formaPago: undefined }));
                    }}
                    classNameMenu={errors.formaPago ? "ring-red-400 ring-2" : ""}
                  />
                ) : (
                  <div className="opacity-50 pointer-events-none">
                    <DropdownMenu
                      tittle="Forma de Pago"
                      items={[]}
                      value=""
                    />
                  </div>
                )}

                {/* Fecha de emisión */}
                <div className={!selectedDoc ? "pointer-events-none" : ""}>
                  <DatepickerField
                    label={
                      <>
                        Fecha de Emisión
                        {errors.fechaE && (
                          <span className="text-red-300 font-black"> - {errors.fechaE}</span>
                        )}
                      </>
                    }
                    selectedDate={fechaE}
                    onChange={(date) => {
                      setFechaE(date);
                      setErrors((prev) => ({ ...prev, fechaE: undefined }));
                    }}
                    placeholder="Selecciona una fecha"
                    maxDate={new Date()}
                    classNameDatePicker={errors.fechaE ? "ring-red-400 ring-2" : ""}
                  />
                </div>

                {/* Fecha de vencimiento */}
                <div className={!(formaPago === "Crédito" && fechaE) ? "opacity-50 pointer-events-none" : ""}>
                  <DatepickerField
                    label={
                      <>
                        Fecha de Vencimiento
                        {errors.fechaV && (
                          <span className="text-red-300 font-black"> - {errors.fechaV}</span>
                        )}
                      </>
                    }
                    selectedDate={fechaV}
                    onChange={(date) => {
                      setFechaV(date);
                      setErrors((prev) => ({ ...prev, fechaV: undefined }));
                    }}
                    placeholder="Selecciona una fecha"
                    minDate={fechaE}
                    classNameDatePicker={errors.fechaV ? "ring-red-400 ring-2" : ""}
                  />
                </div>
              </div>

              {/* Nota de crédito - Campos adicionales */}
              {selectedDoc === "Nota de crédito" && (
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}>
                  <DropdownMenu
                    tittle={
                      <>
                        Tipo de documento a vincular
                        {errors.tipoDocNc && (
                          <span className="text-red-300 font-black"> - {errors.tipoDocNc}</span>
                        )}
                      </>
                    }
                    items={["Factura electrónica", "Factura exenta"]}
                    value={tipoDocNc}
                    onSelect={(item) => {
                      setTipoDocNc(item);
                      setErrors((prev) => ({ ...prev, tipoDocNc: undefined }));
                    }}
                    classNameMenu={errors.tipoDocNc ? "ring-red-400 ring-2" : ""}
                  />

                  <div className={!tipoDocNc ? "opacity-50 pointer-events-none" : ""}>
                    <Textfield
                      label={
                        <>
                          N° de {tipoDocNc === "Factura exenta" ? "Factura exenta" : "Factura"} a vincular
                          {errors.numeroDocNc && (
                            <span className="text-red-300 font-black"> - {errors.numeroDocNc}</span>
                          )}
                        </>
                      }
                      type="number"
                      value={numeroDocNc}
                      onChange={(e) => {
                        setNumeroDocNc(e.target.value);
                        setErrors((prev) => ({ ...prev, numeroDocNc: undefined }));
                      }}
                      readOnly={!tipoDocNc}
                      classNameInput={errors.numeroDocNc ? "ring-red-400 ring-2" : ""}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card 3: Montos */}
            <div className={`backdrop-blur-sm rounded-xl p-5 transition-opacity ${!selectedDoc ? "opacity-50" : ""} ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
            }`}>
              <h3 className={`font-semibold mb-4 flex items-center gap-2 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Montos del Documento
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Total Neto */}
                <div className={!selectedDoc ? "pointer-events-none" : ""}>
                  <Textfield
                    label={
                      <>
                        Total Neto
                        {errors.neto && (
                          <span className="text-red-300 font-black"> - {errors.neto}</span>
                        )}
                      </>
                    }
                    value={neto}
                    onChange={(e) => {
                      setNeto(e.target.value);
                      setErrors((prev) => ({ ...prev, neto: undefined }));
                    }}
                    placeholder="$0"
                    currency
                    readOnly={!selectedDoc}
                    classNameInput={errors.neto ? "ring-red-400 ring-2" : ""}
                  />
                </div>

                {/* Flete */}
                <div className={!selectedDoc ? "pointer-events-none" : ""}>
                  <Textfield
                    label={
                      <>
                        Flete
                        {errors.flete && (
                          <span className="text-red-300 font-black"> - {errors.flete}</span>
                        )}
                      </>
                    }
                    value={flete}
                    onChange={(e) => {
                      setFlete(e.target.value);
                      setErrors((prev) => ({ ...prev, flete: undefined }));
                    }}
                    placeholder="$0"
                    currency
                    readOnly={!selectedDoc}
                    classNameInput={errors.flete ? "ring-red-400 ring-2" : ""}
                  />
                </div>

                {/* Retención */}
                <div className={!selectedDoc ? "pointer-events-none" : ""}>
                  <Textfield
                    label={
                      <>
                        Retención
                        {errors.retencion && (
                          <span className="text-red-300 font-black"> - {errors.retencion}</span>
                        )}
                      </>
                    }
                    value={retencion}
                    onChange={(e) => {
                      setRetencion(e.target.value);
                      setErrors((prev) => ({ ...prev, retencion: undefined }));
                    }}
                    placeholder="$0"
                    currency
                    readOnly={!selectedDoc}
                    classNameInput={errors.retencion ? "ring-red-400 ring-2" : ""}
                  />
                </div>

                {/* Otros impuestos */}
                <div className={!selectedDoc ? "pointer-events-none" : ""}>
                  <Textfield
                    label="Otros impuestos"
                    value={otros}
                    onChange={(e) => setOtros(e.target.value)}
                    placeholder="$0"
                    currency
                    readOnly={!selectedDoc}
                  />
                </div>

                {/* IVA - No mostrar para Factura exenta */}
                <div className={!selectedDoc || selectedDoc === "Factura exenta" ? "opacity-50 pointer-events-none" : ""}>
                  <Textfield
                    label={
                      <>
                        IVA (19%)
                        {errors.iva && selectedDoc !== "Factura exenta" && (
                          <span className="text-red-300 font-black"> - {errors.iva}</span>
                        )}
                      </>
                    }
                    value={selectedDoc === "Factura exenta" ? 0 : iva}
                    onChange={(e) => {
                      setIva(e.target.value);
                      setErrors((prev) => ({ ...prev, iva: undefined }));
                    }}
                    placeholder="$0"
                    currency
                    readOnly={!selectedDoc || selectedDoc === "Factura exenta"}
                    classNameInput={errors.iva && selectedDoc !== "Factura exenta" ? "ring-red-400 ring-2" : ""}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Total y Acción */}
            <div className="bg-gradient-to-br from-accent-blue/20 to-accent-blue/10 backdrop-blur-sm border border-accent-blue/30 rounded-xl p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-accent-blue/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm ${isLightTheme ? 'text-gray-600' : 'text-slate-400'}`}>Monto Total</p>
                    <p className={`text-2xl font-bold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedDoc ? total : 0)}
                    </p>
                  </div>
                </div>

                <YButton
                  text="Ingresar Documento"
                  className="px-8 py-3 text-lg font-semibold"
                  onClick={handleIngresar}
                />
              </div>
            </div>

          </div>
        </div>
          
      {isModalOpen && (
        <Modal>
          <h2 className="text-xl font-bold mb-4">¿Están correctos los datos?</h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-10">
              <p className="font-semibold">Empresa:</p>
              <p>{selectedGiro}</p>
              <p className="font-semibold">Tipo documento:</p>
              <p>{selectedDoc}</p>
              <p className="font-semibold">N° documento:</p>
              <p>{numeroDoc}</p>
              {selectedDoc === "Nota de crédito" && (
                <>
                  <p className="font-semibold">Vinculada a:</p>
                  <p>{tipoDocNc} N° {numeroDocNc}</p>
                </>
              )}
              <p className="font-semibold">Monto total:</p>
              <p>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total)}</p>
            </div>
            <hr className="border-white/20 mt-4" />
            <div className="mt-6 flex justify-between">
                <XButton
                  text="Corregir"
                  onClick={() => setIsModalOpen(false)}
                />
                <YButton
                  text="Ingresar"
                  onClick={() => {
                    handleEnviarDoc();
                  }}
                />
            </div>
        </Modal>
    )}

    <AlertModal
      isOpen={!!errorDoc}
      onClose={() => setErrorDoc("")}
      title="Error"
      message={errorDoc}
      variant="error"
    />

    <AlertModal
      isOpen={!!successDoc}
      onClose={() => setSuccessDoc("")}
      title="Documento ingresado"
      message={successDoc}
      variant="success"
    />

    <LoadingModal isOpen={loadingModal} message="Procesando documento..." />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default RIngresar;
