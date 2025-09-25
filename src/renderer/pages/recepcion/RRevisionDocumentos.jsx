import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton } from "../../components/Button";
import { DropdownMenu } from "../../components/Textfield";

import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { Card } from "../../components/Container";

const Example = () => {
    const navigate = useNavigate();

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
                </div>

                <Card 
                    hasButton={false}
                    contentClassName="w-96 h-[40rem] overflow-y-auto scrollbar-custom flex flex-col w-full"
                    content={
                       <div>
                            <div className="flex justify-between font-bold mb-2">
                                <div className="w-1/8 text-center text-sm">Tipo documento</div>
                                <div className="w-1/8 text-center text-sm">N° Folio</div>
                                <div className="w-1/8 text-center text-sm">Fecha emisión</div>
                                <div className="w-1/8 text-center text-sm">Fecha Vencimiento</div>
                                <div className="w-1/8 text-center text-sm">Empresa</div>
                                <div className="w-1/8 text-center text-sm">Monto</div>
                                <div className="w-1/8 text-center text-sm">Estado folio</div>
                                <div className="mr-10"></div>
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

export default Example;