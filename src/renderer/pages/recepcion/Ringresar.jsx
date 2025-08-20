import { SidebarWithContentSeparator } from "../../components/sidebar";
import React, { useState, useEffect } from "react";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, YButton, XButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield, DropdownMenu, DatepickerField } from "../../components/Textfield";
import { Modal } from "../../components/modal";

const RIngresar = () => {
  const navigate = useNavigate();
  const [fechaE, setFechaE] = useState(null);
  const [fechaV, setFechaV] = useState(null);

  //Valores monto documento textfield
  const [neto, setNeto] = useState("");
  const [iva, setIva] = useState("");
  const [otros, setOtros] = useState("");
  const [flete, setFlete] = useState("");
  const [retencion, setRetencion] = useState("");

  useEffect(() => {
  const netoNumber = Number(neto) || 0;
  const fleteNumber = Number(flete) || 0;
  setIva(((netoNumber + fleteNumber) * 0.19).toFixed(0)); // redondeado sin decimales
}, [neto, flete]);

  const total = (Number(neto) || 0) + (Number(iva) || 0) + (Number(otros) || 0) + (Number(flete) || 0) - (Number(retencion) || 0);

  //Valores de los campos
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedGiro, setSelectedGiro] = useState(null);
  const [numeroDoc, setNumeroDoc] = useState("");
  const [numeroDocNc, setNumeroDocNc] = useState("");

  //modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado de errores
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
      (selectedDoc === "Factura Crédito" || selectedDoc === "Nota de crédito") &&
      !fechaV
    ) {
      newErrors.fechaV = ECampo;
    }
  
    // Número de documento solo si visible
    if (selectedGiro && selectedDoc && numeroDoc === "") newErrors.numeroDoc = ECampo;
  
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
          {/* Selección de giro */}
          <DropdownMenu
            tittle={
                <>
                  Seleccione giro
                  {errors.selectedGiro && (
                    <span className="text-red-300 font-black"> - {errors.selectedGiro}</span>
                  )}
                </>
              }
            items={["Empresa 1", "Empresa 2", "Empresa 3"]}
            onSelect={(item) => {
                setSelectedGiro(item);
                setErrors((prev) => ({ ...prev, selectedGiro: undefined }));
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
              items={["Factura Crédito", "Factura Contado", "Boleta", "Guía Electrónica", "Nota de crédito"]}
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
          {(selectedDoc === "Factura Crédito" || selectedDoc === "Nota de crédito") &&
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
                  onClick={() => setIsModalOpen(false)}
                />
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

export default RIngresar;
