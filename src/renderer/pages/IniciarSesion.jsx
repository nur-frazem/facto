import React, {useState, useEffect} from 'react';
import { H1Tittle } from "../components/Fonts";
import { YButton, XButton } from "../components/Button";
import { CGrid } from "../components/Container";
import { useNavigate } from "react-router-dom";
import { Textfield } from '../components/Textfield';
import { Modal } from '../components/modal';
import Footer from '../components/Footer';

import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';

import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";

const IniciarSesion = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const[loadingModal, setLoadingModal] = useState(false);

    const handleLogin = async () => {
        try {
            setLoadingModal(true);
            await signInWithEmailAndPassword(auth, email, password);
            const empresasSnap = await getDocs(collection(db, "empresas"));
    
            for (const empresa of empresasSnap.docs) {
                const facturasRef = collection(db, "empresas", empresa.id, "facturas");
                const facturasSnap = await getDocs(query(facturasRef, where("estado", "==", "pendiente")));
    
                const hoy = new Date();
    
                for (const factura of facturasSnap.docs) {
                const data = factura.data();
    
                // Solo actualizar si está pendiente y ya pasó la fecha
                if (data.estado === "pendiente" && data.fechaV.toDate() < hoy) {
                    const facturaRef = doc(db, "empresas", empresa.id, "facturas", factura.id);
                    await updateDoc(facturaRef, {
                    estado: "vencido",
                    });
                    console.log(`Factura ${factura.id} actualizada a vencido`);
                }
                }
            }
            setLoadingModal(false);
            navigate("/home");
        } catch (error) {
            console.error("Error en login:", error.message);
            setErrorMessage("Correo o contraseña inválidos");
            setLoadingModal(false);
            setShowErrorModal(true);
        }
    };

    return(
        <CGrid rowSizes='30% 10% 1fr'>
            <div>
                <H1Tittle text="Inicio Sesión" subtittle="Ingrese sus datos para iniciar sesión" />
            </div>
            <div className='justify-center items-center flex flex-col gap-4'>
                <Textfield label="E-MAIL:" 
                            type='email' 
                            className='w-96' 
                            placeholder="Ejemplo@ejemplo.ej"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            />
                <Textfield label="Contraseña:" 
                            type='password' 
                            className='w-96'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            />
            </div>
            
            <div className='justify-center items-start flex gap-32 mt-10'>
                <YButton text="Iniciar" 
                        className="text-2xl py-4 px-12"
                        onClick={handleLogin}
                        />

                <XButton text="Salir" 
                        className="text-2xl py-4 px-12 " 
                        onClick={() => window.electronAPI.salirApp()}
                        />
            </div>

            {showErrorModal && (
                <Modal onClickOutside={() => setShowErrorModal(false)}>
                    <div className="flex flex-col items-center gap-4">
                    <p>{errorMessage}</p>
                    <XButton
                        className="h-8"
                        onClick={() => setShowErrorModal(false)}
                        text="Volver"
                    />
                    </div>
                </Modal>
            )}

            {loadingModal && (
                      <Modal>
                          <p className="font-black">Cargando</p>
                      </Modal>
            )}

            <Footer></Footer>
            
        </CGrid>
    );
    
    
}

export default IniciarSesion;