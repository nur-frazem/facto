import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { VolverButton } from '../../components/Button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { formatCLP } from '../../utils/formatCurrency';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import {
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentPlusIcon,
  CogIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';

// Helper to get month name in Spanish
const getMonthName = (date) => {
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
};

// Helper to get short month name
const getShortMonthName = (date) => {
  return date.toLocaleDateString('es-CL', { month: 'short' });
};

// Stat Card Component (compact version)
const StatCard = ({ icon: Icon, title, value, subvalue, color, isLightTheme }) => {
  const colorClasses = {
    blue: isLightTheme
      ? 'from-blue-100 to-blue-50 border-blue-300'
      : 'from-blue-500/20 to-blue-600/5 border-blue-500/30',
    yellow: isLightTheme
      ? 'from-yellow-100 to-yellow-50 border-yellow-300'
      : 'from-yellow-500/20 to-yellow-600/5 border-yellow-500/30',
    green: isLightTheme
      ? 'from-green-100 to-green-50 border-green-300'
      : 'from-green-500/20 to-green-600/5 border-green-500/30',
    red: isLightTheme
      ? 'from-red-100 to-red-50 border-red-300'
      : 'from-red-500/20 to-red-600/5 border-red-500/30',
  };

  const iconColorClasses = {
    blue: isLightTheme ? 'text-blue-600' : 'text-blue-400',
    yellow: isLightTheme ? 'text-yellow-600' : 'text-yellow-400',
    green: isLightTheme ? 'text-green-600' : 'text-green-400',
    red: isLightTheme ? 'text-red-600' : 'text-red-400',
  };

  return (
    <div
      className={`
        bg-gradient-to-br ${colorClasses[color]}
        border ${isLightTheme ? '' : 'border-white/10'}
        rounded-xl p-3
        flex flex-col gap-1
      `}
    >
      <div className="flex items-center justify-between">
        <Icon className={`w-4 h-4 ${iconColorClasses[color]}`} />
        <span className={`text-xs uppercase tracking-wide ${isLightTheme ? 'text-gray-600' : 'text-slate-400'}`}>{title}</span>
      </div>
      <div className={`text-xl font-bold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>{value}</div>
      {subvalue && <div className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>{subvalue}</div>}
    </div>
  );
};

// Quick Action Button Component (balanced version)
const QuickActionButton = ({ icon: Icon, title, onClick, disabled, isLightTheme }) => {
  if (disabled) return null;

  return (
    <button
      onClick={onClick}
      className={`
        ${isLightTheme
          ? 'bg-white border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300'
          : 'bg-gradient-card border-white/5 hover:bg-white/5 hover:border-white/10'
        }
        border
        rounded-xl px-5 py-3
        flex items-center gap-3
        transition-all duration-200
        group
      `}
    >
      <Icon className={`w-6 h-6 transition-colors ${
        isLightTheme
          ? 'text-gray-500 group-hover:text-gray-800'
          : 'text-slate-400 group-hover:text-white'
      }`} />
      <span className={`text-sm font-medium transition-colors ${
        isLightTheme
          ? 'text-gray-600 group-hover:text-gray-800'
          : 'text-slate-300 group-hover:text-white'
      }`}>
        {title}
      </span>
    </button>
  );
};

// Custom Tooltip for Chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-lg p-2 shadow-lg">
        <p className="text-white text-sm font-medium capitalize">{label}</p>
        <p className="text-sm text-green-400">Neto: {formatCLP(payload[0]?.value || 0)}</p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Provider Chart
const ProviderTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800 border border-white/10 rounded-lg p-2 shadow-lg max-w-[200px]">
        <p className="text-white text-xs font-medium truncate">{payload[0]?.payload?.name}</p>
        <p className="text-sm text-blue-400">{formatCLP(payload[0]?.value || 0)}</p>
        <p className="text-xs text-slate-400">{payload[0]?.payload?.docs} documentos</p>
      </div>
    );
  }
  return null;
};

// Document types configuration (outside component to avoid recreating on each render)
const DOC_TYPES = [
  { subcol: 'facturas', tipo: 'Factura', isAdditive: true },
  { subcol: 'facturasExentas', tipo: 'Factura Exenta', isAdditive: true },
  { subcol: 'boletas', tipo: 'Boleta', isAdditive: true },
  { subcol: 'notasCredito', tipo: 'Nota de Crédito', isAdditive: false },
];

// Cache configuration (outside component)
const CACHE_KEY = 'recepcion_documents_cache';
const CACHE_TIMESTAMP_KEY = 'recepcion_cache_timestamp';
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

const RIndex = () => {
  const navigate = useNavigate();
  const { tienePermiso } = useAuth();
  const { isLightTheme } = useTheme();

  // Permissions
  const puedeIngresar = tienePermiso('INGRESAR_DOCUMENTOS');
  const puedeProcesar = tienePermiso('PROCESAR_PAGOS');
  const puedeVerDocumentos = tienePermiso('VER_DOCUMENTOS');
  const puedeVerCalendario = tienePermiso('VER_CALENDARIO');

  // State for current month view
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  // Chart container refs and dimensions
  const chartContainerRef = useRef(null);
  const providerChartRef = useRef(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const [providerChartDimensions, setProviderChartDimensions] = useState({ width: 0, height: 0 });

  // State for document data
  const [allDocuments, setAllDocuments] = useState([]);
  const [lastRefreshTime, setLastRefreshTime] = useState(() => {
    // Initialize from localStorage if available
    const cached = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    return cached ? parseInt(cached, 10) : 0;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const initialLoadDone = useRef(false);

  // Update current time every second for smooth countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate cooldown remaining (derived value, always accurate)
  const refreshCooldown = lastRefreshTime > 0
    ? Math.max(0, Math.ceil((REFRESH_COOLDOWN_MS - (currentTime - lastRefreshTime)) / 1000))
    : 0;

  // Fetch all documents from all companies (optimized with parallel fetching and date filtering)
  const fetchAllDocuments = useCallback(async (isManualRefresh = false) => {
    // Check cooldown for manual refresh
    if (isManualRefresh) {
      const timeSinceLastRefresh = Date.now() - lastRefreshTime;
      if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS) {
        return; // Still on cooldown, UI will show remaining time
      }
    }

    setLoading(true);
    try {
      const empresasRef = collection(db, 'empresas');
      const empresasSnapshot = await getDocs(empresasRef);

      // Filter providers first
      const proveedores = empresasSnapshot.docs.filter(doc => doc.data().proveedor);

      // Calculate 6 months ago for date filtering (covers charts + export needs)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      sixMonthsAgo.setDate(1); // Start of that month
      sixMonthsAgo.setHours(0, 0, 0, 0);
      const sixMonthsAgoTimestamp = Timestamp.fromDate(sixMonthsAgo);

      // Create all fetch promises in parallel (instead of sequential for loops)
      const fetchPromises = proveedores.flatMap(empresaDoc => {
        const empresaData = empresaDoc.data();
        const rut = empresaDoc.id;

        return DOC_TYPES.map(async (docType) => {
          const docsRef = collection(db, 'empresas', rut, docType.subcol);
          // Query only documents from the last 6 months
          const docsQuery = query(docsRef, where('fechaE', '>=', sixMonthsAgoTimestamp));
          const docsSnapshot = await getDocs(docsQuery);

          return docsSnapshot.docs.map(doc => ({
            ...doc.data(),
            rut,
            razon: empresaData.razon,
            tipoDoc: docType.tipo,
            isAdditive: docType.isAdditive,
            id: doc.id,
          }));
        });
      });

      // Execute all fetches in parallel
      const results = await Promise.all(fetchPromises);
      const allDocs = results.flat();

      setAllDocuments(allDocs);

      // Save to cache
      const now = Date.now();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(allDocs));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());
      } catch (e) {
        console.warn('Could not save to cache:', e);
      }

      setLastRefreshTime(now);
    } catch (error) {
      // Ignore permission errors during logout
      if (error.code === 'permission-denied') return;
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [lastRefreshTime]);

  // Load cached data on mount or fetch fresh data
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const loadCachedData = () => {
      try {
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        const cachedData = localStorage.getItem(CACHE_KEY);

        if (cachedTimestamp && cachedData) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const age = Date.now() - timestamp;

          // If cache is still valid (less than 30 minutes old)
          if (age < CACHE_DURATION_MS) {
            const parsedData = JSON.parse(cachedData);
            setAllDocuments(parsedData);
            setLastRefreshTime(timestamp);
            setLoading(false);
            return true; // Cache was valid and loaded
          }
        }
      } catch (error) {
        console.error('Error loading cache:', error);
      }
      return false; // No valid cache
    };

    const cacheLoaded = loadCachedData();
    if (!cacheLoaded) {
      fetchAllDocuments();
    }
  }, [fetchAllDocuments]);

  // Measure chart containers when available
  useEffect(() => {
    const measureContainers = () => {
      if (chartContainerRef.current) {
        const { width, height } = chartContainerRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setChartDimensions({ width, height });
        }
      }
      if (providerChartRef.current) {
        const { width, height } = providerChartRef.current.getBoundingClientRect();
        if (width > 0 && height > 0) {
          setProviderChartDimensions({ width, height });
        }
      }
    };

    const timeoutId = setTimeout(measureContainers, 150);
    window.addEventListener('resize', measureContainers);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', measureContainers);
    };
  }, [loading]);

  // Filter documents for a specific month
  const getDocumentsForMonth = useCallback(
    (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();

      return allDocuments.filter((doc) => {
        if (!doc.fechaE) return false;
        const docDate = new Date(doc.fechaE.seconds * 1000);
        return docDate.getFullYear() === year && docDate.getMonth() === month;
      });
    },
    [allDocuments]
  );

  // Calculate stats for current month
  const currentMonthDocs = getDocumentsForMonth(currentDate);

  const stats = useMemo(() => ({
    total: currentMonthDocs.length,
    pendiente: currentMonthDocs.filter((d) => d.estado === 'pendiente'),
    pagado: currentMonthDocs.filter((d) => d.estado === 'pagado'),
    vencido: currentMonthDocs.filter((d) => d.estado === 'vencido'),
  }), [currentMonthDocs]);

  // Calculate totals (facturas/boletas add, notas de crédito subtract)
  const calculateTotal = useCallback((docs) => {
    return docs.reduce((acc, doc) => {
      const amount = doc.total || 0;
      return acc + (doc.isAdditive ? amount : -amount);
    }, 0);
  }, []);

  const totalPendiente = calculateTotal(stats.pendiente);
  const totalPagado = calculateTotal(stats.pagado);
  const totalVencido = calculateTotal(stats.vencido);

  // Get data for last 6 months chart - now only showing NET
  const getMonthlyChartData = useCallback(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthDocs = getDocumentsForMonth(date);

      const facturas = monthDocs.filter((d) => d.isAdditive);
      const notasCredito = monthDocs.filter((d) => !d.isAdditive);

      const totalFacturas = facturas.reduce((acc, d) => acc + (d.total || 0), 0);
      const totalNC = notasCredito.reduce((acc, d) => acc + (d.total || 0), 0);

      data.push({
        name: getShortMonthName(date),
        neto: totalFacturas - totalNC,
      });
    }
    return data;
  }, [currentDate, getDocumentsForMonth]);

  // Get document type distribution for current month
  const getTypeDistribution = useCallback(() => {
    const typeCounts = {};
    currentMonthDocs.forEach((doc) => {
      if (!typeCounts[doc.tipoDoc]) {
        typeCounts[doc.tipoDoc] = { count: 0, total: 0, isAdditive: doc.isAdditive };
      }
      typeCounts[doc.tipoDoc].count++;
      typeCounts[doc.tipoDoc].total += doc.total || 0;
    });

    return Object.entries(typeCounts)
      .map(([tipo, data]) => ({
        name: tipo,
        cantidad: data.count,
        total: data.total,
        isAdditive: data.isAdditive,
      }))
      .sort((a, b) => b.total - a.total);
  }, [currentMonthDocs]);

  const monthlyData = getMonthlyChartData();
  const typeDistribution = getTypeDistribution();

  // Get provider spending data for current month (top 8)
  const getProviderData = useCallback(() => {
    const providerTotals = {};

    currentMonthDocs.forEach((doc) => {
      const providerName = doc.razon || doc.rut;
      if (!providerTotals[providerName]) {
        providerTotals[providerName] = { total: 0, docs: 0 };
      }
      const amount = doc.total || 0;
      providerTotals[providerName].total += doc.isAdditive ? amount : -amount;
      providerTotals[providerName].docs++;
    });

    return Object.entries(providerTotals)
      .map(([name, data]) => ({
        name: name.length > 25 ? name.substring(0, 25) + '...' : name,
        fullName: name,
        neto: data.total,
        docs: data.docs,
      }))
      .sort((a, b) => b.neto - a.neto); // No limit - show all providers
  }, [currentMonthDocs]);

  const providerData = getProviderData();

  // Export to Excel function
  const exportToExcel = useCallback(() => {
    const workbook = XLSX.utils.book_new();
    const monthName = getMonthName(currentDate);

    // Sheet 1: Resumen General
    const resumenData = [
      ['Resumen de Recepción de Documentos'],
      ['Período:', monthName],
      ['Fecha de exportación:', new Date().toLocaleDateString('es-CL')],
      [],
      ['Estadísticas Generales'],
      ['Concepto', 'Cantidad', 'Monto'],
      ['Total Documentos', stats.total, calculateTotal(currentMonthDocs)],
      ['Facturas/Boletas', currentMonthDocs.filter(d => d.isAdditive).length, currentMonthDocs.filter(d => d.isAdditive).reduce((acc, d) => acc + (d.total || 0), 0)],
      ['Notas de Crédito', currentMonthDocs.filter(d => !d.isAdditive).length, currentMonthDocs.filter(d => !d.isAdditive).reduce((acc, d) => acc + (d.total || 0), 0)],
      [],
      ['Por Estado'],
      ['Pendiente', stats.pendiente.length, totalPendiente],
      ['Pagado', stats.pagado.length, totalPagado],
      ['Vencido', stats.vencido.length, totalVencido],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    // Sheet 2: Distribución por Tipo
    const tipoData = [
      ['Distribución por Tipo de Documento'],
      ['Período:', monthName],
      [],
      ['Tipo', 'Cantidad', 'Total'],
      ...typeDistribution.map(item => [item.name, item.cantidad, item.total])
    ];
    const wsTipo = XLSX.utils.aoa_to_sheet(tipoData);
    wsTipo['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsTipo, 'Por Tipo');

    // Sheet 3: Gasto por Proveedor
    const proveedorData = [
      ['Gasto por Proveedor'],
      ['Período:', monthName],
      [],
      ['Proveedor', 'Documentos', 'Total Neto'],
      ...providerData.map(item => [item.fullName || item.name, item.docs, item.neto])
    ];
    const wsProveedor = XLSX.utils.aoa_to_sheet(proveedorData);
    wsProveedor['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsProveedor, 'Por Proveedor');

    // Sheet 4: Histórico Mensual (últimos 6 meses)
    const historicoData = [
      ['Histórico Neto Mensual'],
      [],
      ['Mes', 'Neto'],
      ...monthlyData.map(item => [item.name, item.neto])
    ];
    const wsHistorico = XLSX.utils.aoa_to_sheet(historicoData);
    wsHistorico['!cols'] = [{ wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, wsHistorico, 'Histórico');

    // Sheet 5: Detalle de Documentos
    const detalleData = [
      ['Detalle de Documentos'],
      ['Período:', monthName],
      [],
      ['Proveedor', 'RUT', 'Tipo', 'Folio', 'Fecha Emisión', 'Estado', 'Total'],
      ...currentMonthDocs.map(doc => [
        doc.razon || '-',
        doc.rut || '-',
        doc.tipoDoc || '-',
        doc.numeroDoc || '-',
        doc.fechaE ? new Date(doc.fechaE.seconds * 1000).toLocaleDateString('es-CL') : '-',
        doc.estado || '-',
        doc.isAdditive ? (doc.total || 0) : -(doc.total || 0)
      ])
    ];
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
    wsDetalle['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(workbook, wsDetalle, 'Detalle');

    // Download file
    const fileName = `Recepcion_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }, [currentDate, stats, currentMonthDocs, totalPendiente, totalPagado, totalVencido, typeDistribution, providerData, monthlyData, calculateTotal]);

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const TYPE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899'];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <SidebarWithContentSeparator className="h-full" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-visible">
        {/* Title */}
        <div className="p-3 relative flex items-center justify-center flex-shrink-0">
          <div className="absolute left-5">
            <VolverButton onClick={() => navigate('/home')} />
          </div>
          <H1Tittle text="Recepción de documentos" />
          <div className="absolute right-5 flex items-center gap-2">
            <button
              onClick={exportToExcel}
              disabled={loading || currentMonthDocs.length === 0}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                isLightTheme
                  ? 'bg-green-100 hover:bg-green-200'
                  : 'bg-green-500/10 hover:bg-green-500/20'
              }`}
              title="Descargar Excel"
            >
              <ArrowDownTrayIcon className={`w-5 h-5 ${isLightTheme ? 'text-green-700' : 'text-green-400'}`} />
            </button>
            <button
              onClick={() => fetchAllDocuments(true)}
              disabled={loading || refreshCooldown > 0}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1 ${
                isLightTheme
                  ? 'bg-gray-100 hover:bg-gray-200'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
              title={refreshCooldown > 0 ? `Disponible en ${Math.floor(refreshCooldown / 60)}:${String(refreshCooldown % 60).padStart(2, '0')}` : 'Actualizar datos'}
            >
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''} ${isLightTheme ? 'text-gray-700' : 'text-white'}`} />
              {refreshCooldown > 0 && (
                <span className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                  {Math.floor(refreshCooldown / 60)}:{String(refreshCooldown % 60).padStart(2, '0')}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-5 pb-4">
        <div className="max-w-6xl mx-auto space-y-4">
          {/* Quick Actions + Month Navigation Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 py-2">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <QuickActionButton
                icon={DocumentPlusIcon}
                title="Ingresar"
                onClick={() => navigate('/recepcion-index/ingresar')}
                disabled={!puedeIngresar}
                isLightTheme={isLightTheme}
              />
              <QuickActionButton
                icon={CogIcon}
                title="Procesar"
                onClick={() => navigate('/recepcion-index/procesar')}
                disabled={!puedeProcesar}
                isLightTheme={isLightTheme}
              />
              <QuickActionButton
                icon={MagnifyingGlassIcon}
                title="Revisar"
                onClick={() => navigate('/recepcion-index/revision-documentos')}
                disabled={!puedeVerDocumentos}
                isLightTheme={isLightTheme}
              />
              <QuickActionButton
                icon={CalendarDaysIcon}
                title="Calendario"
                onClick={() => navigate('/recepcion-index/calendario')}
                disabled={!puedeVerCalendario}
                isLightTheme={isLightTheme}
              />
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className={`p-2 rounded-lg transition-colors ${
                  isLightTheme
                    ? 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <ChevronLeftIcon className={`w-4 h-4 ${isLightTheme ? 'text-gray-700' : 'text-white'}`} />
              </button>

              <button
                onClick={goToCurrentMonth}
                className={`px-4 py-2 rounded-lg transition-colors min-w-[180px] ${
                  isLightTheme
                    ? 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className={`text-sm font-medium capitalize ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                  {getMonthName(currentDate)}
                </span>
              </button>

              <button
                onClick={goToNextMonth}
                className={`p-2 rounded-lg transition-colors ${
                  isLightTheme
                    ? 'bg-white border border-gray-200 hover:bg-gray-50 shadow-sm'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <ChevronRightIcon className={`w-4 h-4 ${isLightTheme ? 'text-gray-700' : 'text-white'}`} />
              </button>
            </div>
          </div>

          {/* Stats Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard
              icon={DocumentTextIcon}
              title="Documentos"
              value={loading ? '...' : stats.total}
              subvalue={
                loading
                  ? '...'
                  : `${currentMonthDocs.filter((d) => d.isAdditive).length} fact. / ${currentMonthDocs.filter((d) => !d.isAdditive).length} NC`
              }
              color="blue"
              isLightTheme={isLightTheme}
            />
            <StatCard
              icon={ClockIcon}
              title="Pendiente"
              value={loading ? '...' : formatCLP(totalPendiente)}
              subvalue={loading ? '...' : `${stats.pendiente.length} docs`}
              color="yellow"
              isLightTheme={isLightTheme}
            />
            <StatCard
              icon={CheckCircleIcon}
              title="Pagado"
              value={loading ? '...' : formatCLP(totalPagado)}
              subvalue={loading ? '...' : `${stats.pagado.length} docs`}
              color="green"
              isLightTheme={isLightTheme}
            />
            <StatCard
              icon={ExclamationTriangleIcon}
              title="Vencido"
              value={loading ? '...' : formatCLP(totalVencido)}
              subvalue={loading ? '...' : `${stats.vencido.length} docs`}
              color="red"
              isLightTheme={isLightTheme}
            />
            {/* Net Total Card - inline with stats */}
            <div className={`bg-gradient-to-br rounded-xl p-3 flex flex-col gap-1 ${
              isLightTheme
                ? 'from-emerald-100 to-emerald-50 border border-emerald-300'
                : 'from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30'
            }`}>
              <span className={`text-xs uppercase tracking-wide ${isLightTheme ? 'text-gray-600' : 'text-slate-400'}`}>Total Neto</span>
              <div className={`text-xl font-bold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                {loading ? '...' : formatCLP(calculateTotal(currentMonthDocs))}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly NET Chart */}
            <div className={`rounded-xl p-4 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-sm'
                : 'bg-gradient-card border border-white/5'
            }`}>
              <h3 className={`text-sm font-semibold mb-3 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                Neto Mensual (últimos 6 meses)
              </h3>
              <div ref={chartContainerRef} className="w-full" style={{ height: 180 }}>
                {loading || chartDimensions.width === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Cargando...</span>
                  </div>
                ) : (
                  <BarChart
                    width={chartDimensions.width}
                    height={180}
                    data={monthlyData}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#9ca3af', fontSize: 11 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                      tick={{ fill: '#9ca3af', fontSize: 10 }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="neto" name="Neto" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </div>
            </div>

            {/* Document Type Distribution */}
            <div className={`rounded-xl p-4 ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-sm'
                : 'bg-gradient-card border border-white/5'
            }`}>
              <h3 className={`text-sm font-semibold mb-3 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>Distribución por Tipo</h3>
              <div className="space-y-2" style={{ minHeight: 180 }}>
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <span className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Cargando...</span>
                  </div>
                ) : typeDistribution.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <span className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Sin documentos</span>
                  </div>
                ) : (
                  typeDistribution.map((item, index) => {
                    const maxTotal = Math.max(...typeDistribution.map((t) => t.total));
                    const percentage = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;

                    return (
                      <div key={item.name} className="space-y-0.5">
                        <div className="flex justify-between text-xs">
                          <span className={`flex items-center gap-1 ${isLightTheme ? 'text-gray-600' : 'text-slate-300'}`}>
                            {item.name}
                          </span>
                          <span className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                            {formatCLP(item.total)} ({item.cantidad})
                          </span>
                        </div>
                        <div className={`h-1.5 rounded-full overflow-hidden ${isLightTheme ? 'bg-gray-200' : 'bg-white/5'}`}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.isAdditive
                                ? TYPE_COLORS[index % TYPE_COLORS.length]
                                : '#ef4444',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Provider Comparison Chart */}
          {!loading && providerData.length > 0 && (() => {
            // Calculate dynamic height: 32px per provider, min 250px, max before scroll 350px
            const rowHeight = 32;
            const chartHeight = Math.max(250, providerData.length * rowHeight + 40);
            const maxContainerHeight = 350;
            const needsScroll = chartHeight > maxContainerHeight;

            return (
              <div className={`rounded-xl p-4 ${
                isLightTheme
                  ? 'bg-white border border-gray-200 shadow-sm'
                  : 'bg-gradient-card border border-white/5'
              }`}>
                <h3 className={`text-sm font-semibold mb-3 ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                  Gasto por Proveedor ({providerData.length} {providerData.length === 1 ? 'proveedor' : 'proveedores'})
                </h3>
                <div
                  ref={providerChartRef}
                  className="w-full overflow-y-auto scrollbar-custom"
                  style={{ maxHeight: maxContainerHeight }}
                >
                  {providerChartDimensions.width === 0 ? (
                    <div className="h-64 flex items-center justify-center">
                      <span className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>Cargando...</span>
                    </div>
                  ) : (
                    <BarChart
                      width={providerChartDimensions.width - (needsScroll ? 10 : 0)}
                      height={chartHeight}
                      data={providerData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={{ stroke: '#374151' }}
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={{ stroke: '#374151' }}
                        width={120}
                      />
                      <Tooltip content={<ProviderTooltip />} />
                      <Bar dataKey="neto" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  )}
                </div>
                {needsScroll && (
                  <p className={`text-xs text-center mt-2 ${isLightTheme ? 'text-gray-400' : 'text-slate-500'}`}>
                    Desplaza para ver más proveedores
                  </p>
                )}
              </div>
            );
          })()}

          {/* Debug info */}
          {!loading && allDocuments.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-center">
              <p className="text-yellow-400 text-xs">
                No se encontraron documentos. Verifique que existan empresas proveedoras con
                documentos.
              </p>
            </div>
          )}
        </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default RIndex;
