import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { VolverButton } from '../../components/Button';
import { DropdownMenu } from '../../components/Textfield';
import { useNavigate } from 'react-router-dom';
import { Modal, LoadingModal } from '../../components/modal';
import { useTheme } from '../../context/ThemeContext';

import { collection, getDocs, doc, updateDoc, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { useCompany } from '../../context/CompanyContext';

import { formatRUT } from '../../utils/formatRUT';

// Helper to format currency
const formatCLP = (value) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
  }).format(value);
};

// Helper to get short document type label
const getDocTypeShort = (tipo) => {
  const labels = {
    facturas: 'Fact.',
    facturasExentas: 'Fact. Ex.',
    notasCredito: 'NC',
    boletas: 'Boleta',
    boletasExentas: 'Bol. Ex.',
  };
  return labels[tipo] || tipo;
};

// Days of the week
const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Months names
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const RCalendario = () => {
  const navigate = useNavigate();
  const { isLightTheme } = useTheme();
  const { currentCompanyRUT } = useCompany();

  // Current date for reference (memoized to avoid recreating on every render)
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // State for the currently viewed month/year
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());

  // State for all documents
  const [allDocuments, setAllDocuments] = useState([]);
  const [loadingModal, setLoadingModal] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // State for selected day modal
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [collapsedDayProviders, setCollapsedDayProviders] = useState({});

  // Toggle collapse for provider in day modal
  const toggleDayProviderCollapse = (key) => {
    setCollapsedDayProviders((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isDayProviderExpanded = (key) => collapsedDayProviders[key] === true;

  // Close day modal and reset collapsed state
  const closeDayModal = () => {
    setDayModalOpen(false);
    setCollapsedDayProviders({});
  };

  // State for provider companies filter
  const [providerCompanies, setProviderCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('Todos');

  // Track loaded months and empresas data for lazy loading
  const loadedMonthsRef = useRef(new Set());
  const empresasDataRef = useRef([]);

  // Document types to fetch
  const tiposDoc = useMemo(() => ['facturas', 'facturasExentas', 'notasCredito', 'boletas', 'boletasExentas'], []);

  // Calculate the cutoff date for initial load (12 months ago)
  const initialLoadCutoff = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Helper to create month key for tracking
  const getMonthKey = useCallback((year, month) => `${year}-${month}`, []);

  // Process document data helper
  const processDocData = useCallback((docSnap, tipo, rut, razon, hoy) => {
    const docData = docSnap.data();
    const fechaPagoDate = docData.fechaPago?.toDate ? docData.fechaPago.toDate() : null;
    const fechaProcesoDate = docData.fechaProceso?.toDate ? docData.fechaProceso.toDate() : null;
    const fechaV = docData.fechaV?.toDate ? docData.fechaV.toDate() : null;
    const isOverdue = fechaV && fechaV < hoy && docData.estado === 'pendiente';

    // Calculate abono status
    const totalAbonado = docData.totalAbonado ?? 0;
    const totalOriginal = docData.totalDescontado ?? docData.total ?? 0;
    const saldoPendiente = docData.saldoPendiente ?? totalOriginal;
    const tieneAbonos = (docData.abonos?.length ?? 0) > 0;

    // Build array of individual abono payments for calendar display
    const abonosArray = docData.abonos || [];

    return {
      id: docSnap.id,
      tipo,
      rut,
      razon,
      numeroDoc: docData.numeroDoc,
      total: totalOriginal,
      saldoPendiente,
      totalAbonado,
      estado: isOverdue ? 'vencido' : docData.estado,
      fechaE: docData.fechaE?.toDate ? docData.fechaE.toDate() : null,
      fechaV,
      fechaPago: fechaPagoDate,
      fechaProceso: fechaProcesoDate,
      formaPago: docData.formaPago,
      // Abono tracking
      tieneAbonos,
      abonos: abonosArray,
    };
  }, []);

  // Fetch documents for a specific month (lazy loading)
  const fetchMonthDocuments = useCallback(
    async (year, month) => {
      const monthKey = getMonthKey(year, month);
      if (loadedMonthsRef.current.has(monthKey) || empresasDataRef.current.length === 0) {
        return;
      }

      setLoadingMonth(true);
      try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Calculate date range for the specific month
        const startDate = new Date(year, month, 1);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(year, month + 1, 1);
        endDate.setHours(0, 0, 0, 0);

        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        const fetchPromises = [];

        for (const { rut, razon } of empresasDataRef.current) {
          for (const tipo of tiposDoc) {
            const docsRef = collection(db, currentCompanyRUT, '_root', 'empresas', rut, tipo);
            const docsQuery = query(
              docsRef,
              where('fechaE', '>=', startTimestamp),
              where('fechaE', '<', endTimestamp)
            );

            fetchPromises.push(
              getDocs(docsQuery).then((docsSnap) => ({ docsSnap, tipo, rut, razon }))
            );
          }
        }

        const results = await Promise.all(fetchPromises);
        const newDocs = [];
        const updatePromises = [];

        for (const { docsSnap, tipo, rut, razon } of results) {
          for (const docSnap of docsSnap.docs) {
            const docData = docSnap.data();

            // Check and queue overdue document updates
            if (
              docData.estado === 'pendiente' &&
              docData.fechaV?.toDate &&
              docData.fechaV.toDate() < hoy
            ) {
              const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', rut, tipo, docSnap.id);
              updatePromises.push(updateDoc(docRef, { estado: 'vencido' }));
            }

            newDocs.push(processDocData(docSnap, tipo, rut, razon, hoy));
          }
        }

        // Execute overdue updates in parallel (non-blocking)
        if (updatePromises.length > 0) {
          Promise.all(updatePromises).catch((err) =>
            console.warn('Error updating overdue documents:', err)
          );
        }

        // Mark month as loaded and merge documents
        loadedMonthsRef.current.add(monthKey);
        setAllDocuments((prev) => [...prev, ...newDocs]);
      } catch (error) {
        console.error('Error fetching month documents:', error);
      } finally {
        setLoadingMonth(false);
      }
    },
    [getMonthKey, tiposDoc, processDocData, currentCompanyRUT]
  );

  // Initial fetch: load last 12 months
  useEffect(() => {
    const fetchInitialDocuments = async () => {
      setLoadingModal(true);
      try {
        const empresasSnap = await getDocs(collection(db, currentCompanyRUT, '_root', 'empresas'));
        const providers = [];
        const empresasData = [];

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const twelveMonthsAgoTimestamp = Timestamp.fromDate(initialLoadCutoff);

        const fetchPromises = [];

        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          const rut = empresaDoc.id;
          const razon = empresaData.razon || 'Sin nombre';

          // Store empresa data for lazy loading
          empresasData.push({ rut, razon });

          if (empresaData.proveedor) {
            providers.push({
              rut,
              razon,
              label: `${formatRUT(rut)} - ${razon}`,
            });
          }

          for (const tipo of tiposDoc) {
            const docsRef = collection(db, currentCompanyRUT, '_root', 'empresas', rut, tipo);
            const docsQuery = query(docsRef, where('fechaE', '>=', twelveMonthsAgoTimestamp));

            fetchPromises.push(
              getDocs(docsQuery).then((docsSnap) => ({ docsSnap, tipo, rut, razon }))
            );
          }
        }

        // Store empresas data for lazy loading
        empresasDataRef.current = empresasData;

        const results = await Promise.all(fetchPromises);
        const allDocs = [];
        const updatePromises = [];

        for (const { docsSnap, tipo, rut, razon } of results) {
          for (const docSnap of docsSnap.docs) {
            const docData = docSnap.data();

            if (
              docData.estado === 'pendiente' &&
              docData.fechaV?.toDate &&
              docData.fechaV.toDate() < hoy
            ) {
              const docRef = doc(db, currentCompanyRUT, '_root', 'empresas', rut, tipo, docSnap.id);
              updatePromises.push(updateDoc(docRef, { estado: 'vencido' }));
            }

            allDocs.push(processDocData(docSnap, tipo, rut, razon, hoy));
          }
        }

        if (updatePromises.length > 0) {
          Promise.all(updatePromises).catch((err) =>
            console.warn('Error updating overdue documents:', err)
          );
        }

        // Mark initial months as loaded
        const now = new Date();
        for (let i = 0; i < 12; i++) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          loadedMonthsRef.current.add(getMonthKey(d.getFullYear(), d.getMonth()));
        }

        providers.sort((a, b) => a.razon.localeCompare(b.razon));
        setProviderCompanies(providers);
        setAllDocuments(allDocs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoadingModal(false);
      }
    };

    fetchInitialDocuments();
  }, [tiposDoc, initialLoadCutoff, getMonthKey, processDocData, currentCompanyRUT]);

  // Lazy load when navigating to an unloaded month
  useEffect(() => {
    const monthKey = getMonthKey(currentYear, currentMonth);
    const selectedDate = new Date(currentYear, currentMonth, 1);

    // Only lazy load if month is older than initial load and not already loaded
    if (selectedDate < initialLoadCutoff && !loadedMonthsRef.current.has(monthKey)) {
      fetchMonthDocuments(currentYear, currentMonth);
    }
  }, [currentYear, currentMonth, initialLoadCutoff, getMonthKey, fetchMonthDocuments]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get the day of week for the first day (0 = Sunday, adjust for Monday start)
    let startDayOfWeek = firstDay.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Adjust for Monday start

    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, date: null });
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      date.setHours(0, 0, 0, 0);
      days.push({ day, date });
    }

    // Add empty cells to complete the last week
    const remainingCells = 7 - (days.length % 7);
    if (remainingCells < 7) {
      for (let i = 0; i < remainingCells; i++) {
        days.push({ day: null, date: null });
      }
    }

    return days;
  }, [currentMonth, currentYear]);

  // Filter documents based on selected company
  const filteredDocuments = useMemo(() => {
    if (selectedCompany === 'Todos') {
      return allDocuments;
    }
    // Find the selected company's RUT
    const selectedProvider = providerCompanies.find((p) => p.label === selectedCompany);
    if (!selectedProvider) return allDocuments;

    return allDocuments.filter((doc) => doc.rut === selectedProvider.rut);
  }, [allDocuments, selectedCompany, providerCompanies]);

  // Create a map of dates to documents for quick lookup
  const documentsByDate = useMemo(() => {
    const map = {
      expiring: {}, // Unpaid documents expiring on each date (fechaV) - yellow for future, red for past
      paid: {}, // Documents/abonos paid on each date - green
    };

    filteredDocuments.forEach((doc) => {
      // Add to expiring map ONLY if has fechaV AND is NOT fully paid
      // For documents with abonos, show saldoPendiente instead of total
      if (doc.fechaV && doc.estado !== 'pagado') {
        const dateKey = doc.fechaV.toDateString();
        if (!map.expiring[dateKey]) {
          map.expiring[dateKey] = [];
        }
        // Use saldoPendiente for display if document has abonos
        map.expiring[dateKey].push({
          ...doc,
          displayTotal: doc.tieneAbonos ? doc.saldoPendiente : doc.total,
        });
      }

      // Add individual abono payments to paid map
      if (doc.abonos && doc.abonos.length > 0) {
        // Determine if this is a true partial payment scenario or a full payment with abonos array
        // A full payment has: estado === 'pagado' AND only 1 abono AND that abono equals the total
        const isFullPaymentWithAbono =
          doc.estado === 'pagado' &&
          doc.abonos.length === 1 &&
          doc.abonos[0].monto >= (doc.total || 0);

        doc.abonos.forEach((abono, index) => {
          // Parse abono date
          let abonoDate = null;
          if (abono.fecha?.toDate) {
            abonoDate = abono.fecha.toDate();
          } else if (abono.fecha?.seconds) {
            abonoDate = new Date(abono.fecha.seconds * 1000);
          } else if (abono.fecha instanceof Date) {
            abonoDate = abono.fecha;
          }

          if (abonoDate) {
            const dateKey = abonoDate.toDateString();
            if (!map.paid[dateKey]) {
              map.paid[dateKey] = [];
            }

            // If it's a full payment (single abono that covers the total), mark as not an abono entry
            const isActualAbono = !isFullPaymentWithAbono;

            map.paid[dateKey].push({
              ...doc,
              displayTotal: abono.monto,
              isAbonoEntry: isActualAbono,
              abonoMonto: abono.monto,
              abonoFecha: abonoDate,
              abonoUsuario: abono.usuario,
              abonoNumeroEgreso: abono.numeroEgreso,
            });
          }
        });
      } else if (doc.fechaPago && doc.estado === 'pagado') {
        // Full payment without abonos array - add to paid map
        const dateKey = doc.fechaPago.toDateString();
        if (!map.paid[dateKey]) {
          map.paid[dateKey] = [];
        }
        map.paid[dateKey].push({
          ...doc,
          displayTotal: doc.total,
          isAbonoEntry: false,
        });
      } else if ((doc.tipo === 'boletas' || doc.tipo === 'boletasExentas') && doc.estado === 'pagado' && doc.fechaE) {
        // Boletas and Boletas exentas are always paid on emission date (fechaE)
        // They don't have fechaPago, so we use fechaE as the payment date
        const dateKey = doc.fechaE.toDateString();
        if (!map.paid[dateKey]) {
          map.paid[dateKey] = [];
        }
        map.paid[dateKey].push({
          ...doc,
          displayTotal: doc.total,
          isAbonoEntry: false,
        });
      }
    });

    return map;
  }, [filteredDocuments]);

  // Calculate monthly statistics
  const monthlyStats = useMemo(() => {
    let pendingCount = 0; // Future expiring, unpaid
    let pendingTotal = 0;
    let paidCount = 0;
    let paidTotal = 0;
    let overdueCount = 0; // Past due, unpaid
    let overdueTotal = 0;

    filteredDocuments.forEach((doc) => {
      // Check if document expires this month AND is NOT fully paid
      // For documents with abonos, use saldoPendiente for pending/overdue totals
      if (doc.fechaV && doc.estado !== 'pagado') {
        const docMonth = doc.fechaV.getMonth();
        const docYear = doc.fechaV.getFullYear();
        if (docMonth === currentMonth && docYear === currentYear) {
          // Use saldoPendiente if document has abonos
          const amountRemaining = doc.tieneAbonos ? doc.saldoPendiente || 0 : doc.total || 0;

          // Check if overdue (today or past due date)
          if (doc.fechaV <= today) {
            overdueCount++;
            overdueTotal += amountRemaining;
          } else {
            // Future expiring
            pendingCount++;
            pendingTotal += amountRemaining;
          }
        }
      }

      // Check abono payments made this month
      if (doc.abonos && doc.abonos.length > 0) {
        doc.abonos.forEach((abono) => {
          let abonoDate = null;
          if (abono.fecha?.toDate) {
            abonoDate = abono.fecha.toDate();
          } else if (abono.fecha?.seconds) {
            abonoDate = new Date(abono.fecha.seconds * 1000);
          } else if (abono.fecha instanceof Date) {
            abonoDate = abono.fecha;
          }

          if (abonoDate) {
            const docMonth = abonoDate.getMonth();
            const docYear = abonoDate.getFullYear();
            if (docMonth === currentMonth && docYear === currentYear) {
              paidCount++;
              paidTotal += abono.monto || 0;
            }
          }
        });
      } else if (doc.fechaPago && doc.estado === 'pagado') {
        // Full payment without abonos array
        const docMonth = doc.fechaPago.getMonth();
        const docYear = doc.fechaPago.getFullYear();
        if (docMonth === currentMonth && docYear === currentYear) {
          paidCount++;
          paidTotal += doc.total || 0;
        }
      } else if ((doc.tipo === 'boletas' || doc.tipo === 'boletasExentas') && doc.estado === 'pagado' && doc.fechaE) {
        // Boletas and Boletas exentas are paid on emission date (fechaE)
        const docMonth = doc.fechaE.getMonth();
        const docYear = doc.fechaE.getFullYear();
        if (docMonth === currentMonth && docYear === currentYear) {
          paidCount++;
          paidTotal += doc.total || 0;
        }
      }
    });

    return { pendingCount, pendingTotal, paidCount, paidTotal, overdueCount, overdueTotal };
  }, [filteredDocuments, currentMonth, currentYear, today]);

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Handle day click
  const handleDayClick = (date) => {
    if (!date) return;
    setSelectedDay(date);
    setDayModalOpen(true);
  };

  // Get documents for selected day
  const selectedDayDocuments = useMemo(() => {
    if (!selectedDay) return { expiring: [], paid: [] };

    const dateKey = selectedDay.toDateString();
    return {
      expiring: documentsByDate.expiring[dateKey] || [],
      paid: documentsByDate.paid[dateKey] || [],
    };
  }, [selectedDay, documentsByDate]);

  // Group selected day documents by provider
  const groupedDayDocuments = useMemo(() => {
    const groupByProvider = (docs) => {
      const grouped = {};
      docs.forEach((doc) => {
        if (!grouped[doc.rut]) {
          grouped[doc.rut] = {
            rut: doc.rut,
            razon: doc.razon,
            documentos: [],
            total: 0,
          };
        }
        grouped[doc.rut].documentos.push(doc);
        grouped[doc.rut].total += doc.displayTotal || doc.total || 0;
      });
      // Sort by total descending, then sort documents by fechaV
      return Object.values(grouped)
        .sort((a, b) => b.total - a.total)
        .map((provider) => ({
          ...provider,
          documentos: provider.documentos.sort((a, b) => {
            const aDate = a.fechaV || a.abonoFecha;
            const bDate = b.fechaV || b.abonoFecha;
            if (!aDate) return 1;
            if (!bDate) return -1;
            return aDate.getTime() - bDate.getTime();
          }),
        }));
    };

    return {
      expiring: groupByProvider(selectedDayDocuments.expiring),
      paid: groupByProvider(selectedDayDocuments.paid),
    };
  }, [selectedDayDocuments]);

  // Check if a date is today
  const isToday = (date) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  // Check if a date is a weekend
  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Generate year options for dropdown
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 5; y++) {
    yearOptions.push(y);
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="flex-shrink-0">
        <SidebarWithContentSeparator className="h-full" />
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-visible">
        {/* Header */}
        <div className="p-4 relative flex items-center justify-center flex-shrink-0">
          <div className="absolute left-5">
            <VolverButton onClick={() => navigate('/recepcion-index')} />
          </div>
          <H1Tittle text="Calendario Interactivo" />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
          {/* Navigation and Stats Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Month/Year Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className={`p-2 rounded-lg transition-colors ${
                  isLightTheme
                    ? 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                    : 'bg-white/10 hover:bg-white/20 active:bg-white/30'
                }`}
                title="Mes anterior"
              >
                <svg
                  className={`w-5 h-5 ${isLightTheme ? 'text-gray-700' : 'text-white'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(Number(e.target.value))}
                  className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue ${
                    isLightTheme
                      ? 'bg-white border border-gray-300 text-gray-800'
                      : 'bg-surface-light border border-white/10 text-white'
                  }`}
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(Number(e.target.value))}
                  className={`rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue ${
                    isLightTheme
                      ? 'bg-white border border-gray-300 text-gray-800'
                      : 'bg-surface-light border border-white/10 text-white'
                  }`}
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={goToNextMonth}
                className={`p-2 rounded-lg transition-colors ${
                  isLightTheme
                    ? 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300'
                    : 'bg-white/10 hover:bg-white/20 active:bg-white/30'
                }`}
                title="Mes siguiente"
              >
                <svg
                  className={`w-5 h-5 ${isLightTheme ? 'text-gray-700' : 'text-white'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={goToToday}
                className="ml-2 px-4 py-2 rounded-lg bg-accent-blue hover:bg-blue-600 active:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                Hoy
              </button>

              {/* Loading indicator for lazy-loaded months */}
              {loadingMonth && (
                <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-accent-blue/20 rounded-lg">
                  <svg
                    className="w-4 h-4 animate-spin text-accent-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span className="text-xs text-accent-blue">Cargando mes...</span>
                </div>
              )}

              {/* Company Filter */}
              <div
                className={`flex items-center gap-2 ml-4 pl-4 border-l ${isLightTheme ? 'border-gray-300' : 'border-white/20'}`}
              >
                <DropdownMenu
                  tittle="Filtrar por proveedor"
                  items={['Todos', ...providerCompanies.map((company) => company.label)]}
                  value={selectedCompany}
                  onSelect={(item) => setSelectedCompany(item)}
                  searchable={true}
                  searchPlaceholder="Buscar proveedor..."
                  classNameMenu="min-w-[280px]"
                />
              </div>
            </div>

            {/* Monthly Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              {monthlyStats.pendingCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="text-sm text-yellow-600">
                    Por vencer: <span className="font-bold">{monthlyStats.pendingCount}</span>
                    <span className="text-xs ml-1 opacity-75">
                      ({formatCLP(monthlyStats.pendingTotal)})
                    </span>
                  </span>
                </div>
              )}

              {monthlyStats.overdueCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-danger/20 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-danger" />
                  <span className="text-sm text-danger">
                    Vencidos: <span className="font-bold">{monthlyStats.overdueCount}</span>
                    <span className="text-xs ml-1 opacity-75">
                      ({formatCLP(monthlyStats.overdueTotal)})
                    </span>
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2 bg-success/20 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-success">
                  Pagados: <span className="font-bold">{monthlyStats.paidCount}</span>
                  <span className="text-xs ml-1 opacity-75">
                    ({formatCLP(monthlyStats.paidTotal)})
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div
            className={`rounded-xl overflow-hidden ${
              isLightTheme
                ? 'bg-white border border-gray-200 shadow-md'
                : 'bg-gradient-card border border-white/10 shadow-card'
            }`}
          >
            {/* Days of Week Header */}
            <div className={`grid grid-cols-7 ${isLightTheme ? 'bg-gray-50' : 'bg-white/5'}`}>
              {DAYS_OF_WEEK.map((day, index) => (
                <div
                  key={day}
                  className={`py-3 text-center text-sm font-semibold ${
                    index >= 5
                      ? isLightTheme
                        ? 'text-gray-400'
                        : 'text-slate-400'
                      : isLightTheme
                        ? 'text-gray-700'
                        : 'text-white'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((dayData, index) => {
                const { day, date } = dayData;
                const dateKey = date?.toDateString();
                const unpaidDocs = dateKey ? documentsByDate.expiring[dateKey] || [] : [];
                const paidDocs = dateKey ? documentsByDate.paid[dateKey] || [] : [];
                const hasUnpaid = unpaidDocs.length > 0;
                const hasPaid = paidDocs.length > 0;
                const isTodayDate = isToday(date);
                const isWeekendDate = isWeekend(date);

                // Check if date is today or in the past (overdue) - all docs in expiring are unpaid
                const isOverdue = date && date <= today;

                return (
                  <div
                    key={index}
                    onClick={() => day && handleDayClick(date)}
                    className={`
                    min-h-[100px] p-2 border-t border-r
                    ${isLightTheme ? 'border-gray-200' : 'border-white/5'}
                    ${
                      day
                        ? isLightTheme
                          ? 'cursor-pointer hover:bg-gray-50'
                          : 'cursor-pointer hover:bg-white/5'
                        : isLightTheme
                          ? 'bg-gray-50'
                          : 'bg-white/[0.02]'
                    }
                    ${isTodayDate ? 'bg-accent-blue/10 ring-1 ring-inset ring-accent-blue/50' : ''}
                    ${isWeekendDate && day && !isTodayDate ? (isLightTheme ? 'bg-gray-50' : 'bg-white/[0.02]') : ''}
                    transition-colors duration-150
                  `}
                  >
                    {day && (
                      <>
                        {/* Day Number */}
                        <div
                          className={`
                        text-sm font-medium mb-2
                        ${isTodayDate ? 'text-accent-blue font-bold' : ''}
                        ${
                          isWeekendDate && !isTodayDate
                            ? isLightTheme
                              ? 'text-gray-400'
                              : 'text-slate-400'
                            : isLightTheme
                              ? 'text-gray-800'
                              : 'text-white'
                        }
                      `}
                        >
                          {day}
                        </div>

                        {/* Indicators */}
                        <div className="flex flex-wrap gap-1">
                          {hasUnpaid && (
                            <div
                              className={`
                              flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold
                              ${isOverdue ? 'bg-danger/30 text-danger' : 'bg-yellow-500/30 text-yellow-400'}
                            `}
                              title={`${unpaidDocs.length} documento(s) ${isOverdue ? 'vencidos' : 'por vencer'}`}
                            >
                              {unpaidDocs.length}
                            </div>
                          )}
                          {hasPaid && (
                            <div
                              className="flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-xs font-bold bg-success/30 text-success"
                              title={`${paidDocs.length} documento(s) pagados este día`}
                            >
                              {paidDocs.length}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div
            className={`flex items-center justify-center gap-6 text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-500/30 border-2 border-yellow-400" />
              <span>Por vencer (sin pagar)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-danger/30 border-2 border-danger" />
              <span>Vencido (sin pagar)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-success/30 border-2 border-success" />
              <span>Pagado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent-blue/20 ring-1 ring-accent-blue/50" />
              <span>Hoy</span>
            </div>
          </div>
        </div>

        {/* Day Details Modal */}
        {dayModalOpen && selectedDay && (
          <Modal
            onClickOutside={closeDayModal}
            className="!max-w-2xl !max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Modal Header */}
            <div
              className={`flex items-center justify-between mb-4 pb-4 border-b ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
            >
              <h2 className={`text-xl font-bold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}>
                {selectedDay.toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <button
                onClick={closeDayModal}
                className={`p-2 rounded-lg transition-colors ${isLightTheme ? 'hover:bg-gray-100' : 'hover:bg-white/10'}`}
              >
                <svg
                  className={`w-5 h-5 ${isLightTheme ? 'text-gray-400' : 'text-slate-400'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto flex gap-4">
              {/* Documents List - Left Side */}
              <div className="flex-1 space-y-6 min-w-0">
                {/* No documents message */}
                {selectedDayDocuments.expiring.length === 0 &&
                  selectedDayDocuments.paid.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                        />
                      </svg>
                      <p>No hay documentos para este día</p>
                    </div>
                  )}

                {/* Unpaid Documents Section (expiring/overdue) - Grouped by Provider */}
                {groupedDayDocuments.expiring.length > 0 && (
                  <div>
                    {(() => {
                      const isOverdueDate = selectedDay <= today;
                      return (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            <div
                              className={`w-3 h-3 rounded-full ${isOverdueDate ? 'bg-danger' : 'bg-yellow-400'}`}
                            />
                            <h3
                              className={`text-lg font-semibold ${isOverdueDate ? 'text-danger' : 'text-yellow-400'}`}
                            >
                              {isOverdueDate
                                ? 'Documentos vencidos sin pagar'
                                : 'Documentos por vencer'}{' '}
                              ({selectedDayDocuments.expiring.length})
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {groupedDayDocuments.expiring.map((provider) => (
                              <div
                                key={`exp-provider-${provider.rut}`}
                                className={`rounded-lg overflow-hidden ${
                                  isOverdueDate
                                    ? 'bg-danger/10 border border-danger/30'
                                    : 'bg-yellow-500/10 border border-yellow-500/30'
                                }`}
                              >
                                {/* Provider Header - Clickable */}
                                <button
                                  onClick={() => toggleDayProviderCollapse(`exp-${provider.rut}`)}
                                  className={`w-full flex items-center justify-between p-3 transition-colors ${
                                    isOverdueDate ? 'hover:bg-danger/20' : 'hover:bg-yellow-500/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span
                                      className={`transition-transform duration-300 ${
                                        isDayProviderExpanded(`exp-${provider.rut}`)
                                          ? 'rotate-90'
                                          : ''
                                      } ${isOverdueDate ? 'text-danger' : 'text-yellow-400'}`}
                                    >
                                      ▶
                                    </span>
                                    <div className="text-left">
                                      <p
                                        className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                                      >
                                        {provider.razon}
                                      </p>
                                      <p
                                        className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                                      >
                                        {formatRUT(provider.rut)} · {provider.documentos.length}{' '}
                                        doc(s)
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p
                                      className={`font-semibold ${
                                        isOverdueDate ? 'text-danger' : 'text-yellow-400'
                                      }`}
                                    >
                                      {formatCLP(provider.total)}
                                    </p>
                                  </div>
                                </button>

                                {/* Expandable Documents List */}
                                <div
                                  className={`grid transition-all duration-300 ease-in-out ${
                                    isDayProviderExpanded(`exp-${provider.rut}`)
                                      ? 'grid-rows-[1fr] opacity-100'
                                      : 'grid-rows-[0fr] opacity-0'
                                  }`}
                                >
                                  <div className="overflow-hidden">
                                    <div
                                      className={`px-3 pb-3 space-y-2 pt-3 ${
                                        isOverdueDate ? 'bg-danger/5' : 'bg-yellow-500/5'
                                      }`}
                                    >
                                      {provider.documentos.map((doc, idx) => (
                                        <div
                                          key={`exp-${provider.rut}-${idx}`}
                                          className={`flex items-center justify-between p-2 rounded-lg ${
                                            isLightTheme ? 'bg-white/50' : 'bg-black/20'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                isOverdueDate
                                                  ? 'bg-danger/20 text-danger'
                                                  : 'bg-yellow-500/20 text-yellow-400'
                                              }`}
                                            >
                                              {getDocTypeShort(doc.tipo)}
                                            </span>
                                            <span
                                              className={`font-medium text-sm ${
                                                isLightTheme ? 'text-gray-800' : 'text-white'
                                              }`}
                                            >
                                              N° {doc.numeroDoc}
                                            </span>
                                            {doc.tieneAbonos && (
                                              <span
                                                className="w-2 h-2 rounded-full bg-cyan-400 inline-block"
                                                title="Con abono"
                                              />
                                            )}
                                          </div>
                                          <div
                                            className={`font-medium text-sm ${
                                              isLightTheme ? 'text-gray-800' : 'text-white'
                                            }`}
                                          >
                                            {formatCLP(doc.displayTotal || doc.total)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Paid Documents Section - Grouped by Provider */}
                {groupedDayDocuments.paid.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <h3 className="text-lg font-semibold text-success">
                        Documentos pagados ({selectedDayDocuments.paid.length})
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {groupedDayDocuments.paid.map((provider) => (
                        <div
                          key={`paid-provider-${provider.rut}`}
                          className="rounded-lg overflow-hidden bg-success/10 border border-success/30"
                        >
                          {/* Provider Header - Clickable */}
                          <button
                            onClick={() => toggleDayProviderCollapse(`paid-${provider.rut}`)}
                            className="w-full flex items-center justify-between p-3 transition-colors hover:bg-success/20"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`transition-transform duration-300 text-success ${
                                  isDayProviderExpanded(`paid-${provider.rut}`) ? 'rotate-90' : ''
                                }`}
                              >
                                ▶
                              </span>
                              <div className="text-left">
                                <p
                                  className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                                >
                                  {provider.razon}
                                </p>
                                <p
                                  className={`text-xs ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                                >
                                  {formatRUT(provider.rut)} · {provider.documentos.length} pago(s)
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-success">
                                {formatCLP(provider.total)}
                              </p>
                            </div>
                          </button>

                          {/* Expandable Documents List */}
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${
                              isDayProviderExpanded(`paid-${provider.rut}`)
                                ? 'grid-rows-[1fr] opacity-100'
                                : 'grid-rows-[0fr] opacity-0'
                            }`}
                          >
                            <div className="overflow-hidden">
                              <div className="px-3 pt-3 pb-3 space-y-2 bg-success/5">
                                {provider.documentos.map((doc, idx) => (
                                  <div
                                    key={`paid-${provider.rut}-${idx}`}
                                    className={`flex items-center justify-between p-2 rounded-lg ${
                                      isLightTheme ? 'bg-white/50' : 'bg-black/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-success/20 text-success">
                                        {getDocTypeShort(doc.tipo)}
                                      </span>
                                      <span
                                        className={`font-medium text-sm ${
                                          isLightTheme ? 'text-gray-800' : 'text-white'
                                        }`}
                                      >
                                        N° {doc.numeroDoc}
                                      </span>
                                      {doc.isAbonoEntry && (
                                        <span
                                          className="w-2 h-2 rounded-full bg-cyan-400 inline-block"
                                          title="Abono"
                                        />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-success">
                                        {doc.isAbonoEntry ? 'Abono' : 'Pagado'}
                                      </span>
                                      <span
                                        className={`font-medium text-sm ${
                                          isLightTheme ? 'text-gray-800' : 'text-white'
                                        }`}
                                      >
                                        {formatCLP(doc.displayTotal || doc.total)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Totals Summary - Right Side */}
              {(selectedDayDocuments.expiring.length > 0 ||
                selectedDayDocuments.paid.length > 0) && (
                <div
                  className={`w-56 flex-shrink-0 space-y-4 ${isLightTheme ? 'border-l border-gray-200' : 'border-l border-white/10'} pl-4`}
                >
                  <h3
                    className={`text-sm font-semibold uppercase tracking-wider ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                  >
                    Resumen del día
                  </h3>

                  {/* Expiring/Overdue Total */}
                  {selectedDayDocuments.expiring.length > 0 &&
                    (() => {
                      const isOverdueDate = selectedDay <= today;
                      const expiringTotal = selectedDayDocuments.expiring.reduce(
                        (sum, doc) => sum + (doc.displayTotal || doc.total || 0),
                        0
                      );
                      return (
                        <div
                          className={`p-4 rounded-xl ${isOverdueDate ? 'bg-danger/10 border border-danger/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-2.5 h-2.5 rounded-full ${isOverdueDate ? 'bg-danger' : 'bg-yellow-400'}`}
                            />
                            <span
                              className={`text-xs font-medium ${isOverdueDate ? 'text-danger' : 'text-yellow-400'}`}
                            >
                              {isOverdueDate ? 'Vencido' : 'Por vencer'}
                            </span>
                          </div>
                          <div
                            className={`text-2xl font-bold ${isOverdueDate ? 'text-danger' : 'text-yellow-400'}`}
                          >
                            {formatCLP(expiringTotal)}
                          </div>
                          <div
                            className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                          >
                            {selectedDayDocuments.expiring.length} documento
                            {selectedDayDocuments.expiring.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Paid Total */}
                  {selectedDayDocuments.paid.length > 0 &&
                    (() => {
                      const paidTotal = selectedDayDocuments.paid.reduce(
                        (sum, doc) => sum + (doc.displayTotal || doc.total || 0),
                        0
                      );
                      return (
                        <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-success" />
                            <span className="text-xs font-medium text-success">Pagado</span>
                          </div>
                          <div className="text-2xl font-bold text-success">
                            {formatCLP(paidTotal)}
                          </div>
                          <div
                            className={`text-xs mt-1 ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                          >
                            {selectedDayDocuments.paid.length} pago
                            {selectedDayDocuments.paid.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      );
                    })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              className={`mt-4 pt-4 border-t flex justify-between items-center ${isLightTheme ? 'border-gray-200' : 'border-white/10'}`}
            >
              <div className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}>
                {selectedDayDocuments.expiring.length + selectedDayDocuments.paid.length}{' '}
                documento(s) en total
              </div>
              <button
                onClick={closeDayModal}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </Modal>
        )}

        <LoadingModal isOpen={loadingModal} message="Cargando calendario..." />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export default RCalendario;
