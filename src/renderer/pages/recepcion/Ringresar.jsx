import {SidebarWithContentSeparator} from "../../components/sidebar";
import React, {useState} from 'react';
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { VolverButton, YButton } from "../../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield, DropdownMenu, DatepickerField } from "../../components/Textfield";

const RIngresar = () => {
    const navigate = useNavigate();
    const [fechaE, setFechaE] = useState(null);
    const [fechaV, setFechaV] = useState(null);

    //Valores monto documento textfield
    const [neto, setNeto]   = useState("");
    const [iva, setIva]     = useState("");
    const [otros, setOtros] = useState("");

    const total = (Number(neto) || 0) + (Number(iva) || 0) + (Number(otros) || 0);

    //Valores de los campos
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [selectedGiro, setSelectedGiro] = useState(null);
    const [numeroDoc, setNumeroDoc] = useState(null);


    return(
        <div className="h-screen grid grid-cols-[auto_1fr] grid-rows-[auto_1fr] relative">
            {/* Sidebar */}
            <div className="row-span-2">
                <SidebarWithContentSeparator className="h-full" />
            </div>

            {/* Título */}
            <div className="p-4 relative flex items-center justify-center">
                <div className="absolute left-5">
                    <VolverButton onClick={() => navigate("/recepcion-index")}/>
                </div>
                <H1Tittle text="Ingreso de documentos" />
            </div>

            {/* Contenido principal */}
            <div className="flex flex-col flex-wrap justify-start gap-6 mt-10 ml-5 mr-5">
                <div className="grid grid-cols-2 grid-rows-5 gap-y-3 gap-x-10">
                    
                    <DropdownMenu 
                        tittle="Seleccione giro" 
                        items={["Empresa 1", "Empresa 2", "Empresa 3"]} 
                        onSelect={(item) => setSelectedGiro(item)}
                        />
                    
                    {selectedGiro != null && selectedDoc != null ?(
                        <DatepickerField 
                        label="Fecha de Emisión" 
                        selectedDate={fechaE} onChange={(date) => setFechaE(date)} 
                        placeholder="Selecciona una fecha"
                        />
                        ) : (
                            <div></div>
                        )
                    }
                    
                    {selectedGiro != null ?(
                        <DropdownMenu 
                        tittle="Seleccione Documento" 
                        items={["Factura Crédito", "Factura Contado", "Boleta", "Guía Electrónica"]} 
                        onSelect={(item) => setSelectedDoc(item)}
                        />
                    ) : (
                        <div></div>
                    )
                    }
                    
                    {selectedDoc == "Factura Crédito" && selectedGiro !=null ? (
                        <DatepickerField 
                        label="Fecha de Vencimiento" 
                        selectedDate={fechaV} 
                        onChange={(date) => setFechaV(date)} 
                        placeholder="Selecciona una fecha"
                        />
                    ) : (
                        <div />
                    )}

                    {selectedGiro != null && selectedDoc != null ?(
                        <Textfield 
                        className="font-bold" 
                        label="N° De Documento" 
                        classNameLabel="font-bold"
                        />
                        ) : (
                            <div></div>
                        )
                        }
                    

                    <div />

                    {selectedGiro != null && selectedDoc != null ?(
                        <Textfield className="font-bold" 
                        label="Total Neto" 
                        value={neto} 
                        onChange={e => setNeto(e.target.value)}
                        classNameLabel="font-bold" 
                        placeholder="$"
                        currency
                        />
                    ) : (
                        <div></div>
                    )
                    }
                    
                    {selectedGiro != null && selectedDoc != null ?(
                        <Textfield className="font-bold" 
                        label="Total IVA" 
                        value={iva} 
                        onChange={e => setIva(e.target.value)}
                        classNameLabel="font-bold" 
                        placeholder="$"
                        currency
                        />
                        ) : (
                            <div></div>
                        )
                    }
                    
                    <div />

                    {selectedGiro != null && selectedDoc != null ?(
                        <Textfield className="font-bold" 
                        label="Otros cobros" 
                        value={otros} 
                        onChange={e => setOtros(e.target.value)}
                        classNameLabel="font-bold" 
                        placeholder="$"
                        currency
                        />
                        ) : (
                            <div></div>
                        )
                    }
                    
                    <div />
                    <div />
                </div>
                <hr className="border-black"/>

                <div className="grid grid-cols-2 grid-rows-1 gap-y-3 gap-x-10">
                    {selectedGiro != null && selectedDoc != null ?(
                        <Textfield className="font-bold w-3/5 my-2" 
                        label="Monto Total" 
                        value={total}
                        classNameLabel="font-bold" 
                        placeholder="$"
                        currency
                        />
                        ) : (
                            <div></div>
                        )
                    }
                    <YButton classNameContainer="self-end" text="Ingresar" />
                </div>
                
                
            </div>

            {/* Footer fijo */}
            <div className="absolute bottom-0 left-0 w-full z-10">
                <Footer />
            </div>
        </div>
            
    );
}

export default RIngresar;