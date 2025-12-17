/**
 * Validation utilities for document ingestion
 */

/**
 * Validates that a document number is a positive integer
 * @param {string|number} numeroDoc - Document number to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateNumeroDoc = (numeroDoc) => {
  const num = Number(numeroDoc);
  if (isNaN(num) || !Number.isInteger(num) || num <= 0) {
    return { valid: false, error: "El número de documento debe ser un número entero positivo" };
  }
  if (num > 999999999) {
    return { valid: false, error: "El número de documento es demasiado grande" };
  }
  return { valid: true };
};

/**
 * Validates that a monetary amount is valid (non-negative number)
 * @param {string|number} amount - Amount to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateAmount = (amount, fieldName = "monto") => {
  const num = Number(amount);
  if (isNaN(num)) {
    return { valid: false, error: `El ${fieldName} debe ser un número válido` };
  }
  if (num < 0) {
    return { valid: false, error: `El ${fieldName} no puede ser negativo` };
  }
  if (num > 999999999999) {
    return { valid: false, error: `El ${fieldName} es demasiado grande` };
  }
  return { valid: true };
};

/**
 * Validates retención amount - allows negative numbers but absolute value cannot exceed neto
 * @param {string|number} retencion - Retención amount to validate
 * @param {string|number} neto - Neto amount to compare against
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateRetencion = (retencion, neto) => {
  const retencionNum = Number(retencion);
  const netoNum = Number(neto) || 0;

  if (isNaN(retencionNum)) {
    return { valid: false, error: "La retención debe ser un número válido" };
  }
  if (Math.abs(retencionNum) > 999999999999) {
    return { valid: false, error: "La retención es demasiado grande" };
  }
  // The absolute value of retención cannot exceed neto
  if (Math.abs(retencionNum) > netoNum) {
    return { valid: false, error: "La retención no puede exceder el monto neto" };
  }
  return { valid: true };
};

/**
 * Validates neto amount with specific limit of $999.999.999
 * @param {string|number} neto - Neto amount to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateNeto = (neto) => {
  const num = Number(neto);
  if (isNaN(num)) {
    return { valid: false, error: "El monto neto debe ser un número válido" };
  }
  if (num < 0) {
    return { valid: false, error: "El monto neto no puede ser negativo" };
  }
  if (num > 999999999) {
    return { valid: false, error: "El monto neto no puede exceder $999.999.999" };
  }
  return { valid: true };
};

/**
 * Validates that total amount is positive
 * @param {number} total - Total amount
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateTotal = (total) => {
  if (typeof total !== 'number' || isNaN(total)) {
    return { valid: false, error: "El total debe ser un número válido" };
  }
  if (total <= 0) {
    return { valid: false, error: "El total debe ser mayor a 0" };
  }
  return { valid: true };
};

/**
 * Validates a Chilean RUT format
 * @param {string} rut - RUT to validate (can be with or without formatting)
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateRUT = (rut) => {
  if (!rut || typeof rut !== 'string') {
    return { valid: false, error: "El RUT es requerido" };
  }

  // Remove formatting
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();

  if (cleanRut.length < 8 || cleanRut.length > 9) {
    return { valid: false, error: "El RUT no tiene un formato válido" };
  }

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Validate body is numeric
  if (!/^\d+$/.test(body)) {
    return { valid: false, error: "El RUT contiene caracteres inválidos" };
  }

  // Calculate verification digit
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expectedDV = 11 - (sum % 11);
  const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : String(expectedDV);

  if (dv !== calculatedDV) {
    return { valid: false, error: "El dígito verificador del RUT no es válido" };
  }

  return { valid: true };
};

/**
 * Validates a date is not in the future (for fechaE - emission date)
 * @param {Date} date - Date to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateEmissionDate = (date) => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return { valid: false, error: "La fecha de emisión no es válida" };
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (date > today) {
    return { valid: false, error: "La fecha de emisión no puede ser futura" };
  }

  return { valid: true };
};

/**
 * Validates due date is after or equal to emission date
 * @param {Date} fechaV - Due date
 * @param {Date} fechaE - Emission date
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateDueDate = (fechaV, fechaE) => {
  if (!fechaV || !(fechaV instanceof Date) || isNaN(fechaV.getTime())) {
    return { valid: false, error: "La fecha de vencimiento no es válida" };
  }

  if (fechaE && fechaV < fechaE) {
    return { valid: false, error: "La fecha de vencimiento no puede ser anterior a la fecha de emisión" };
  }

  return { valid: true };
};

/**
 * Comprehensive document validation
 * @param {Object} doc - Document data
 * @param {string} docType - Type of document
 * @returns {{ valid: boolean, errors: string[] }}
 */
export const validateDocument = (doc, docType) => {
  const errors = [];

  // Validate document number
  const numResult = validateNumeroDoc(doc.numeroDoc);
  if (!numResult.valid) errors.push(numResult.error);

  // Validate amounts
  const netoResult = validateAmount(doc.neto, "neto");
  if (!netoResult.valid) errors.push(netoResult.error);

  if (docType !== "Factura exenta") {
    const ivaResult = validateAmount(doc.iva, "IVA");
    if (!ivaResult.valid) errors.push(ivaResult.error);
  }

  // Validate total
  const totalResult = validateTotal(doc.total);
  if (!totalResult.valid) errors.push(totalResult.error);

  // Validate emission date
  const fechaEResult = validateEmissionDate(doc.fechaE);
  if (!fechaEResult.valid) errors.push(fechaEResult.error);

  return {
    valid: errors.length === 0,
    errors
  };
};
