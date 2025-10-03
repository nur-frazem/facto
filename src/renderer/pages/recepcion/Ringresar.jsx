import { SidebarWithContentSeparator } from "../../components/sidebar";
import React, { useState, useEffect } from "react";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, YButton, XButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield, DropdownMenu, DatepickerField } from "../../components/Textfield";
import { Modal } from "../../components/modal";

import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT, cleanRUT } from "../../utils/formatRUT";

import { getAuth } from "firebase/auth";

const RIngresar = () => {
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

  const [fechaE, setFechaE] = useState(null);
  const [fechaV, setFechaV] = useState(null);

  //Valores monto documento textfield
  const [neto, setNeto] = useState("");
  const [iva, setIva] = useState("");
  const [otros, setOtros] = useState(0);
  const [flete, setFlete] = useState(0);
  const [retencion, setRetencion] = useState(0);

  useEffect(() => {
  const netoNumber = Number(neto) || 0;
  const fleteNumber = Number(flete) || 0;
  setIva(((netoNumber + fleteNumber) * 0.19).toFixed(0)); // redondeado sin decimales
}, [neto, flete]);

  const total = (Number(neto) || 0) + (Number(iva) || 0) + (Number(otros) || 0) + (Number(flete) || 0) - (Number(retencion) || 0);

  //Valores de los campos
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedGiro, setSelectedGiro] = useState(null);
  const [giroRut ,setGiroRut] = useState("");
  const [numeroDoc, setNumeroDoc] = useState("");
  const [numeroDocNc, setNumeroDocNc] = useState("");
  const [formaPago, setFormaPago] = useState("");

  useEffect(() => {
    setFormaPago("");
    setFechaE("");
    setFechaV("");
  }, [selectedDoc, selectedGiro]);

  //modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);

  // Estado de errores
  const [errorDoc ,setErrorDoc] = useState("");
  const [errors, setErrors] = useState({});
  const ECampo = "!";
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
    if (selectedGiro && selectedDoc === "Nota de crédito" && numeroDocNc === "") {
      newErrors.numeroDocNc = ECampo;
    }
  
    // Totales solo si visible
    if (selectedGiro && selectedDoc && neto === "") newErrors.neto = ECampo;
    if (selectedGiro && selectedDoc && iva === "") newErrors.iva = ECampo;
    if (selectedGiro && selectedDoc && flete === "") newErrors.flete = ECampo;
    if (selectedGiro && selectedDoc && retencion === "") newErrors.retencion = ECampo;
  
    setErrors(newErrors);


    if (Object.keys(newErrors).length === 0) {
      setIsModalOpen(true);
    }
  };
  
  const handleEnviarDoc = async () => {
    const fechaVDate = fechaV; // ya es un Date
    const fechaActual = new Date();

    let estado = fechaVDate < fechaActual ? "vencido" : "pendiente";
    if(formaPago != "Crédito"){
      estado = "pagado";
      if(selectedDoc == "Nota de crédito"){
        estado = "pendiente"
      }
    }

    console.log("fechaVDate:", fechaVDate, "fechaActual:", fechaActual, "estado:", estado);

    const factura = {
      numeroDoc,
      formaPago,
      fechaE,
      fechaV,
      neto,
      flete,
      retencion,
      otros,
      iva,
      total,
      estado,
      ingresoUsuario : userId,
      fechaIngreso : fechaActual
    }

    const boleta = {
      numeroDoc,
      fechaE,
      neto,
      iva,
      total,
      estado,
      ingresoUsuario : userId,
      fechaIngreso : fechaActual
    }

    const notaCredito = {
      numeroDoc,
      numeroDocNc,
      fechaE,
      neto,
      flete,
      retencion,
      otros,
      iva,
      total,
      estado,
      ingresoUsuario : userId,
      fechaIngreso : fechaActual
    }
    setLoadingModal(true);
    if(selectedDoc == "Factura electrónica" || selectedDoc == "Factura exenta"){
      try {
        const documentoRef = doc(db, "empresas", String(giroRut), "facturas", String(numeroDoc));
        const docSnap = await getDoc(documentoRef);
  
        if (docSnap.exists()) {
            // Documento ya existe
            setLoadingModal(false);
            console.warn("Este documento ya esta ingresado");
            setErrorDoc("Este documento ya esta ingresado");
            return;
        }
  
        // Documento no existe, creamos uno nuevo
        await setDoc(documentoRef, factura);
  
        setIsModalOpen(false);
        handleResetParams();
        window.location.reload();
  
      } catch (err) {
        console.error("Error guardando documento:", err);
      }
    }

    else if(selectedDoc=="Boleta"){
      try {
        estado = "pagado";
        const documentoRef = doc(db, "empresas", String(giroRut), "boletas", String(numeroDoc));
        const docSnap = await getDoc(documentoRef);
  
        if (docSnap.exists()) {
            // Documento ya existe
            setLoadingModal(false);
            console.warn("Este documento ya esta ingresado");
            setErrorDoc("Este documento ya esta ingresado");
            return;
        }
  
        // Documento no existe, creamos uno nuevo
        await setDoc(documentoRef, boleta);
  
        setIsModalOpen(false);
        handleResetParams();
        window.location.reload();
  
      } catch (err) {
        console.error("Error guardando empresa:", err);
      }
    }

    else if(selectedDoc=="Nota de crédito"){
      try {
        estado = "pendiente";
        const documentoRef = doc(db, "empresas", String(giroRut), "notasCredito", String(numeroDoc));
        const docSnap = await getDoc(documentoRef);
  
        if (docSnap.exists()) {
            // Documento ya existe
            setLoadingModal(false);
            console.warn("Este documento ya esta ingresado");
            setErrorDoc("Este documento ya esta ingresado");
            return;
        }
  
        //Buscamos la factura asociada
        const facturaRef = doc(db, "empresas", String(giroRut), "facturas", String(numeroDocNc));
        const facturaSnap = await getDoc(facturaRef);

        if (!facturaSnap.exists()) {
          // Si no se encuentra la factura asociada
          setLoadingModal(false);
          console.warn("No se encuentra la factura asociada");
          setErrorDoc("No se encuentra la factura asociada");
          return;
        }

        const facturaData = facturaSnap.data();

        // Validar estado
        if (facturaData.estado === "pagado") {
          setLoadingModal(false);
          console.warn("El documento asociado ya se encuentra pagado");
          setErrorDoc("El documento asociado ya se encuentra pagado");
          return;
        }

        // Documento no existe, creamos uno nuevo
        await setDoc(documentoRef, notaCredito);

        // Actualizamos la factura asociada
        const abonoActual = facturaData.abonoNc || 0;

        await updateDoc(facturaRef, {
          abonoNc: abonoActual + total,
          notasCredito: arrayUnion(numeroDoc), // añade el numeroDoc de la NC
          totalDescontado: (facturaData.totalDescontado ?? facturaData.total) - total //Se descuenta el total de esta NC en el total descontado de la factura
        });
  
        setIsModalOpen(false);
        handleResetParams();
        window.location.reload();
  
      } catch (err) {
        console.error("Error guardando empresa:", err);
      }
    }
    setLoadingModal(false);
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
    setNeto(0);
    setFlete(0);
    setRetencion(0);
    setOtros(0);
    setIva(0);
}

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
        <H1Tittle text="Ingreso de documentos" />
      </div>

      {/* Contenido principal */}
      <div className="flex flex-col flex-wrap justify-start gap-6 mt-10 ml-5 mr-5">
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
            onSelect={
              (item) => {setSelectedGiro(item);
              setErrors((prev) => ({ ...prev, selectedGiro: undefined }));
              const rutSolo = item.split(" ")[0];
              setGiroRut(cleanRUT(rutSolo));
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
              items={rowTipoDoc.slice(1).map((item) => item)}
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
            <div /> //MODIFICAR PARA QUE SE REINICIE FECHAV AQUÍ <--
          )}

          

          {/* NC */}
          {selectedDoc === "Nota de crédito" && selectedGiro != null ? (
            <Textfield
              className="font-bold"
              label={
                <>
                  N° de Factura a descontar NC
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

          {selectedGiro != null && selectedDoc != null ? (
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
            <div className="grid grid-cols-2 grid-rows-5 gap-y-3 gap-x-10">
              <p className="font-semibold">Giro:</p>
              <p>{selectedGiro}</p>
              <p className="font-semibold">Tipo documento:</p>
              <p>{selectedDoc}</p>
              <p className="font-semibold">N° documento:</p>
              <p>{numeroDoc}</p>
              <div />
              <div />
              <p className="font-semibold">Monto total:</p>
              <p>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(total)}</p>

            </div>
            <hr className=" border-black mt-1" />
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

    {errorDoc && (
      <Modal onClickOutside={() => setErrorDoc("")}>
          <div className="flex flex-col items-center gap-4 p-4">
              <p className="text-red-500 font-bold">{errorDoc}</p>
              <YButton
                  text="Cerrar"
                  onClick={() => setErrorDoc("")}
              />
          </div>
      </Modal>
    )}

    {loadingModal && (
      <Modal>
          <p className="font-black">Cargando</p>
      </Modal>
    )}
          

      {/* Footer fijo */}
      <div className="absolute bottom-0 left-0 w-full z-10">
        <Footer />
      </div>
    </div>
  );
};

export default RIngresar;
