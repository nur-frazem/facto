import { SidebarWithContentSeparator } from "../../components/sidebar";
import React, { useState, useEffect } from "react";
import Footer from "../../components/Footer";
import { H1Tittle } from "../../components/Fonts";
import { useNavigate } from "react-router-dom";
import { VolverButton } from "../../components/Button";
import { DatepickerField } from "../../components/Textfield";
import { Card } from "../../components/Container";
import { Modal, LoadingModal } from "../../components/modal";
import { useTheme } from "../../context/ThemeContext";

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

import { formatRUT } from "../../utils/formatRUT";
import { formatCLP } from "../../utils/formatCurrency";

// Labels for document types
const TIPO_DOC_LABELS = {
  facturas: "Factura",
  facturasExentas: "Factura Exenta",
  notasCredito: "Nota de Crédito",
  boletas: "Boleta"
};

// Labels for action types
const TIPO_ACCION_LABELS = {
  eliminacion: "Eliminado",
  edicion: "Editado",
  creacion: "Creado",
  pago: "Procesado",
  revinculacion: "Revinculado",
  reversion_pago: "Reversión"
};

// Labels for reversal sub-actions
const REVERSION_ACCION_LABELS = {
  revertir: "Pago revertido",
  eliminar_todo: "Pago y documentos eliminados",
  parcial: "Reversión parcial"
};

const CAuditoria = () => {
  const navigate = useNavigate();
  const { isLightTheme } = useTheme();

  // State
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModal, setDetailModal] = useState(false);

  // Format time from ISO string
  const formatTime = (isoString) => {
    if (!isoString) return "--:--:--";
    const date = new Date(isoString);
    return date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  };

  // Format date for display
  const formatDate = (isoString) => {
    if (!isoString) return "--/--/----";
    const date = new Date(isoString);
    return date.toLocaleDateString("es-CL");
  };

  // Get date string for comparison (YYYY-MM-DD)
  const getDateString = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Fetch logs when date changes
  useEffect(() => {
    const fetchLogs = async () => {
      if (!fechaSeleccionada) {
        setLogs([]);
        return;
      }

      setLoading(true);
      try {
        const auditoriaRef = collection(db, "auditoria");
        const querySnapshot = await getDocs(auditoriaRef);

        const selectedDateStr = getDateString(fechaSeleccionada);

        // Filter logs by date and sort by time
        const filteredLogs = querySnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(log => {
            const logDate = log.fechaEliminacion || log.fechaEdicion || log.fechaProceso || log.fechaRevinculacion || log.fechaReversion || log.fechaCreacion || log.fecha;
            if (!logDate) return false;
            return getDateString(logDate) === selectedDateStr;
          })
          .sort((a, b) => {
            const dateA = new Date(a.fechaEliminacion || a.fechaEdicion || a.fechaProceso || a.fechaRevinculacion || a.fechaReversion || a.fechaCreacion || a.fecha);
            const dateB = new Date(b.fechaEliminacion || b.fechaEdicion || b.fechaProceso || b.fechaRevinculacion || b.fechaReversion || b.fechaCreacion || b.fecha);
            return dateB - dateA; // Most recent first
          });

        setLogs(filteredLogs);
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [fechaSeleccionada]);

  // Get action label
  const getAccionLabel = (log) => {
    return TIPO_ACCION_LABELS[log.tipo] || log.tipo || "Acción";
  };

  // Get document type label
  const getTipoDocLabel = (tipoDoc) => {
    return TIPO_DOC_LABELS[tipoDoc] || tipoDoc || "Documento";
  };

  // Get timestamp from log
  const getLogTimestamp = (log) => {
    return log.fechaEliminacion || log.fechaEdicion || log.fechaProceso || log.fechaRevinculacion || log.fechaReversion || log.fechaCreacion || log.fecha;
  };

  // Handle row click
  const handleRowClick = (log) => {
    setSelectedLog(log);
    setDetailModal(true);
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
            <VolverButton onClick={() => navigate("/configuracion-index")} />
          </div>
          <H1Tittle text="Auditoría" />
        </div>

        {/* Contenido principal */}
        <div className="flex-1 flex flex-col px-4 py-6">
          {/* Date picker */}
          <div className="flex justify-center mb-6">
            <div className="w-64">
              <DatepickerField
                label="Seleccionar fecha"
                selectedDate={fechaSeleccionada}
                onChange={setFechaSeleccionada}
              />
            </div>
          </div>

          {/* Logs list */}
          <div className="flex-1 flex flex-col items-center">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-accent-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !fechaSeleccionada ? (
              <div className="text-slate-400 text-center py-8">
                Seleccione una fecha para ver los registros de auditoría
              </div>
            ) : logs.length === 0 ? (
              <div className="text-slate-400 text-center py-8">
                No hay registros de auditoría para la fecha seleccionada
              </div>
            ) : (
              <div className="w-full max-w-4xl">
                <div className={`rounded-xl overflow-hidden flex flex-col max-h-[60vh] ${
                  isLightTheme
                    ? 'bg-white border border-gray-200 shadow-md'
                    : 'bg-surface-light border border-white/10'
                }`}>
                  {/* Header */}
                  <div className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm font-medium border-b flex-shrink-0 ${
                    isLightTheme
                      ? 'bg-gray-50 text-gray-600 border-gray-200'
                      : 'bg-surface-dark text-slate-300 border-white/10'
                  }`}>
                    <div className="col-span-2">Hora</div>
                    <div className="col-span-2">Acción</div>
                    <div className="col-span-3">Documento</div>
                    <div className="col-span-3">Empresa</div>
                    <div className="col-span-2">Usuario</div>
                  </div>

                  {/* Rows */}
                  <div className={`overflow-y-auto scrollbar-custom flex-1 ${
                    isLightTheme ? 'divide-y divide-gray-100' : 'divide-y divide-white/5'
                  }`}>
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => handleRowClick(log)}
                        className={`grid grid-cols-12 gap-2 px-4 py-3 text-sm cursor-pointer transition-colors ${
                          isLightTheme
                            ? 'text-gray-800 hover:bg-gray-50'
                            : 'text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="col-span-2 font-mono text-accent-blue">
                          {formatTime(getLogTimestamp(log))}
                        </div>
                        <div className="col-span-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            log.tipo === "eliminacion" ? "bg-danger/20 text-danger" :
                            log.tipo === "edicion" ? (isLightTheme ? "bg-yellow-100 text-yellow-700" : "bg-yellow-500/20 text-yellow-400") :
                            log.tipo === "pago" ? "bg-success/20 text-success" :
                            log.tipo === "revinculacion" ? (isLightTheme ? "bg-purple-100 text-purple-700" : "bg-purple-500/20 text-purple-400") :
                            log.tipo === "reversion_pago" ? (isLightTheme ? "bg-orange-100 text-orange-700" : "bg-orange-500/20 text-orange-400") :
                            log.tipo === "creacion" ? "bg-accent-blue/20 text-accent-blue" :
                            "bg-primary/20 text-primary"
                          }`}>
                            {getAccionLabel(log)}
                          </span>
                        </div>
                        <div className="col-span-3 truncate">
                          {log.tipo === "reversion_pago"
                            ? `Egreso #${log.numeroEgreso || "--"}`
                            : `${getTipoDocLabel(log.tipoDocumento)} #${log.numeroDocumento}`
                          }
                        </div>
                        <div className={`col-span-3 truncate ${isLightTheme ? 'text-gray-600' : 'text-slate-300'}`}>
                          {log.empresaRut ? formatRUT(log.empresaRut) : "--"}
                        </div>
                        <div className={`col-span-2 truncate ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                          {(log.eliminadoPor || log.editadoPor || log.procesadoPor || log.revinculadoPor || log.reversadoPor || log.creadoPor || log.usuario || "").split("@")[0]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`text-center text-sm mt-4 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                  {logs.length} registro{logs.length !== 1 ? "s" : ""} encontrado{logs.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* Detail Modal */}
      {detailModal && selectedLog && (
        <Modal
          onClickOutside={() => {
            setDetailModal(false);
            setSelectedLog(null);
          }}
          className="min-w-[400px]"
        >
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>Detalle de Auditoría</h2>
            <button
              onClick={() => {
                setDetailModal(false);
                setSelectedLog(null);
              }}
              className={`p-1 rounded-lg transition-colors ${isLightTheme ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
            >
              <svg className={`w-5 h-5 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className={`space-y-4 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
            {/* Action info */}
            <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-xs mb-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Acción</div>
                  <div className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    selectedLog.tipo === "eliminacion" ? "bg-danger/20 text-danger" :
                    selectedLog.tipo === "edicion" ? "bg-yellow-500/20 text-yellow-400" :
                    selectedLog.tipo === "pago" ? "bg-success/20 text-success" :
                    selectedLog.tipo === "revinculacion" ? "bg-purple-500/20 text-purple-400" :
                    selectedLog.tipo === "reversion_pago" ? "bg-orange-500/20 text-orange-400" :
                    selectedLog.tipo === "creacion" ? "bg-accent-blue/20 text-accent-blue" :
                    "bg-primary/20 text-primary"
                  }`}>
                    {getAccionLabel(selectedLog)}
                  </div>
                </div>
                <div>
                  <div className={`text-xs mb-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Fecha y Hora</div>
                  <div className="font-mono">
                    {formatDate(getLogTimestamp(selectedLog))} {formatTime(getLogTimestamp(selectedLog))}
                  </div>
                </div>
              </div>
            </div>

            {/* Document info - Regular documents */}
            {selectedLog.tipo !== "reversion_pago" && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Documento</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Tipo</div>
                    <div>{getTipoDocLabel(selectedLog.tipoDocumento)}</div>
                  </div>
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Número</div>
                    <div className="font-mono">{selectedLog.numeroDocumento}</div>
                  </div>
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Empresa (RUT)</div>
                    <div>{selectedLog.empresaRut ? formatRUT(selectedLog.empresaRut) : "--"}</div>
                  </div>
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Usuario</div>
                    <div className="truncate">
                      {selectedLog.eliminadoPor || selectedLog.editadoPor || selectedLog.procesadoPor || selectedLog.revinculadoPor || selectedLog.creadoPor || selectedLog.usuario || "--"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Egreso info - Reversion pago */}
            {selectedLog.tipo === "reversion_pago" && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Egreso</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>N° Egreso</div>
                    <div className={`font-mono ${isLightTheme ? 'text-orange-600' : 'text-orange-400'}`}>{selectedLog.numeroEgreso || "--"}</div>
                  </div>
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Total del Egreso</div>
                    <div>{selectedLog.totalEgreso ? formatCLP(selectedLog.totalEgreso) : "--"}</div>
                  </div>
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Tipo de Acción</div>
                    <div className={isLightTheme ? 'text-orange-600' : 'text-orange-400'}>
                      {REVERSION_ACCION_LABELS[selectedLog.accion] || selectedLog.accion || "--"}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Usuario</div>
                    <div className="truncate">
                      {selectedLog.reversadoPor || "--"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Creation data preview (if creation) */}
            {selectedLog.tipo === "creacion" && selectedLog.datos && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Datos del documento creado</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLog.datos.total !== undefined && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Total</div>
                      <div>{formatCLP(selectedLog.datos.total)}</div>
                    </div>
                  )}
                  {selectedLog.datos.neto !== undefined && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Neto</div>
                      <div>{formatCLP(selectedLog.datos.neto)}</div>
                    </div>
                  )}
                  {selectedLog.datos.estado && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Estado</div>
                      <div className="capitalize">{selectedLog.datos.estado}</div>
                    </div>
                  )}
                  {selectedLog.datos.formaPago && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Forma de Pago</div>
                      <div>{selectedLog.datos.formaPago}</div>
                    </div>
                  )}
                  {selectedLog.datos.documentoVinculado && (
                    <div className="col-span-2">
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Vinculado a</div>
                      <div>{selectedLog.datos.documentoVinculado.tipo} #{selectedLog.datos.documentoVinculado.numero}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Deleted data preview (if elimination) */}
            {selectedLog.tipo === "eliminacion" && selectedLog.datosEliminados && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Datos del documento eliminado</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLog.datosEliminados.total && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Total</div>
                      <div>{formatCLP(selectedLog.datosEliminados.total)}</div>
                    </div>
                  )}
                  {selectedLog.datosEliminados.estado && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Estado</div>
                      <div className="capitalize">{selectedLog.datosEliminados.estado}</div>
                    </div>
                  )}
                  {selectedLog.datosEliminados.formaPago && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Forma de Pago</div>
                      <div>{selectedLog.datosEliminados.formaPago}</div>
                    </div>
                  )}
                  {selectedLog.datosEliminados.ingresoUsuario && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Ingresado por</div>
                      <div className="truncate">{selectedLog.datosEliminados.ingresoUsuario}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Edit changes preview (if edition) */}
            {selectedLog.tipo === "edicion" && selectedLog.cambios && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Cambios realizados</div>
                <div className="space-y-2 text-sm">
                  {selectedLog.cambios.numeroDoc && String(selectedLog.cambios.numeroDoc.anterior) !== String(selectedLog.cambios.numeroDoc.nuevo) && (
                    <div className="flex items-center gap-2">
                      <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>N° Doc:</span>
                      <span className="text-danger line-through">{selectedLog.cambios.numeroDoc.anterior}</span>
                      <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>→</span>
                      <span className="text-success">{selectedLog.cambios.numeroDoc.nuevo}</span>
                    </div>
                  )}
                  {selectedLog.cambios.total && String(selectedLog.cambios.total.anterior) !== String(selectedLog.cambios.total.nuevo) && (
                    <div className="flex items-center gap-2">
                      <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>Total:</span>
                      <span className="text-danger line-through">{formatCLP(selectedLog.cambios.total.anterior)}</span>
                      <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>→</span>
                      <span className="text-success">{formatCLP(selectedLog.cambios.total.nuevo)}</span>
                    </div>
                  )}
                  {selectedLog.cambios.neto && String(selectedLog.cambios.neto.anterior) !== String(selectedLog.cambios.neto.nuevo) && (
                    <div className="flex items-center gap-2">
                      <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>Neto:</span>
                      <span className="text-danger line-through">{formatCLP(selectedLog.cambios.neto.anterior)}</span>
                      <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>→</span>
                      <span className="text-success">{formatCLP(selectedLog.cambios.neto.nuevo)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment details (if payment) */}
            {selectedLog.tipo === "pago" && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Detalles del pago</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLog.numeroEgreso && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>N° Egreso</div>
                      <div className="font-mono text-accent-blue">{selectedLog.numeroEgreso}</div>
                    </div>
                  )}
                  {selectedLog.total && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Total</div>
                      <div>{formatCLP(selectedLog.total)}</div>
                    </div>
                  )}
                  {selectedLog.fechaPago && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Fecha de Pago</div>
                      <div>{formatDate(selectedLog.fechaPago)}</div>
                    </div>
                  )}
                  {selectedLog.procesadoPor && (
                    <div>
                      <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Procesado por</div>
                      <div className="truncate">{selectedLog.procesadoPor}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Revinculacion details (if revinculacion) */}
            {selectedLog.tipo === "revinculacion" && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Detalles de la revinculación</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedLog.documentoDestino && (
                    <>
                      <div>
                        <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Documento destino</div>
                        <div className={`font-mono ${isLightTheme ? 'text-purple-600' : 'text-purple-400'}`}>
                          {getTipoDocLabel(selectedLog.documentoDestino.tipo)} #{selectedLog.documentoDestino.numero}
                        </div>
                      </div>
                      <div>
                        <div className={`text-xs ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Revinculado por</div>
                        <div className="truncate">{selectedLog.revinculadoPor || "--"}</div>
                      </div>
                    </>
                  )}
                </div>
                {selectedLog.notasCreditoRevinculadas && selectedLog.notasCreditoRevinculadas.length > 0 && (
                  <div className="mt-3">
                    <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>Notas de crédito revinculadas</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedLog.notasCreditoRevinculadas.map((nc, idx) => (
                        <span key={idx} className={`px-2 py-1 text-sm rounded ${isLightTheme ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-400'}`}>
                          NC #{nc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reversion pago details - Documents affected */}
            {selectedLog.tipo === "reversion_pago" && selectedLog.documentosAfectados && selectedLog.documentosAfectados.length > 0 && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                  Documentos afectados ({selectedLog.documentosAfectados.length})
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>Revertidos: </span>
                    <span className="text-success">{selectedLog.documentosRevertidos || 0}</span>
                  </div>
                  <div>
                    <span className={isLightTheme ? 'text-gray-400' : 'text-slate-500'}>Eliminados: </span>
                    <span className="text-danger">{selectedLog.documentosEliminados || 0}</span>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto scrollbar-custom space-y-1">
                  {selectedLog.documentosAfectados.map((doc, idx) => {
                    const docId = `${doc.rut}-${doc.tipoDoc}-${doc.numeroDoc}`;
                    const wasDeleted = selectedLog.accion === "eliminar_todo" ||
                      (selectedLog.accion === "parcial" &&
                        selectedLog.documentosEliminadosDetalle?.some(d =>
                          d.rut === doc.rut && d.tipoDoc === doc.tipoDoc && d.numeroDoc === doc.numeroDoc
                        ));
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2 py-1 rounded ${
                          wasDeleted ? "bg-danger/10" : "bg-success/10"
                        }`}
                      >
                        <span className={wasDeleted ? "text-danger" : "text-success"}>
                          {getTipoDocLabel(doc.tipoDoc)} #{doc.numeroDoc}
                        </span>
                        <span className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                          {formatRUT(doc.rut)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description for reversion_pago */}
            {selectedLog.tipo === "reversion_pago" && selectedLog.descripcion && (
              <div className={`rounded-lg p-3 ${isLightTheme ? 'bg-orange-50 border border-orange-200' : 'bg-orange-500/10 border border-orange-500/30'}`}>
                <div className={`text-sm ${isLightTheme ? 'text-orange-700' : 'text-orange-400'}`}>
                  {selectedLog.descripcion}
                </div>
              </div>
            )}

            {/* Cascade deletion info */}
            {selectedLog.motivoEliminacion && (
              <div className={`rounded-lg p-3 ${isLightTheme ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                <div className={`text-sm ${isLightTheme ? 'text-yellow-700' : 'text-yellow-400'}`}>
                  {selectedLog.motivoEliminacion}
                </div>
              </div>
            )}

            {/* NC list if factura with notas de crédito eliminadas */}
            {selectedLog.notasCreditoEliminadas && selectedLog.notasCreditoEliminadas.length > 0 && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Notas de crédito eliminadas en cascada</div>
                <div className="flex flex-wrap gap-2">
                  {selectedLog.notasCreditoEliminadas.map((nc, idx) => (
                    <span key={idx} className={`px-2 py-1 text-sm rounded ${isLightTheme ? 'bg-red-100 text-red-700' : 'bg-danger/20 text-danger'}`}>
                      NC #{nc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* NC list if factura deleted with notas de crédito revinculadas */}
            {selectedLog.tipo === "eliminacion" && selectedLog.notasCreditoRevinculadas && selectedLog.notasCreditoRevinculadas.length > 0 && (
              <div className={`rounded-lg p-4 ${isLightTheme ? 'bg-gray-100' : 'bg-surface-dark'}`}>
                <div className={`text-xs mb-2 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Notas de crédito revinculadas a otro documento</div>
                <div className="flex flex-wrap gap-2">
                  {selectedLog.notasCreditoRevinculadas.map((nc, idx) => (
                    <span key={idx} className={`px-2 py-1 text-sm rounded ${isLightTheme ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/20 text-purple-400'}`}>
                      NC #{nc}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Loading Modal */}
      {loading && <LoadingModal />}
    </div>
  );
};

export default CAuditoria;
