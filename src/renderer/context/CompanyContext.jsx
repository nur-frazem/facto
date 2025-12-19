import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from './AuthContext';

const CompanyContext = createContext(null);

const SELECTED_COMPANY_KEY = 'facto_selected_company';
const ROOT_DOC = '_root'; // Root document within company collection

// Validate Chilean RUT format
export function validateRut(rut) {
  if (!rut || typeof rut !== 'string') return false;

  // Remove dots and dashes, convert to uppercase
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase();

  if (cleanRut.length < 2) return false;

  const body = cleanRut.slice(0, -1);
  const checkDigit = cleanRut.slice(-1);

  // Verify body is numeric
  if (!/^\d+$/.test(body)) return false;

  // Calculate verification digit
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedDigit;

  if (remainder === 11) expectedDigit = '0';
  else if (remainder === 10) expectedDigit = 'K';
  else expectedDigit = remainder.toString();

  return checkDigit === expectedDigit;
}

// Format RUT with dots and dash
export function formatRut(rut) {
  if (!rut) return '';

  // Remove any existing formatting
  const cleanRut = rut.replace(/[.-]/g, '').toUpperCase();

  if (cleanRut.length < 2) return cleanRut;

  const body = cleanRut.slice(0, -1);
  const checkDigit = cleanRut.slice(-1);

  // Add dots every 3 digits from right to left
  let formattedBody = '';
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      formattedBody = '.' + formattedBody;
    }
    formattedBody = body[i] + formattedBody;
  }

  return `${formattedBody}-${checkDigit}`;
}

// Clean RUT for Firestore path (remove dots and dashes)
export function cleanRut(rut) {
  if (!rut) return '';
  return rut.replace(/[.-]/g, '').toUpperCase();
}

export function CompanyProvider({ children }) {
  const { user, userData, isLoggingOut } = useAuth();
  const [currentCompanyRUT, setCurrentCompanyRUT] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isLoggingOutRef = useRef(false);

  // Get available companies from userData (handles both old array and new object structure)
  const availableCompanies = userData?.empresas
    ? (Array.isArray(userData.empresas)
        ? userData.empresas  // Old structure: array of RUTs
        : Object.keys(userData.empresas))  // New structure: object with RUT keys
    : [];

  // Check if a company exists in Firestore
  const validateCompanyExists = useCallback(async (rut) => {
    if (!rut) return false;

    try {
      const cleanedRut = cleanRut(rut);
      const companyDocRef = doc(db, cleanedRut, ROOT_DOC);
      const companySnap = await getDoc(companyDocRef);
      return companySnap.exists();
    } catch (err) {
      console.error('Error validating company:', err);
      return false;
    }
  }, []);

  // Set the current company and persist to localStorage
  const setCurrentCompany = useCallback((rut) => {
    if (!rut) {
      setCurrentCompanyRUT(null);
      setCompanyInfo(null);
      localStorage.removeItem(SELECTED_COMPANY_KEY);
      return;
    }

    const cleanedRut = cleanRut(rut);
    setCurrentCompanyRUT(cleanedRut);
    localStorage.setItem(SELECTED_COMPANY_KEY, cleanedRut);
  }, []);

  // Check if user has access to a specific company (handles both old and new structure)
  const hasAccessToCompany = useCallback((rut) => {
    if (!rut || !userData?.empresas) return false;
    const cleanedRut = cleanRut(rut);

    // Handle both old array and new object structure
    if (Array.isArray(userData.empresas)) {
      return userData.empresas.includes(cleanedRut);
    }
    return cleanedRut in userData.empresas;
  }, [userData?.empresas]);

  // Load saved company from localStorage on mount
  useEffect(() => {
    const savedCompany = localStorage.getItem(SELECTED_COMPANY_KEY);
    if (savedCompany) {
      setCurrentCompanyRUT(savedCompany);
    }
    setLoading(false);
  }, []);

  // Clear company data when user logs out
  useEffect(() => {
    if (isLoggingOut) {
      isLoggingOutRef.current = true;
    }

    if (!user && !isLoggingOut) {
      // User logged out, clear company data
      setCurrentCompanyRUT(null);
      setCompanyInfo(null);
      localStorage.removeItem(SELECTED_COMPANY_KEY);
      isLoggingOutRef.current = false;
    }
  }, [user, isLoggingOut]);

  // Subscribe to company info when currentCompanyRUT changes
  useEffect(() => {
    if (!currentCompanyRUT) {
      setCompanyInfo(null);
      return;
    }

    const companyDocRef = doc(db, currentCompanyRUT, ROOT_DOC);

    const unsubscribe = onSnapshot(
      companyDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setCompanyInfo(docSnap.data());
          setError(null);
        } else {
          setCompanyInfo(null);
        }
      },
      (err) => {
        // Ignore errors during logout
        if (isLoggingOutRef.current) return;
        console.error('Error loading company info:', err);
        setError('Error al cargar información de la empresa');
      }
    );

    return () => unsubscribe();
  }, [currentCompanyRUT]);

  // Clear company data (for manual logout)
  const clearCompanyData = useCallback(() => {
    setCurrentCompanyRUT(null);
    setCompanyInfo(null);
    localStorage.removeItem(SELECTED_COMPANY_KEY);
  }, []);

  const value = {
    currentCompanyRUT,
    companyInfo,
    availableCompanies,
    loading,
    error,
    setCurrentCompany,
    validateCompanyExists,
    hasAccessToCompany,
    clearCompanyData,
    // Utility functions
    validateRut,
    formatRut,
    cleanRut
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany debe ser usado dentro de un CompanyProvider');
  }
  return context;
}

export default CompanyContext;
