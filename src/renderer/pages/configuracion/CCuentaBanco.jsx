import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { useNavigate } from 'react-router-dom';
import { VolverButton, TextButton } from '../../components/Button';
import { Textfield, DropdownMenu } from '../../components/Textfield';
import { Card } from '../../components/Container';
import { Modal, LoadingModal, AlertModal } from '../../components/modal';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useCompany } from '../../context/CompanyContext';

import { formatRUT, cleanRUT } from '../../utils/formatRUT';

// Lista de bancos registrados en Chile
const BANCOS_CHILE = [
  'Banco de Chile',
  'Banco Santander Chile',
  'Banco del Estado de Chile (BancoEstado)',
  'Banco de Crédito e Inversiones (BCI)',
  'Banco BICE',
  'Banco Itaú Chile',
  'Scotiabank Chile',
  'Banco Security',
  'Banco Falabella',
  'Banco Ripley',
  'Banco Consorcio',
  'Banco Internacional',
  'HSBC Bank Chile',
  'Banco BTG Pactual Chile',
  'Banco de la Nación Argentina (Sucursal Chile)',
  'Banco Do Brasil S.A. (Sucursal Chile)',
  'JP Morgan Chase Bank (Sucursal Chile)',
  'China Construction Bank (Sucursal Chile)',
  'Bank of China (Sucursal Chile)',
  'Coopeuch',
  'Tenpo',
  'MACH (BCI)',
  'Cuenta RUT (BancoEstado)',
];

// Tipos de cuenta bancaria
const TIPOS_CUENTA = [
  'Cuenta Corriente',
  'Cuenta Vista',
  'Cuenta de Ahorro',
  'Cuenta RUT',
  'Chequera Electrónica',
];

const CCuentaBanco = () => {
  const navigate = useNavigate();
  const { isLightTheme } = useTheme();
  const { currentCompanyRUT } = useCompany();
  const { tieneAccion } = useAuth();

  // Permisos del usuario
  const puedeCrear = tieneAccion('CUENTAS_BANCARIAS_CREAR');
  const puedeEditar = tieneAccion('CUENTAS_BANCARIAS_EDITAR');
  const puedeEliminar = tieneAccion('CUENTAS_BANCARIAS_ELIMINAR');

  // Estado de cuentas bancarias
  const [cuentasBancarias, setCuentasBancarias] = useState([]);

  // Estado de formulario
  const [banco, setBanco] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [rutTitular, setRutTitular] = useState('');
  const [nombreTitular, setNombreTitular] = useState('');
  const [emailTitular, setEmailTitular] = useState('');

  // Estado de búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estado de modales
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: '',
    message: '',
    variant: 'success',
  });

  // Estado de errores
  const [errors, setErrors] = useState({});

  // Cargar cuentas bancarias en tiempo real
  useEffect(() => {
    if (!currentCompanyRUT) return;

    const cuentasRef = collection(db, currentCompanyRUT, '_root', 'cuentas_bancarias');

    const unsubscribe = onSnapshot(
      cuentasRef,
      (snapshot) => {
        const cuentasData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCuentasBancarias(cuentasData);
      },
      (error) => {
        if (error.code === 'permission-denied') return;
        console.error('Error obteniendo cuentas bancarias:', error);
      }
    );

    return () => unsubscribe();
  }, [currentCompanyRUT]);

  // Validar email
  const validarEmail = (email) => {
    if (!email) return true; // Email es opcional
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // Reset formulario
  const handleResetForm = () => {
    setBanco('');
    setNumeroCuenta('');
    setTipoCuenta('');
    setRutTitular('');
    setNombreTitular('');
    setEmailTitular('');
    setErrors({});
    setEditMode(false);
    setEditingId(null);
  };

  // Abrir modal para nueva cuenta
  const handleOpenNewModal = () => {
    handleResetForm();
    setShowModal(true);
  };

  // Abrir modal para editar cuenta
  const handleOpenEditModal = (cuenta) => {
    setBanco(cuenta.banco || '');
    setNumeroCuenta(cuenta.numeroCuenta || '');
    setTipoCuenta(cuenta.tipoCuenta || '');
    setRutTitular(cuenta.rutTitular || '');
    setNombreTitular(cuenta.nombreTitular || '');
    setEmailTitular(cuenta.emailTitular || '');
    setEditMode(true);
    setEditingId(cuenta.id);
    setShowModal(true);
  };

  // Guardar cuenta bancaria (crear o editar)
  const handleSaveCuenta = async () => {
    const newErrors = {};

    // Validaciones
    if (!banco) newErrors.banco = 'Requerido';
    if (!numeroCuenta) newErrors.numeroCuenta = 'Requerido';
    if (!tipoCuenta) newErrors.tipoCuenta = 'Requerido';
    if (!rutTitular) newErrors.rutTitular = 'Requerido';
    if (!nombreTitular) newErrors.nombreTitular = 'Requerido';
    if (emailTitular && !validarEmail(emailTitular)) {
      newErrors.emailTitular = 'Email inválido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoadingModal(true);

      const rutLimpio = cleanRUT(rutTitular);
      const cuentaData = {
        banco,
        numeroCuenta,
        tipoCuenta,
        rutTitular: rutLimpio,
        nombreTitular,
        emailTitular: emailTitular || '',
        fechaModificacion: serverTimestamp(),
      };

      if (editMode && editingId) {
        // Actualizar cuenta existente
        const cuentaRef = doc(db, currentCompanyRUT, '_root', 'cuentas_bancarias', editingId);
        await setDoc(cuentaRef, cuentaData, { merge: true });

        setAlertModal({
          open: true,
          title: 'Cuenta actualizada',
          message: 'La cuenta bancaria ha sido actualizada exitosamente',
          variant: 'success',
        });
      } else {
        // Crear nueva cuenta - usar número de cuenta como ID
        const cuentaId = `${rutLimpio}_${numeroCuenta}`;
        const cuentaRef = doc(db, currentCompanyRUT, '_root', 'cuentas_bancarias', cuentaId);

        // Verificar si ya existe
        const docSnap = await getDoc(cuentaRef);
        if (docSnap.exists()) {
          setLoadingModal(false);
          setErrors({ numeroCuenta: 'Esta cuenta ya existe' });
          return;
        }

        cuentaData.fechaCreacion = serverTimestamp();
        await setDoc(cuentaRef, cuentaData);

        setAlertModal({
          open: true,
          title: 'Cuenta creada',
          message: 'La cuenta bancaria ha sido creada exitosamente',
          variant: 'success',
        });
      }

      setLoadingModal(false);
      setShowModal(false);
      handleResetForm();
    } catch (error) {
      console.error('Error guardando cuenta bancaria:', error);
      setLoadingModal(false);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al guardar la cuenta bancaria',
        variant: 'error',
      });
    }
  };

  // Eliminar cuenta bancaria
  const handleDeleteCuenta = async () => {
    if (!deleteId) return;

    try {
      setLoadingModal(true);
      const cuentaRef = doc(db, currentCompanyRUT, '_root', 'cuentas_bancarias', deleteId);
      await deleteDoc(cuentaRef);

      setLoadingModal(false);
      setDeleteModal(false);
      setDeleteId(null);

      setAlertModal({
        open: true,
        title: 'Cuenta eliminada',
        message: 'La cuenta bancaria ha sido eliminada exitosamente',
        variant: 'success',
      });
    } catch (error) {
      console.error('Error eliminando cuenta bancaria:', error);
      setLoadingModal(false);
      setAlertModal({
        open: true,
        title: 'Error',
        message: 'Error al eliminar la cuenta bancaria',
        variant: 'error',
      });
    }
  };

  // Filtrar cuentas por búsqueda
  const cuentasFiltradas = cuentasBancarias.filter((cuenta) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      cuenta.banco?.toLowerCase().includes(search) ||
      cuenta.numeroCuenta?.toLowerCase().includes(search) ||
      cuenta.nombreTitular?.toLowerCase().includes(search) ||
      formatRUT(cuenta.rutTitular)?.toLowerCase().includes(search)
    );
  });

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
            <VolverButton onClick={() => navigate('/configuracion-index')} />
          </div>
          <H1Tittle text="Administrar Cuentas Bancarias" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col px-3 sm:px-5 py-4 overflow-x-auto">
          {/* Barra de acciones */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <input
              type="text"
              placeholder="Buscar por banco, número, titular o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-72 px-4 py-2.5 text-sm rounded-lg focus:ring-2 focus:ring-accent-blue/50 outline-none ${
                isLightTheme
                  ? 'bg-gray-50 border border-gray-200 text-gray-800'
                  : 'bg-white/5 border border-white/10 text-white placeholder-gray-400'
              }`}
            />
            {puedeCrear && (
              <TextButton
                text="Agregar cuenta bancaria"
                className="h-10 px-5 bg-success hover:bg-success-hover active:bg-success-active transition-colors duration-200 rounded-lg whitespace-nowrap"
                classNameText="font-semibold text-base text-white"
                onClick={handleOpenNewModal}
              />
            )}
          </div>

          {/* Tabla de cuentas bancarias */}
          <Card
            hasButton={false}
            contentClassName="h-[calc(100vh-280px)] overflow-y-auto scrollbar-custom flex flex-col w-full"
            content={
              <div>
                {/* Encabezados */}
                <div
                  className={`flex font-semibold text-sm mb-3 px-2 py-2 rounded-lg sticky top-0 ${
                    isLightTheme ? 'bg-gray-50 text-gray-600' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <div className="w-[18%] text-center">Banco</div>
                  <div className="w-[14%] text-center">N° Cuenta</div>
                  <div className="w-[14%] text-center">Tipo</div>
                  <div className="w-[14%] text-center">RUT Titular</div>
                  <div className="w-[18%] text-center">Nombre Titular</div>
                  <div className="w-[14%] text-center">Email</div>
                  <div className="w-[8%] text-center">Acciones</div>
                </div>

                {/* Filas de cuentas */}
                {cuentasFiltradas.map((cuenta) => (
                  <div
                    key={cuenta.id}
                    className={`flex items-center mb-1 px-2 py-3 rounded-lg transition-colors border-b last:border-b-0 ${
                      isLightTheme
                        ? 'hover:bg-gray-50 border-gray-100'
                        : 'hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="w-[18%] text-center text-sm truncate px-1" title={cuenta.banco}>
                      {cuenta.banco}
                    </div>
                    <div className="w-[14%] text-center text-sm font-mono">{cuenta.numeroCuenta}</div>
                    <div className="w-[14%] text-center text-xs">{cuenta.tipoCuenta}</div>
                    <div className="w-[14%] text-center text-sm">{formatRUT(cuenta.rutTitular)}</div>
                    <div
                      className="w-[18%] text-center text-sm truncate px-1"
                      title={cuenta.nombreTitular}
                    >
                      {cuenta.nombreTitular}
                    </div>
                    <div
                      className="w-[14%] text-center text-xs truncate px-1"
                      title={cuenta.emailTitular}
                    >
                      {cuenta.emailTitular || '-'}
                    </div>
                    <div className="w-[8%] flex justify-center gap-1">
                      {puedeEditar && (
                        <button
                          onClick={() => handleOpenEditModal(cuenta)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isLightTheme ? 'hover:bg-blue-100' : 'hover:bg-blue-500/20'
                          }`}
                          title="Editar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-accent-blue"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                        </button>
                      )}
                      {puedeEliminar && (
                        <button
                          onClick={() => {
                            setDeleteId(cuenta.id);
                            setDeleteModal(true);
                          }}
                          className={`p-1.5 rounded-md transition-colors ${
                            isLightTheme ? 'hover:bg-red-100' : 'hover:bg-red-500/20'
                          }`}
                          title="Eliminar"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 text-danger"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Sin cuentas */}
                {cuentasFiltradas.length === 0 && (
                  <div className="text-center text-gray-400 mt-8 py-8">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 text-slate-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                      />
                    </svg>
                    {searchTerm
                      ? 'No se encontraron cuentas con ese criterio'
                      : 'No hay cuentas bancarias registradas'}
                  </div>
                )}
              </div>
            }
          />
        </div>

        {/* Modal crear/editar cuenta */}
        {showModal && (
          <Modal
            onClickOutside={() => {
              setShowModal(false);
              handleResetForm();
            }}
            className="!absolute !top-20 !max-w-xl"
          >
            <h2 className="text-xl font-bold text-center mb-6">
              {editMode ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}
            </h2>

            <div className="space-y-4">
              {/* Banco */}
              <div>
                <DropdownMenu
                  tittle={
                    <>
                      Banco
                      {errors.banco && <span className="text-red-500 font-black"> - {errors.banco}</span>}
                    </>
                  }
                  items={BANCOS_CHILE}
                  value={banco}
                  onSelect={(item) => {
                    setBanco(item);
                    setErrors((prev) => ({ ...prev, banco: undefined }));
                  }}
                  searchable={true}
                  searchPlaceholder="Buscar banco..."
                />
              </div>

              {/* Número de cuenta */}
              <Textfield
                label={
                  <>
                    Número de cuenta
                    {errors.numeroCuenta && (
                      <span className="text-red-500 font-black"> - {errors.numeroCuenta}</span>
                    )}
                  </>
                }
                classNameInput={errors.numeroCuenta && 'ring-red-400 ring-2'}
                placeholder="Ej: 12345678"
                type="number"
                value={numeroCuenta}
                onChange={(e) => {
                  setNumeroCuenta(e.target.value);
                  setErrors((prev) => ({ ...prev, numeroCuenta: undefined }));
                }}
                readOnly={editMode} // No permitir cambiar número de cuenta en edición
              />

              {/* Tipo de cuenta */}
              <div>
                <DropdownMenu
                  tittle={
                    <>
                      Tipo de cuenta
                      {errors.tipoCuenta && (
                        <span className="text-red-500 font-black"> - {errors.tipoCuenta}</span>
                      )}
                    </>
                  }
                  items={TIPOS_CUENTA}
                  value={tipoCuenta}
                  onSelect={(item) => {
                    setTipoCuenta(item);
                    setErrors((prev) => ({ ...prev, tipoCuenta: undefined }));
                  }}
                />
              </div>

              {/* RUT Titular */}
              <Textfield
                label={
                  <>
                    RUT del titular
                    {errors.rutTitular && (
                      <span className="text-red-500 font-black"> - {errors.rutTitular}</span>
                    )}
                  </>
                }
                classNameInput={errors.rutTitular && 'ring-red-400 ring-2'}
                placeholder="Ej: 12.345.678-9"
                type="rut"
                value={rutTitular}
                onChange={(e) => {
                  setRutTitular(e.target.value);
                  setErrors((prev) => ({ ...prev, rutTitular: undefined }));
                }}
              />

              {/* Nombre Titular */}
              <Textfield
                label={
                  <>
                    Nombre del titular
                    {errors.nombreTitular && (
                      <span className="text-red-500 font-black"> - {errors.nombreTitular}</span>
                    )}
                  </>
                }
                classNameInput={errors.nombreTitular && 'ring-red-400 ring-2'}
                placeholder="Nombre completo del titular"
                value={nombreTitular}
                onChange={(e) => {
                  setNombreTitular(e.target.value);
                  setErrors((prev) => ({ ...prev, nombreTitular: undefined }));
                }}
              />

              {/* Email Titular */}
              <Textfield
                label={
                  <>
                    Email del titular (opcional)
                    {errors.emailTitular && (
                      <span className="text-red-500 font-black"> - {errors.emailTitular}</span>
                    )}
                  </>
                }
                classNameInput={errors.emailTitular && 'ring-red-400 ring-2'}
                placeholder="email@ejemplo.com"
                type="email"
                value={emailTitular}
                onChange={(e) => {
                  setEmailTitular(e.target.value);
                  setErrors((prev) => ({ ...prev, emailTitular: undefined }));
                }}
              />
            </div>

            <div
              className={`flex justify-end gap-3 mt-6 pt-4 border-t ${
                isLightTheme ? 'border-gray-200' : 'border-white/10'
              }`}
            >
              <TextButton
                text="Cancelar"
                className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                onClick={() => {
                  setShowModal(false);
                  handleResetForm();
                }}
              />
              <TextButton
                text={editMode ? 'Guardar Cambios' : 'Crear Cuenta'}
                className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                onClick={handleSaveCuenta}
              />
            </div>
          </Modal>
        )}

        {/* Modal confirmar eliminación */}
        {deleteModal && (
          <Modal onClickOutside={() => setDeleteModal(false)} className="!max-w-md">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-danger"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 17.333 3.532 19 5.072 19z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Eliminar Cuenta Bancaria</h3>
              <p className={`text-sm mb-2 ${isLightTheme ? 'text-gray-600' : 'text-slate-300'}`}>
                ¿Está seguro que desea eliminar esta cuenta bancaria?
              </p>
              <p className="text-sm font-medium text-danger mb-6">
                Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-center gap-4">
                <TextButton
                  text="Cancelar"
                  className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-full"
                  onClick={() => {
                    setDeleteModal(false);
                    setDeleteId(null);
                  }}
                />
                <TextButton
                  text="Eliminar"
                  className="px-5 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-full"
                  onClick={handleDeleteCuenta}
                />
              </div>
            </div>
          </Modal>
        )}

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.open}
          onClose={() => setAlertModal({ ...alertModal, open: false })}
          title={alertModal.title}
          message={alertModal.message}
          variant={alertModal.variant}
        />

        {/* Loading Modal */}
        <LoadingModal isOpen={loadingModal} message="Procesando..." />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default CCuentaBanco;
