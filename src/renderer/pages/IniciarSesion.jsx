import { useState } from 'react';
import { YButton, XButton } from "../components/Button";
import { useNavigate } from "react-router-dom";
import { Textfield } from '../components/Textfield';
import { Modal } from '../components/modal';
import Footer from '../components/Footer';
import { useTheme } from '../context/ThemeContext';

import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const IniciarSesion = () => {
    const { isLightTheme } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loadingModal, setLoadingModal] = useState(false);

    // Password reset states
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState("");

    const handleLogin = async () => {
        try {
            setLoadingModal(true);
            await signInWithEmailAndPassword(auth, email, password);
            // Status updates (pendiente -> vencido) are now handled per-page when documents are loaded
            setLoadingModal(false);
            navigate("/home");
        } catch (error) {
            console.error("Error en login:", error.message);
            setErrorMessage("Correo o contraseña inválidos");
            setLoadingModal(false);
            setShowErrorModal(true);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    const handlePasswordReset = async () => {
        if (!resetEmail) {
            setResetError("Ingrese su correo electrónico");
            return;
        }

        setResetLoading(true);
        setResetError("");

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSuccess(true);
        } catch (error) {
            console.error("Error en reset:", error.code);
            if (error.code === "auth/user-not-found") {
                setResetError("No existe una cuenta con este correo");
            } else if (error.code === "auth/invalid-email") {
                setResetError("Correo electrónico inválido");
            } else {
                setResetError("Error al enviar el correo. Intente nuevamente.");
            }
        } finally {
            setResetLoading(false);
        }
    };

    const handleOpenResetModal = () => {
        setResetEmail(email); // Pre-fill with login email if available
        setResetError("");
        setResetSuccess(false);
        setShowResetModal(true);
    };

    const handleCloseResetModal = () => {
        setShowResetModal(false);
        setResetEmail("");
        setResetError("");
        setResetSuccess(false);
    };

    return(
        <div className="min-h-screen flex flex-col">
            {/* Main content - centered */}
            <div className="flex-1 flex items-center justify-center p-4">
                {/* Login Card */}
                <div className="w-full max-w-md">
                    {/* Logo & Brand */}
                    <div className="text-center mb-8">
                        {/* Logo Icon */}
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-blue to-blue-600 shadow-lg shadow-accent-blue/25 mb-4">
                            <svg
                                className="w-10 h-10 text-white"
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
                        {/* Brand Name */}
                        <h1 className={`text-4xl font-black tracking-tight ${isLightTheme ? "text-gray-800" : "text-white"}`}>
                            FACTO
                        </h1>
                        <p className={`mt-1 text-sm ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>
                            Sistema de Gestión Documental
                        </p>
                    </div>

                    {/* Login Form Card */}
                    <div className={`backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-xl ${
                        isLightTheme
                            ? "bg-white border border-gray-200"
                            : "bg-gradient-to-br from-white/10 to-white/5 border border-white/10"
                    }`}>
                        <h2 className={`text-xl font-semibold mb-1 ${isLightTheme ? "text-gray-800" : "text-white"}`}>
                            Bienvenido
                        </h2>
                        <p className={`text-sm mb-6 ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>
                            Ingrese sus credenciales para continuar
                        </p>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <Textfield
                                label="Correo electrónico"
                                type='email'
                                className='w-full'
                                placeholder="usuario@ejemplo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <div>
                                <Textfield
                                    label="Contraseña"
                                    type='password'
                                    className='w-full'
                                    placeholder="Ingrese su contraseña"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                />
                                <button
                                    type="button"
                                    onClick={handleOpenResetModal}
                                    className={`mt-2 text-sm transition-colors ${
                                        isLightTheme
                                            ? "text-blue-600 hover:text-blue-700"
                                            : "text-accent-blue hover:text-blue-400"
                                    }`}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className='flex flex-col gap-3 mt-6'>
                            <YButton
                                text="Iniciar Sesión"
                                className="w-full text-lg py-3 justify-center font-semibold"
                                onClick={handleLogin}
                            />
                            <button
                                onClick={() => window.electronAPI.salirApp()}
                                className={`w-full py-2.5 text-sm font-medium transition-colors duration-200 ${
                                    isLightTheme
                                        ? "text-gray-500 hover:text-gray-800"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                Salir de la aplicación
                            </button>
                        </div>
                    </div>

                    {/* Version info */}
                    <p className={`text-center text-xs mt-6 ${isLightTheme ? "text-gray-400" : "text-slate-500"}`}>
                        v1.0.0
                    </p>
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <Modal onClickOutside={() => setShowErrorModal(false)}>
                    <div className="flex flex-col items-center gap-4 p-2">
                        <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <p className="text-white font-medium">{errorMessage}</p>
                        <XButton
                            className="h-10 px-6"
                            onClick={() => setShowErrorModal(false)}
                            text="Intentar de nuevo"
                        />
                    </div>
                </Modal>
            )}

            {/* Loading Modal */}
            {loadingModal && (
                <Modal>
                    <div className="flex flex-col items-center gap-4 p-4">
                        {/* Spinner */}
                        <div className="w-10 h-10 border-4 border-white/20 border-t-accent-blue rounded-full animate-spin"></div>
                        <p className="text-white font-medium">Iniciando sesión...</p>
                    </div>
                </Modal>
            )}

            {/* Password Reset Modal */}
            {showResetModal && (
                <Modal onClickOutside={handleCloseResetModal}>
                    <div className="flex flex-col gap-4 p-2 min-w-[320px]">
                        {!resetSuccess ? (
                            <>
                                {/* Header */}
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isLightTheme ? "bg-blue-100" : "bg-accent-blue/20"
                                    }`}>
                                        <svg className={`w-5 h-5 ${isLightTheme ? "text-blue-600" : "text-accent-blue"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className={`font-semibold ${isLightTheme ? "text-gray-800" : "text-white"}`}>Restablecer contraseña</h3>
                                        <p className={`text-sm ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>Te enviaremos un correo con instrucciones</p>
                                    </div>
                                </div>

                                {/* Email Input */}
                                <Textfield
                                    label="Correo electrónico"
                                    type="email"
                                    className="w-full"
                                    placeholder="usuario@ejemplo.com"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordReset()}
                                />

                                {/* Error Message */}
                                {resetError && (
                                    <p className="text-danger text-sm text-center">{resetError}</p>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-3 mt-2">
                                    <XButton
                                        className="flex-1 justify-center"
                                        text="Cancelar"
                                        onClick={handleCloseResetModal}
                                    />
                                    <YButton
                                        className="flex-1 justify-center"
                                        text={resetLoading ? "Enviando..." : "Enviar"}
                                        onClick={handlePasswordReset}
                                        disabled={resetLoading}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Success State */}
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                        isLightTheme ? "bg-green-100" : "bg-success/20"
                                    }`}>
                                        <svg className={`w-8 h-8 ${isLightTheme ? "text-green-600" : "text-success"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="text-center">
                                        <h3 className={`font-semibold mb-1 ${isLightTheme ? "text-gray-800" : "text-white"}`}>Correo enviado</h3>
                                        <p className={`text-sm ${isLightTheme ? "text-gray-500" : "text-slate-400"}`}>
                                            Revisa tu bandeja de entrada en<br />
                                            <span className={`font-medium ${isLightTheme ? "text-gray-800" : "text-white"}`}>{resetEmail}</span>
                                        </p>
                                    </div>
                                    <YButton
                                        className="mt-2 px-8 justify-center"
                                        text="Entendido"
                                        onClick={handleCloseResetModal}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </Modal>
            )}

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default IniciarSesion;
