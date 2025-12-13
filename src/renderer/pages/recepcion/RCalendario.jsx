import { SidebarWithContentSeparator } from '../../components/sidebar';
import React, { useState, useEffect, useMemo } from 'react';
import Footer from '../../components/Footer';
import { H1Tittle } from '../../components/Fonts';
import { VolverButton } from '../../components/Button';
import { DropdownMenu } from '../../components/Textfield';
import { useNavigate } from 'react-router-dom';
import { Modal, LoadingModal } from '../../components/modal';
import { useTheme } from '../../context/ThemeContext';

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';

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

  // State for selected day modal
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayModalOpen, setDayModalOpen] = useState(false);

  // State for provider companies filter
  const [providerCompanies, setProviderCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('Todos');

  // Fetch all documents from all companies
  useEffect(() => {
    const fetchAllDocuments = async () => {
      setLoadingModal(true);
      try {
        const empresasSnap = await getDocs(collection(db, 'empresas'));
        const allDocs = [];
        const providers = [];

        for (const empresaDoc of empresasSnap.docs) {
          const empresaData = empresaDoc.data();
          const rut = empresaDoc.id;
          const razon = empresaData.razon || 'Sin nombre';

          // Collect provider companies
          if (empresaData.proveedor) {
            providers.push({
              rut,
              razon,
              label: `${formatRUT(rut)} - ${razon}`,
            });
          }

          // Document types to fetch
          const tiposDoc = ['facturas', 'facturasExentas', 'notasCredito', 'boletas'];

          // Today's date for overdue check
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);

          for (const tipo of tiposDoc) {
            const docsSnap = await getDocs(collection(db, 'empresas', rut, tipo));

            // Check and update overdue documents
            const updatePromises = [];
            for (const docSnap of docsSnap.docs) {
              const docData = docSnap.data();
              if (
                docData.estado === 'pendiente' &&
                docData.fechaV?.toDate &&
                docData.fechaV.toDate() < hoy
              ) {
                const docRef = doc(db, 'empresas', rut, tipo, docSnap.id);
                updatePromises.push(updateDoc(docRef, { estado: 'vencido' }));
              }
            }

            // Execute updates in parallel
            if (updatePromises.length > 0) {
              await Promise.all(updatePromises);
            }

            docsSnap.docs.forEach((docSnap) => {
              const docData = docSnap.data();
              // For fechaPago: use fechaPago if available, otherwise fall back to fechaProceso
              // This handles legacy documents that only had fechaPago as processing date
              const fechaPagoDate = docData.fechaPago?.toDate ? docData.fechaPago.toDate() : null;
              const fechaProcesoDate = docData.fechaProceso?.toDate
                ? docData.fechaProceso.toDate()
                : null;

              // Apply local status update if it was overdue
              const fechaV = docData.fechaV?.toDate ? docData.fechaV.toDate() : null;
              const isOverdue = fechaV && fechaV < hoy && docData.estado === 'pendiente';

              allDocs.push({
                id: docSnap.id,
                tipo,
                rut,
                razon,
                numeroDoc: docData.numeroDoc,
                total: docData.totalDescontado ?? docData.total,
                estado: isOverdue ? 'vencido' : docData.estado,
                fechaE: docData.fechaE?.toDate ? docData.fechaE.toDate() : null,
                fechaV: docData.fechaV?.toDate ? docData.fechaV.toDate() : null,
                // Use fechaPago for calendar display (the actual payment date)
                // If fechaProceso exists, it means the new structure is in use
                // If not, fechaPago is the legacy processing date which we still show
                fechaPago: fechaPagoDate,
                fechaProceso: fechaProcesoDate,
                formaPago: docData.formaPago,
              });
            });
          }
        }

        // Sort providers by razon social
        providers.sort((a, b) => a.razon.localeCompare(b.razon));
        setProviderCompanies(providers);
        setAllDocuments(allDocs);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoadingModal(false);
      }
    };

    fetchAllDocuments();
  }, []);

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
      paid: {}, // Documents paid on each date (fechaPago) - green
    };

    filteredDocuments.forEach((doc) => {
      // Add to expiring map ONLY if has fechaV AND is NOT paid
      if (doc.fechaV && doc.estado !== 'pagado') {
        const dateKey = doc.fechaV.toDateString();
        if (!map.expiring[dateKey]) {
          map.expiring[dateKey] = [];
        }
        map.expiring[dateKey].push(doc);
      }

      // Add to paid map if has fechaPago
      if (doc.fechaPago) {
        const dateKey = doc.fechaPago.toDateString();
        if (!map.paid[dateKey]) {
          map.paid[dateKey] = [];
        }
        map.paid[dateKey].push(doc);
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
      // Check if document expires this month AND is NOT paid
      if (doc.fechaV && doc.estado !== 'pagado') {
        const docMonth = doc.fechaV.getMonth();
        const docYear = doc.fechaV.getFullYear();
        if (docMonth === currentMonth && docYear === currentYear) {
          // Check if overdue (today or past due date)
          if (doc.fechaV <= today) {
            overdueCount++;
            overdueTotal += doc.total || 0;
          } else {
            // Future expiring
            pendingCount++;
            pendingTotal += doc.total || 0;
          }
        }
      }

      // Check if document was paid this month
      if (doc.fechaPago) {
        const docMonth = doc.fechaPago.getMonth();
        const docYear = doc.fechaPago.getFullYear();
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
            onClickOutside={() => setDayModalOpen(false)}
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
                onClick={() => setDayModalOpen(false)}
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
            <div className="flex-1 overflow-y-auto space-y-6">
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

              {/* Unpaid Documents Section (expiring/overdue) */}
              {selectedDayDocuments.expiring.length > 0 && (
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
                          {selectedDayDocuments.expiring.map((doc, idx) => (
                            <div
                              key={`exp-${idx}`}
                              className={`
                              flex items-center justify-between p-3 rounded-lg
                              ${isOverdueDate ? 'bg-danger/10 border border-danger/30' : 'bg-yellow-500/10 border border-yellow-500/30'}
                            `}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
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
                                    className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                                  >
                                    N° {doc.numeroDoc}
                                  </span>
                                  {isOverdueDate && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-danger/20 text-danger">
                                      VENCIDO
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                                >
                                  {doc.razon} ({formatRUT(doc.rut)})
                                </div>
                              </div>
                              <div className="text-right">
                                <div
                                  className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                                >
                                  {formatCLP(doc.total)}
                                </div>
                                <div
                                  className={`text-xs capitalize ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                                >
                                  {doc.estado}
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

              {/* Paid Documents Section */}
              {selectedDayDocuments.paid.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <h3 className="text-lg font-semibold text-success">
                      Documentos pagados ({selectedDayDocuments.paid.length})
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {selectedDayDocuments.paid.map((doc, idx) => (
                      <div
                        key={`paid-${idx}`}
                        className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                              {getDocTypeShort(doc.tipo)}
                            </span>
                            <span
                              className={`font-medium ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                            >
                              N° {doc.numeroDoc}
                            </span>
                          </div>
                          <div
                            className={`text-sm ${isLightTheme ? 'text-gray-500' : 'text-slate-400'}`}
                          >
                            {doc.razon} ({formatRUT(doc.rut)})
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${isLightTheme ? 'text-gray-800' : 'text-white'}`}
                          >
                            {formatCLP(doc.total)}
                          </div>
                          <div className="text-xs text-success capitalize">Pagado</div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                onClick={() => setDayModalOpen(false)}
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
