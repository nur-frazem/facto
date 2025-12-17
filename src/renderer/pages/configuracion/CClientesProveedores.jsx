import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { useNavigate } from 'react-router-dom';
import { VolverButton, TextButton } from '../../components/Button';
import { SearchBar, Textfield, CheckboxDropdown } from '../../components/Textfield';
import { Card } from '../../components/Container';
import { Modal, LoadingModal, AlertModal } from '../../components/modal';
import { useTheme } from '../../context/ThemeContext';

import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig'; // ajusta la ruta a tu config

import { formatRUT } from '../../utils/formatRUT';
import { validateRUT } from '../../utils/validation';

const RProcesar = () => {
  const navigate = useNavigate();
  const { isLightTheme } = useTheme();

  {
    /* Variables de textfields */
  }
  const [rut, setRut] = useState('');
  const [razon, setRazon] = useState('');
  const [giro, setGiro] = useState('');
  const [comuna, setComuna] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  const [esCliente, setEsCliente] = useState(false);
  const [esProveedor, setEsProveedor] = useState(false);
  const [creditoCliente, setCreditoCliente] = useState(0);
  const [creditoProveedor, setCreditoProveedor] = useState(0);

  // Estado de búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estado de ordenamiento
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    // Referencia a la colección "empresas"
    const empresasRef = collection(db, 'empresas');

    // Suscribirse a los cambios en tiempo real
    const unsubscribe = onSnapshot(
      empresasRef,
      (snapshot) => {
        const empresasData = snapshot.docs.map((doc) => doc.data());
        setRows(empresasData);
      },
      (error) => {
        // Ignorar errores de permisos durante el logout
        if (error.code === 'permission-denied') return;
        console.error('Error obteniendo empresas:', error);
      }
    );

    // Cleanup cuando el componente se desmonte
    return () => unsubscribe();
  }, []);

  // Estado de errores
  const [errorRut, setErrorRut] = useState('');
  const [errors, setErrors] = useState({});
  const ECampo = '!';
  const handleNewEmpresa = async () => {
    const newErrors = {};

    // rut obligatorio
    if (!rut) newErrors.rut = ECampo;
    if (!razon) newErrors.razon = ECampo;
    if (!giro) newErrors.giro = ECampo;
    if (!comuna) newErrors.comuna = ECampo;
    if (!direccion) newErrors.direccion = ECampo;

    // Validar formato y dígito verificador del RUT
    if (rut) {
      const rutValidation = validateRUT(rut);
      if (!rutValidation.valid) {
        setErrorRut(rutValidation.error);
        return;
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const empresa = {
        rut,
        razon,
        giro,
        comuna,
        direccion,
        telefono,
        correo,
        cliente: esCliente,
        proveedor: esProveedor,
        credito_cliente: creditoCliente,
        credito_proveedor: creditoProveedor,
      };

      try {
        setLoadingModal(true);
        const empresaRef = doc(db, 'empresas', rut);
        const docSnap = await getDoc(empresaRef);

        if (docSnap.exists()) {
          setLoadingModal(false);
          setErrorRut('Este RUT ya existe en el sistema');
          return;
        }

        await setDoc(empresaRef, empresa);
        setLoadingModal(false);
        setShowModal(false);
        handleResetParams();
      } catch (err) {
        console.error('Error guardando empresa:', err);
        setLoadingModal(false);
        setErrorRut('Error al guardar la empresa');
      }
    }
  };

  const handleEditEmpresa = async () => {
    const newErrors = {};

    // rut obligatorio
    if (!rut) newErrors.rut = ECampo;
    if (!razon) newErrors.razon = ECampo;
    if (!giro) newErrors.giro = ECampo;
    if (!comuna) newErrors.comuna = ECampo;
    if (!direccion) newErrors.direccion = ECampo;

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      const empresa = {
        rut,
        razon,
        giro,
        comuna,
        direccion,
        telefono,
        correo,
        cliente: esCliente,
        proveedor: esProveedor,
        credito_cliente: creditoCliente,
        credito_proveedor: creditoProveedor,
      };

      try {
        setLoadingModal(true);
        const empresaRef = doc(db, 'empresas', rut);
        await setDoc(empresaRef, empresa);
        setLoadingModal(false);
        setEditModal(false);
        handleResetParams();
      } catch (err) {
        console.error('Error guardando empresa:', err);
        setLoadingModal(false);
        setErrorRut('Error al actualizar la empresa');
      }
    }
  };

  const handleEliminarEmpresa = async (rutEmpresa) => {
    if (!rutEmpresa) {
      setErrorRut('Debes proporcionar un RUT válido');
      return;
    }

    try {
      setLoadingModal(true);
      const empresaRef = doc(db, 'empresas', rutEmpresa);
      await deleteDoc(empresaRef);
      setLoadingModal(false);
      setEliminarModal(false);
      setEditModal(false);
      handleResetParams();
    } catch (err) {
      console.error('Error eliminando empresa:', err);
      setLoadingModal(false);
      setErrorRut('Error al eliminar la empresa');
    }
  };

  const [rows, setRows] = useState([]); // <- Aquí guardamos las filas de la "tabla"

  // Filtrar y ordenar filas
  const filteredRows = rows
    .filter((row) => {
      const term = searchTerm.toLowerCase();
      return (
        row.rut?.toLowerCase().includes(term) ||
        row.razon?.toLowerCase().includes(term) ||
        row.giro?.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Para booleanos (cliente, proveedor)
      if (typeof aValue === 'boolean') {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      } else {
        // Para strings
        aValue = (aValue || '').toLowerCase();
        bValue = (bValue || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const [showModal, setShowModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [loadingModal, setLoadingModal] = useState(false);
  const [eliminarModal, setEliminarModal] = useState(false);

  const handleModal = () => {
    setShowModal(true);
  };

  const handleEditModal = () => {
    setEditModal(true);
  };

  const handleEliminarModal = () => {
    setEliminarModal(true);
  };

  const handleResetParams = () => {
    setRut('');
    setRazon('');
    setGiro('');
    setComuna('');
    setDireccion('');
    setTelefono('');
    setCorreo('');
    setEsCliente(false);
    setEsProveedor(false);
    setCreditoCliente(0);
    setCreditoProveedor(0);
  };

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
          <H1Tittle text="Configurar clientes y proveedores" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col flex-wrap justify-start px-3 sm:px-5 py-4 overflow-x-auto">
          <TextButton
            text="Agregar empresa"
            className="h-10 px-5 bg-success hover:bg-success-hover active:bg-success-active transition-colors duration-200 mr-auto mb-4 rounded-lg"
            classNameText="font-semibold text-base text-white"
            onClick={handleModal}
          />

          {/* Tabla dinámica */}
          <Card
            hasButton={false}
            contentClassName="h-[700px] overflow-y-auto scrollbar-custom flex flex-col w-full"
            content={
              <div>
                {/* Encabezados */}
                <div
                  className={`flex font-semibold text-sm mb-3 px-2 py-2 rounded-lg ${
                    isLightTheme ? 'bg-gray-50 text-gray-600' : 'bg-white/5 text-slate-300'
                  }`}
                >
                  <div
                    className="w-[18%] text-center cursor-pointer hover:text-accent-blue transition-colors select-none flex items-center justify-center gap-1"
                    onClick={() => handleSort('rut')}
                  >
                    RUT
                    {sortColumn === 'rut' && (
                      <span className="text-accent-blue">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                  <div
                    className="w-[22%] text-center cursor-pointer hover:text-accent-blue transition-colors select-none flex items-center justify-center gap-1"
                    onClick={() => handleSort('razon')}
                  >
                    Razón social
                    {sortColumn === 'razon' && (
                      <span className="text-accent-blue">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                  <div
                    className="w-[20%] text-center cursor-pointer hover:text-accent-blue transition-colors select-none flex items-center justify-center gap-1"
                    onClick={() => handleSort('giro')}
                  >
                    Giro
                    {sortColumn === 'giro' && (
                      <span className="text-accent-blue">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                  <div
                    className="w-[12%] text-center cursor-pointer hover:text-accent-blue transition-colors select-none flex items-center justify-center gap-1"
                    onClick={() => handleSort('cliente')}
                  >
                    Cliente
                    {sortColumn === 'cliente' && (
                      <span className="text-accent-blue">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                  <div
                    className="w-[12%] text-center cursor-pointer hover:text-accent-blue transition-colors select-none flex items-center justify-center gap-1"
                    onClick={() => handleSort('proveedor')}
                  >
                    Proveedor
                    {sortColumn === 'proveedor' && (
                      <span className="text-accent-blue">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                  <div className="w-[16%] text-center">Acciones</div>
                </div>
                <div className="mb-3">
                  <SearchBar
                    placeholder="Buscar por RUT, razón social o giro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {/* Filas dinámicas */}
                {filteredRows.map((row, index) => (
                  <div
                    key={index}
                    className={`flex items-center mb-1 px-2 py-3 rounded-lg transition-colors border-b last:border-b-0 ${
                      isLightTheme
                        ? 'hover:bg-gray-50 border-gray-100'
                        : 'hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <div className="w-[18%] text-center text-sm font-medium">
                      {formatRUT(row.rut)}
                    </div>
                    <div className="w-[22%] text-center text-sm">{row.razon}</div>
                    <div
                      className={`w-[20%] text-center text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                    >
                      {row.giro}
                    </div>
                    <div className="w-[12%] flex justify-center">
                      {row.cliente ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20">
                          <svg
                            className="w-4 h-4 text-success"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-600/30">
                          <svg
                            className="w-4 h-4 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="w-[12%] flex justify-center">
                      {row.proveedor ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/20">
                          <svg
                            className="w-4 h-4 text-success"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-600/30">
                          <svg
                            className="w-4 h-4 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div className="w-[16%] flex justify-center">
                      <TextButton
                        className="py-1.5 px-4 h-8 bg-accent-blue text-white font-medium hover:bg-blue-600 active:bg-blue-700 rounded-md"
                        text="Editar"
                        onClick={() => {
                          setRut(row.rut);
                          setRazon(row.razon);
                          setGiro(row.giro);
                          setComuna(row.comuna);
                          setDireccion(row.direccion);
                          setTelefono(row.telefono);
                          setCorreo(row.correo);
                          setEsCliente(row.cliente);
                          setEsProveedor(row.proveedor);
                          setCreditoCliente(row.credito_cliente);
                          setCreditoProveedor(row.credito_proveedor);
                          handleEditModal();
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* Si no hay filas */}
                {rows.length === 0 && (
                  <div className="text-center text-gray-400 mt-4">No hay empresas ingresadas</div>
                )}

                {/* Si no hay resultados de búsqueda */}
                {rows.length > 0 && filteredRows.length === 0 && (
                  <div className="text-center text-gray-400 mt-4">
                    No se encontraron empresas con ese criterio
                  </div>
                )}
              </div>
            }
          />

          {showModal && (
            <Modal
              onClickOutside={() => setShowModal(false)}
              className="!absolute !top-20 !max-w-3xl"
            >
              <h2 className="text-xl font-bold text-center mb-6">Nueva empresa</h2>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                {/* RUT */}
                <Textfield
                  label={
                    <>
                      RUT:
                      {errors.rut && (
                        <span className="text-red-300 font-black"> - {errors.rut} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.rut && 'ring-red-400 ring-2'}
                  placeholder="99.999.999-9"
                  type="rut"
                  value={rut}
                  onChange={(e) => {
                    setRut(e.target.value);
                    setErrors((prev) => ({ ...prev, rut: undefined }));
                  }}
                />

                {/* RAZÓN SOCIAL */}
                <Textfield
                  label={
                    <>
                      Razón social:
                      {errors.razon && (
                        <span className="text-red-300 font-black"> - {errors.razon} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.razon && 'ring-red-400 ring-2'}
                  placeholder="Facto LTDA."
                  value={razon}
                  onChange={(e) => {
                    setRazon(e.target.value);
                    setErrors((prev) => ({ ...prev, razon: undefined }));
                  }}
                />

                {/* GIRO COMERCIAL */}
                <Textfield
                  label={
                    <>
                      Giro:
                      {errors.giro && (
                        <span className="text-red-300 font-black"> - {errors.giro} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.giro && 'ring-red-400 ring-2'}
                  placeholder="Prestación de soluciones informáticas"
                  value={giro}
                  onChange={(e) => {
                    setGiro(e.target.value);
                    setErrors((prev) => ({ ...prev, giro: undefined }));
                  }}
                />

                {/* COMUNA */}
                <Textfield
                  label={
                    <>
                      Comuna:
                      {errors.comuna && (
                        <span className="text-red-300 font-black"> - {errors.comuna} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.comuna && 'ring-red-400 ring-2'}
                  placeholder="Punta Arenas"
                  value={comuna}
                  onChange={(e) => {
                    setComuna(e.target.value);
                    setErrors((prev) => ({ ...prev, comuna: undefined }));
                  }}
                />

                {/* DIRECCIÓN */}
                <Textfield
                  label={
                    <>
                      Dirección:
                      {errors.direccion && (
                        <span className="text-red-300 font-black"> - {errors.direccion} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.direccion && 'ring-red-400 ring-2'}
                  placeholder="Av. España 9999"
                  value={direccion}
                  onChange={(e) => {
                    setDireccion(e.target.value);
                    setErrors((prev) => ({ ...prev, direccion: undefined }));
                  }}
                />

                {/* TELÉFONO */}
                <Textfield
                  label="Teléfono (Opcional):"
                  type="phone"
                  placeholder="912345678"
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                  }}
                />

                {/* CORREO */}
                <Textfield
                  label="Correo (Opcional):"
                  type="email"
                  placeholder="Ejemplo@ejemplo.ej"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                  }}
                />
              </div>

              <div className="border-t border-white/10 mt-6 pt-5">
                <p className="text-sm font-medium text-slate-300 mb-4">
                  Tipo de relación comercial
                </p>
                <div className="grid grid-cols-2 gap-x-8">
                  {/* CLIENTE */}
                  <CheckboxDropdown
                    label="¿Es cliente?"
                    items={[
                      <Textfield
                        label="Días de crédito:"
                        type="number"
                        classNameInput="w-20 h-8"
                        value={creditoCliente}
                        onChange={(e) => {
                          const value = Math.min(Number(e.target.value), 999);
                          setCreditoCliente(value);
                        }}
                      />,
                    ]}
                    value={esCliente}
                    onChange={(newValue) => {
                      setEsCliente(newValue);
                    }}
                  />
                  {/* PROVEEDOR */}
                  <CheckboxDropdown
                    label="¿Es Proveedor?"
                    items={[
                      <Textfield
                        label="Días de crédito:"
                        type="number"
                        value={creditoProveedor}
                        classNameInput="w-20 h-8"
                        onChange={(e) => {
                          const value = Math.min(Number(e.target.value), 999);
                          setCreditoProveedor(value);
                        }}
                      />,
                    ]}
                    value={esProveedor}
                    onChange={(newValue) => {
                      setEsProveedor(newValue);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <TextButton
                  text="Cancelar"
                  className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                  onClick={() => {
                    setShowModal(false);
                    handleResetParams();
                  }}
                />
                <TextButton
                  text="Guardar empresa"
                  className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                  onClick={handleNewEmpresa}
                />
              </div>
            </Modal>
          )}

          {editModal && (
            <Modal
              onClickOutside={() => {
                setEditModal(false);
                handleResetParams();
              }}
              className="!absolute !top-20 !max-w-3xl"
            >
              <h2 className="text-xl font-bold text-center mb-6">Editar empresa</h2>
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                {/* RUT */}
                <Textfield
                  label={
                    <>
                      RUT:
                      {errors.rut && (
                        <span className="text-red-300 font-black"> - {errors.rut} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.rut && 'ring-red-400 ring-2'}
                  placeholder="99.999.999-9"
                  type="rut"
                  value={rut}
                  onChange={(e) => {
                    setRut(e.target.value);
                    setErrors((prev) => ({ ...prev, rut: undefined }));
                  }}
                />

                {/* RAZÓN SOCIAL */}
                <Textfield
                  label={
                    <>
                      Razón social:
                      {errors.razon && (
                        <span className="text-red-300 font-black"> - {errors.razon} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.razon && 'ring-red-400 ring-2'}
                  placeholder="Facto LTDA."
                  value={razon}
                  onChange={(e) => {
                    setRazon(e.target.value);
                    setErrors((prev) => ({ ...prev, razon: undefined }));
                  }}
                />

                {/* GIRO COMERCIAL */}
                <Textfield
                  label={
                    <>
                      Giro:
                      {errors.giro && (
                        <span className="text-red-300 font-black"> - {errors.giro} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.giro && 'ring-red-400 ring-2'}
                  placeholder="Prestación de soluciones informáticas"
                  value={giro}
                  onChange={(e) => {
                    setGiro(e.target.value);
                    setErrors((prev) => ({ ...prev, giro: undefined }));
                  }}
                />

                {/* COMUNA */}
                <Textfield
                  label={
                    <>
                      Comuna:
                      {errors.comuna && (
                        <span className="text-red-300 font-black"> - {errors.comuna} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.comuna && 'ring-red-400 ring-2'}
                  placeholder="Punta Arenas"
                  value={comuna}
                  onChange={(e) => {
                    setComuna(e.target.value);
                    setErrors((prev) => ({ ...prev, comuna: undefined }));
                  }}
                />

                {/* DIRECCIÓN */}
                <Textfield
                  label={
                    <>
                      Dirección:
                      {errors.direccion && (
                        <span className="text-red-300 font-black"> - {errors.direccion} </span>
                      )}
                    </>
                  }
                  classNameInput={errors.direccion && 'ring-red-400 ring-2'}
                  placeholder="Av. España 9999"
                  value={direccion}
                  onChange={(e) => {
                    setDireccion(e.target.value);
                    setErrors((prev) => ({ ...prev, direccion: undefined }));
                  }}
                />

                {/* TELÉFONO */}
                <Textfield
                  label="Teléfono (Opcional):"
                  type="phone"
                  placeholder="912345678"
                  value={telefono}
                  onChange={(e) => {
                    setTelefono(e.target.value);
                  }}
                />

                {/* CORREO */}
                <Textfield
                  label="Correo (Opcional):"
                  type="email"
                  placeholder="Ejemplo@ejemplo.ej"
                  value={correo}
                  onChange={(e) => {
                    setCorreo(e.target.value);
                  }}
                />
              </div>

              <div className="border-t border-white/10 mt-6 pt-5">
                <p className="text-sm font-medium text-slate-300 mb-4">
                  Tipo de relación comercial
                </p>
                <div className="grid grid-cols-2 gap-x-8">
                  {/* CLIENTE */}
                  <CheckboxDropdown
                    label="¿Es cliente?"
                    items={[
                      <Textfield
                        label="Días de crédito:"
                        type="number"
                        classNameInput="w-20 h-8"
                        value={creditoCliente}
                        onChange={(e) => {
                          const value = Math.min(Number(e.target.value), 999);
                          setCreditoCliente(value);
                        }}
                      />,
                    ]}
                    value={esCliente}
                    onChange={(newValue) => {
                      setEsCliente(newValue);
                    }}
                  />
                  {/* PROVEEDOR */}
                  <CheckboxDropdown
                    label="¿Es Proveedor?"
                    items={[
                      <Textfield
                        label="Días de crédito:"
                        type="number"
                        value={creditoProveedor}
                        classNameInput="w-20 h-8"
                        onChange={(e) => {
                          const value = Math.min(Number(e.target.value), 999);
                          setCreditoProveedor(value);
                        }}
                      />,
                    ]}
                    value={esProveedor}
                    onChange={(newValue) => {
                      setEsProveedor(newValue);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t border-white/10">
                <TextButton
                  text="Eliminar empresa"
                  className="px-4 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-lg"
                  onClick={handleEliminarModal}
                />
                <div className="flex gap-3">
                  <TextButton
                    text="Cancelar"
                    className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-lg"
                    onClick={() => {
                      handleResetParams();
                      setEditModal(false);
                    }}
                  />
                  <TextButton
                    text="Guardar cambios"
                    className="px-5 py-2 bg-success text-white font-medium hover:bg-success-hover active:bg-success-active rounded-lg"
                    onClick={handleEditEmpresa}
                  />
                </div>
              </div>
            </Modal>
          )}

          {eliminarModal && (
            <Modal onClickOutside={() => setEliminarModal(false)} className="!max-w-md">
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
                <h3 className="text-xl font-bold mb-2">Eliminar empresa</h3>
                <p className="text-slate-300 text-sm mb-2">
                  ¿Está seguro que desea eliminar esta empresa?
                </p>
                <p className="text-danger text-sm font-medium mb-6">
                  Todos los documentos asociados serán eliminados permanentemente.
                </p>
                <div className="flex justify-center gap-4">
                  <TextButton
                    text="Cancelar"
                    className="px-5 py-2 bg-slate-600 text-white font-medium hover:bg-slate-500 active:bg-slate-700 rounded-full"
                    onClick={() => setEliminarModal(false)}
                  />
                  <TextButton
                    text="Eliminar"
                    className="px-5 py-2 bg-danger text-white font-medium hover:bg-danger-hover active:bg-danger-active rounded-full"
                    onClick={() => handleEliminarEmpresa(rut)}
                  />
                </div>
              </div>
            </Modal>
          )}

          <AlertModal
            isOpen={!!errorRut}
            onClose={() => setErrorRut('')}
            title="Error"
            message={errorRut}
            variant="error"
          />

          <LoadingModal isOpen={loadingModal} message="Procesando..." />
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default RProcesar;
