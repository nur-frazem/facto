import { SidebarWithContentSeparator } from "../../components/sidebar";
import React, { useState, useEffect } from "react";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, YButton, XButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield, DropdownMenu, DatepickerField } from "../../components/Textfield";
import { Modal, LoadingModal, AlertModal } from "../../components/modal";

import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";

import { getAuth } from "firebase/auth";

const RIngresar = () => {
  const navigate = useNavigate();

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

  useEffect(() => {
    if (fechaE && formaPago === "Crédito" && creditoProveedor > 0) {
      const nuevaFechaV = new Date(fechaE);
      nuevaFechaV.setDate(nuevaFechaV.getDate() + Number(creditoProveedor));
      setFechaV(nuevaFechaV);
    }
  }, [fechaE, formaPago, creditoProveedor]);

  const handleIngresar = () => {
    let newErrors = {};
  
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
        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
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
        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
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
        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
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
        const docSnap = await getDoc(documentoRef);

        if (docSnap.exists()) {
            setLoadingModal(false);
            setErrorDoc("Este documento ya está ingresado");
            return;
        }

        // Buscar la factura asociada según el tipo seleccionado
        const tipoFacturaAsociada = tipoDocNc === "Factura exenta" ? "facturasExentas" : "facturas";
        const facturaRef = doc(db, "empresas", String(giroRut), tipoFacturaAsociada, String(numeroDocNc));
        const facturaSnap = await getDoc(facturaRef);

        if (!facturaSnap.exists()) {
          setLoadingModal(false);
          setErrorDoc(`No se encuentra la ${tipoDocNc.toLowerCase()} N° ${numeroDocNc}`);
          return;
        }

        const facturaData = facturaSnap.data();

        if (facturaData.estado === "pagado") {
          setLoadingModal(false);
          setErrorDoc("El documento asociado ya se encuentra pagado");
          return;
        }

        // Guardar nota de crédito con referencia al tipo de factura
        await setDoc(documentoRef, {
          ...notaCredito,
          tipoFacturaAsociada
        });

        // Actualizar la factura asociada
        const abonoActual = facturaData.abonoNc || 0;
        await updateDoc(facturaRef, {
          abonoNc: abonoActual + total,
          notasCredito: arrayUnion(numeroDoc),
          totalDescontado: (facturaData.totalDescontado ?? facturaData.total) - total
        });

        setLoadingModal(false);
        setIsModalOpen(false);
        handleResetParams();
        setSuccessDoc(`Nota de crédito N° ${numeroDoc} ingresada exitosamente`);
      } catch (err) {
        console.error("Error guardando nota de crédito:", err);
        setLoadingModal(false);
        setErrorDoc("Error al guardar la nota de crédito");
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
        <div className="flex-1 flex flex-col flex-wrap justify-start gap-4 sm:gap-6 px-3 sm:px-5 py-4 overflow-x-auto">
        <div className="grid grid-cols-3 grid-rows-5 gap-y-3 gap-x-10">
          
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
            
              // Obtener datos de la empresa para sacar credito_proveedor
              const empresaRef = doc(db, "empresas", rutLimpio);
              const empresaSnap = await getDoc(empresaRef);
              if (empresaSnap.exists()) {
                const data = empresaSnap.data();
                setCreditoProveedor(data.credito_proveedor || 0);
              } else {
                setCreditoProveedor(0);
              }
            }}
            classNameMenu={errors.selectedGiro && ("ring-red-400 ring-2")}
          />

          {/* Selección de documento */}
          {selectedGiro != null ? (
            <DropdownMenu
              tittle={
                <>
                  Seleccione Tipo de Documento
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
              classNameMenu={errors.selectedDoc && ("ring-red-400 ring-2")}
            />
          ) : (
            <div></div>
          )}

          {/* Número de documento */}
          {selectedGiro != null && selectedDoc != null ? (
            <Textfield
              className="font-bold"
              label={
                <>
                  N° De Documento
                  {errors.numeroDoc && (
                    <span className="text-red-300 font-black"> - {errors.numeroDoc}</span>
                  )}
                </>
              }
              classNameLabel="font-bold"
              type="number"
              value={numeroDoc}
              onChange={(e) => {
                setNumeroDoc(e.target.value);
                setErrors((prev) => ({ ...prev, numeroDoc: undefined }));
              }
              }
              classNameInput={errors.numeroDoc && ("ring-red-400 ring-2")}
            />
          ) : (
            <div></div>
          )}

          {/* Tipo de pago */}
          {selectedGiro != null && selectedDoc != null && (selectedDoc == "Factura electrónica" || selectedDoc == "Factura exenta") ? (
            <DropdownMenu
              tittle={
                <>
                  Seleccione Forma De Pago
                  {errors.formaPago && (
                    <span className="text-red-300 font-black"> - {errors.formaPago}</span>
                  )}
                </>
              }
              items={rowFormaPago.slice(1).map((item) => item)}
              value={formaPago}
              onSelect={(item) => {
                setFormaPago(item);
                setErrors((prev) => ({ ...prev, formaPago: undefined }));
              }}
              classNameMenu={errors.formaPago && ("ring-red-400 ring-2")}
            />
          ) : (
            <div></div>
          )}

          {/* Fecha de emisión */}
          {selectedGiro != null && selectedDoc != null ? (
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
              classNameDatePicker={errors.fechaE && ("ring-red-400 ring-2")}
            />
          ) : (
            <div></div>
          )}

          

          {/* Fecha de vencimiento */}
          {((selectedDoc === "Factura electrónica" || selectedDoc === "Factura exenta") && fechaE !== null && formaPago === "Crédito") &&
          selectedGiro != null ? (
            <DatepickerField
              label={<>
                    Fecha de Vencimiento
                    {errors.fechaV && (
                        <span className="text-red-300 font-black"> - {errors.fechaV} </span>
                    )}
              </>}
              selectedDate={fechaV}
              onChange={(date) => {
                setFechaV(date);
                setErrors((prev) => ({ ...prev, fechaV: undefined }));
            }}
              placeholder="Selecciona una fecha"
              minDate={fechaE}
              classNameDatePicker={errors.fechaV && ("ring-red-400 ring-2")}
            />
          ) : (
            <div />
          )}

          

          {/* NC - Tipo de documento a vincular */}
          {selectedDoc === "Nota de crédito" && selectedGiro != null ? (
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
              classNameMenu={errors.tipoDocNc && ("ring-red-400 ring-2")}
            />
          ) : (
            <div />
          )}

          {/* NC - Número de documento a vincular */}
          {selectedDoc === "Nota de crédito" && selectedGiro != null && tipoDocNc ? (
            <Textfield
              className="font-bold"
              label={
                <>
                  N° de {tipoDocNc === "Factura exenta" ? "Factura exenta" : "Factura"} a vincular
                  {errors.numeroDocNc && (
                    <span className="text-red-300 font-black"> - {errors.numeroDocNc}</span>
                  )}
                </>
              }
              classNameLabel="font-bold"
              type="number"
              value={numeroDocNc}
              onChange={(e) => {
                setNumeroDocNc(e.target.value);
                setErrors((prev) => ({ ...prev, numeroDocNc: undefined }));
              }}
              classNameInput={errors.numeroDocNc && ("ring-red-400 ring-2")}
            />
          ) : (
            <div />
          )}
          <div></div>
          <div></div>

          {/* Totales */}
          {selectedGiro != null && selectedDoc != null ? (
            <Textfield
              className="font-bold"
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
              classNameLabel="font-bold"
              placeholder="$"
              currency
              classNameInput={errors.neto && ("ring-red-400 ring-2")}
            />
          ) : (
            <div></div>
          )}

          {/* Flete */}
          {selectedGiro != null && selectedDoc != null ? (
            <Textfield
              className="font-bold"
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
              classNameLabel="font-bold"
              placeholder="$"
              classNameInput={errors.flete && ("ring-red-400 ring-2")}
              currency
            />
          ) : (
            <div></div>
          )}

          {/* Retención */}
          {selectedGiro != null && selectedDoc != null ? (
            <Textfield
              className="font-bold"
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
              classNameLabel="font-bold"
              placeholder="$"
              classNameInput={errors.retencion && ("ring-red-400 ring-2")}
              currency
            />
          ) : (
            <div></div>
          )}

          {selectedGiro != null && selectedDoc != null ? (
            <Textfield
              className="font-bold"
              label="Total otros impuestos"
              value={otros}
              onChange={(e) => setOtros(e.target.value)}
              classNameLabel="font-bold"
              placeholder="$"
              currency
            />
          ) : (
            <div></div>
          )}

          {/* IVA - No mostrar para Factura exenta */}
          {selectedGiro != null && selectedDoc != null && selectedDoc !== "Factura exenta" ? (
            <Textfield
              className="font-bold"
              label={
                <>
                  IVA
                  {errors.iva && (
                    <span className="text-red-300 font-black"> - {errors.iva}</span>
                  )}
                </>
              }
              value={iva}
              onChange={(e) => {
                setIva(e.target.value);
                setErrors((prev) => ({ ...prev, iva: undefined }));
              }}
              classNameLabel="font-bold"
              placeholder="$"
              classNameInput={errors.iva && ("ring-red-400 ring-2")}
              currency
            />
          ) : (
            <div></div>
          )}

          <div />
          <div />
        </div>
        <hr className="border-black" />

        <div className="grid grid-cols-2 grid-rows-1 gap-y-3 gap-x-10">
          {selectedGiro != null && selectedDoc != null ? (
            <Textfield
              className="font-bold w-3/5 my-2"
              label="Monto Total"
              value={total}
              classNameLabel="font-bold"
              placeholder="$"
              currency
              readOnly
            />
          ) : (
            <div></div>
          )}

          {/* Botón con validación */}
          <YButton
            classNameContainer="self-end justify-self-end mr-16"
            text="Ingresar"
            onClick={handleIngresar}
          />
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
