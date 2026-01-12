import jsPDF from "jspdf";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { formatRUT } from "./formatRUT";
import { formatCLP } from "./formatCurrency";

// Colores del tema (ink-friendly)
const COLORS = {
  black: [0, 0, 0],
  darkGray: [60, 60, 60],
  mediumGray: [120, 120, 120],
  lightGray: [200, 200, 200],
  tableHeader: [245, 245, 245],
  white: [255, 255, 255],
};

// Función auxiliar para dibujar línea horizontal
const drawHorizontalLine = (pdf, y, startX = 20, endX = 190, color = COLORS.lightGray) => {
  pdf.setDrawColor(...color);
  pdf.setLineWidth(0.3);
  pdf.line(startX, y, endX, y);
};

// Función auxiliar para dibujar rectángulo con bordes redondeados simulados
const drawRoundedRect = (pdf, x, y, width, height, fill = false, fillColor = COLORS.white, borderColor = COLORS.darkGray) => {
  pdf.setDrawColor(...borderColor);
  pdf.setLineWidth(0.5);
  if (fill) {
    pdf.setFillColor(...fillColor);
    pdf.rect(x, y, width, height, "FD");
  } else {
    pdf.rect(x, y, width, height, "S");
  }
};

// Función para generar PDF
export const generarPDF = async (numeroEgreso, facturasPorEmpresa, totalEgreso, fechaPago = null, companyRUT = null, cuentaBancaria = null, metodoPago = null) => {
  // Validate companyRUT is provided
  if (!companyRUT) {
    console.error("generarPDF: companyRUT is required");
    throw new Error("Company RUT is required to generate PDF");
  }

  // If bank account has an ID but missing details, fetch from Firestore
  let cuentaBancariaCompleta = cuentaBancaria;
  if (cuentaBancaria && cuentaBancaria.id && (!cuentaBancaria.rut || !cuentaBancaria.titular)) {
    try {
      const cuentaRef = doc(db, companyRUT, '_root', 'cuentas_bancarias', cuentaBancaria.id);
      const cuentaSnap = await getDoc(cuentaRef);
      if (cuentaSnap.exists()) {
        const cuentaData = cuentaSnap.data();
        cuentaBancariaCompleta = {
          ...cuentaBancaria,
          rut: cuentaData.rutTitular || cuentaBancaria.rut,
          titular: cuentaData.nombreTitular || cuentaBancaria.titular,
          email: cuentaData.emailTitular || cuentaBancaria.email,
        };
      }
    } catch (error) {
      console.error("Error fetching bank account details:", error);
      // Continue with partial data
    }
  }

  const pdf = new jsPDF();
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 190;
  const contentWidth = marginRight - marginLeft;

  // ═══════════════════════════════════════════════════════════════
  // HEADER SECTION
  // ═══════════════════════════════════════════════════════════════

  // Logo/Brand name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(...COLORS.black);
  pdf.text("FACTO", marginLeft, 18);

  // Subtitle
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.mediumGray);
  pdf.text("Sistema de Gestión Documental", marginLeft, 24);

  // Document type box (right side)
  const boxWidth = 55;
  const boxHeight = 22;
  const boxX = marginRight - boxWidth;
  const boxY = 10;

  drawRoundedRect(pdf, boxX, boxY, boxWidth, boxHeight, true, COLORS.tableHeader, COLORS.darkGray);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.darkGray);
  pdf.text("COMPROBANTE DE EGRESO", boxX + boxWidth / 2, boxY + 8, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...COLORS.black);
  pdf.text(`N° ${numeroEgreso}`, boxX + boxWidth / 2, boxY + 17, { align: "center" });

  // Horizontal divider after header
  drawHorizontalLine(pdf, 38, marginLeft, marginRight, COLORS.darkGray);

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT INFO SECTION
  // ═══════════════════════════════════════════════════════════════

  // Handle fechaPago which could be: Date, Firestore Timestamp, or {seconds} object
  let fechaPagoDate;
  if (fechaPago) {
    if (fechaPago instanceof Date) {
      fechaPagoDate = fechaPago;
    } else if (fechaPago.toDate && typeof fechaPago.toDate === 'function') {
      // Firestore Timestamp
      fechaPagoDate = fechaPago.toDate();
    } else if (fechaPago.seconds) {
      // Plain object with seconds (from Firestore)
      fechaPagoDate = new Date(fechaPago.seconds * 1000);
    } else {
      // Try to parse as date string
      fechaPagoDate = new Date(fechaPago);
    }
  }
  const fechaPagoStr = fechaPagoDate && !isNaN(fechaPagoDate.getTime())
    ? fechaPagoDate.toLocaleDateString("es-CL")
    : new Date().toLocaleDateString("es-CL");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.darkGray);
  pdf.text("Fecha de emisión:", marginLeft, 48);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.black);
  pdf.text(fechaPagoStr, marginLeft + 38, 48);

  let y = 55;

  // ═══════════════════════════════════════════════════════════════
  // BANK ACCOUNT SECTION (if provided)
  // ═══════════════════════════════════════════════════════════════
  if (cuentaBancariaCompleta) {
    y += 5;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.text("CUENTA BANCARIA", marginLeft, y);
    drawHorizontalLine(pdf, y + 2, marginLeft, marginLeft + 38, COLORS.darkGray);
    y += 8;

    // Bank account details in two columns
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Banco:", marginLeft, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(cuentaBancariaCompleta.banco || "-", marginLeft + 18, y);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Tipo:", marginLeft + 80, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(cuentaBancariaCompleta.tipoCuenta || "-", marginLeft + 92, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("N° Cuenta:", marginLeft, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(cuentaBancariaCompleta.numeroCuenta || "-", marginLeft + 23, y);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("RUT:", marginLeft + 80, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(cuentaBancariaCompleta.rut ? formatRUT(cuentaBancariaCompleta.rut) : "-", marginLeft + 92, y);
    y += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Titular:", marginLeft, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(cuentaBancariaCompleta.titular || "-", marginLeft + 18, y);

    if (cuentaBancariaCompleta.email) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...COLORS.mediumGray);
      pdf.text("Email:", marginLeft + 80, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...COLORS.black);
      pdf.text(cuentaBancariaCompleta.email, marginLeft + 95, y);
    }

    y += 10;
  } else {
    y += 5;
  }

  // ═══════════════════════════════════════════════════════════════
  // PAYMENT METHOD SECTION (if provided)
  // ═══════════════════════════════════════════════════════════════
  if (metodoPago) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.text("MÉTODO DE PAGO", marginLeft, y);
    drawHorizontalLine(pdf, y + 2, marginLeft, marginLeft + 35, COLORS.darkGray);
    y += 8;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.black);
    pdf.text(metodoPago, marginLeft, y);

    y += 10;
  }

  // Track grand total from subtotals (more accurate than passed totalEgreso when NC are involved)
  let grandTotal = 0;

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER SECTIONS (iterate per company)
  // ═══════════════════════════════════════════════════════════════

  for (const empresa of facturasPorEmpresa) {
    // Check if we need a new page
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    // Fetch company info from Firestore (multi-tenant path)
    const empresaRef = doc(db, companyRUT, "_root", "empresas", empresa.rut);
    const empresaSnap = await getDoc(empresaRef);
    const empresaData = empresaSnap.exists() ? empresaSnap.data() : {};

    // Provider section header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...COLORS.darkGray);
    pdf.text("PROVEEDOR", marginLeft, y);
    drawHorizontalLine(pdf, y + 2, marginLeft, marginLeft + 25, COLORS.darkGray);
    y += 10;

    // Provider details - organized in two rows
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Razón Social:", marginLeft, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(empresaData.razon || "Sin información", marginLeft + 28, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("RUT:", marginLeft, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(formatRUT(empresa.rut), marginLeft + 12, y);

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Giro:", marginLeft + 55, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    const giroText = empresaData.giro || "Sin información";
    // Truncate giro if too long
    const maxGiroLength = 60;
    const displayGiro = giroText.length > maxGiroLength ? giroText.substring(0, maxGiroLength) + "..." : giroText;
    pdf.text(displayGiro, marginLeft + 65, y);
    y += 10;

    // ─────────────────────────────────────────────────────────────
    // Documents table
    // ─────────────────────────────────────────────────────────────

    const colWidths = {
      tipo: 25,
      numero: 35,
      fecha: 35,
      total: 45,
    };
    const tableWidth = contentWidth;
    const rowHeight = 7;

    // Table header background
    pdf.setFillColor(...COLORS.tableHeader);
    pdf.rect(marginLeft, y, tableWidth, rowHeight + 1, "F");

    // Table header border
    pdf.setDrawColor(...COLORS.lightGray);
    pdf.setLineWidth(0.3);
    pdf.rect(marginLeft, y, tableWidth, rowHeight + 1, "S");

    // Table header text
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.darkGray);

    let colX = marginLeft + 3;
    pdf.text("TIPO", colX, y + 5);
    colX += colWidths.tipo;
    pdf.text("N° DOCUMENTO", colX, y + 5);
    colX += colWidths.numero;
    pdf.text("FECHA EMISIÓN", colX, y + 5);
    colX += colWidths.fecha;
    pdf.text("MONTO", marginRight - 5, y + 5, { align: "right" });

    y += rowHeight + 1;

    // Table rows
    let subtotalEmpresa = 0;

    for (const facturaItem of empresa.facturas) {
      // Support both old format (just numeroDoc string) and new format (object with numeroDoc and tipoDoc)
      const facturaNum = typeof facturaItem === "object" ? facturaItem.numeroDoc : facturaItem;
      const tipoDoc = typeof facturaItem === "object" ? (facturaItem.tipoDoc || "facturas") : "facturas";

      // Determine the collection to fetch from (multi-tenant path)
      const facturaRef = doc(db, companyRUT, "_root", "empresas", empresa.rut, tipoDoc, String(facturaNum));
      const facturaSnap = await getDoc(facturaRef);
      if (!facturaSnap.exists()) continue;
      const factura = facturaSnap.data();

      // Parse date safely (handles Firestore Timestamp, Date, or {seconds} format)
      let fechaE = "";
      if (factura.fechaE) {
        if (factura.fechaE.toDate) {
          fechaE = factura.fechaE.toDate().toLocaleDateString("es-CL");
        } else if (factura.fechaE.seconds) {
          fechaE = new Date(factura.fechaE.seconds * 1000).toLocaleDateString("es-CL");
        } else if (factura.fechaE instanceof Date) {
          fechaE = factura.fechaE.toLocaleDateString("es-CL");
        }
      }

      // Check if we need a new page
      if (y > 265) {
        pdf.addPage();
        y = 20;
      }

      // Get abono information from facturaItem (if passed)
      const esAbono = typeof facturaItem === "object" && facturaItem.esAbono;
      const includeNC = typeof facturaItem === "object" && facturaItem.includeNotaCredito === true;

      // Get the raw payment amount
      const montoAPagarRaw = typeof facturaItem === "object" && facturaItem.montoAPagar != null
        ? facturaItem.montoAPagar
        : typeof facturaItem === "object" && facturaItem.montoPagado != null
        ? facturaItem.montoPagado
        : factura.total;

      // Determine what amount to display
      // - For first full payment with NC: use factura.total, NC will be subtracted below
      // - For abonos with NC or completing payment after previous abonos: use payment + NC amount
      // - For other cases: use raw amount
      const hasNCToShow = includeNC && factura.notasCredito && factura.notasCredito.length > 0;

      // Check if this is truly the first full payment (no previous abonos)
      // by comparing montoAPagarRaw with totalDescontado (or total if no NC discount)
      const totalDescontadoOrTotal = factura.totalDescontado ?? factura.total;
      const isFirstFullPayment = !esAbono && montoAPagarRaw >= totalDescontadoOrTotal;

      let montoAPagar;
      if (isFirstFullPayment && hasNCToShow) {
        // First full payment with NC - show original total
        montoAPagar = factura.total;
      } else if (hasNCToShow) {
        // Abono with NC OR completing payment after previous abonos
        // Show payment + NC so the subtraction makes visual sense
        montoAPagar = montoAPagarRaw + (factura.abonoNc || 0);
      } else {
        // No NC to show
        montoAPagar = montoAPagarRaw;
      }

      // Determine the label based on document type
      let tipoLabel = "Factura";
      if (tipoDoc === "facturasExentas") {
        tipoLabel = "Fact. Exenta";
      } else if (tipoDoc === "notasCredito") {
        tipoLabel = "N. Crédito";
      }

      // Invoice row
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.black);

      colX = marginLeft + 3;
      pdf.text(tipoLabel, colX, y + 5);
      colX += colWidths.tipo;
      pdf.text(String(factura.numeroDoc || facturaNum), colX, y + 5);
      colX += colWidths.numero;
      pdf.text(fechaE, colX, y + 5);

      // Show amount with (Abono) indicator at the left if it's an abono
      if (esAbono) {
        // Calculate amount width at current font size (9pt) before changing font
        const montoText = formatCLP(montoAPagar);
        const montoWidth = pdf.getTextWidth(montoText);

        // Now draw the abono label in smaller italic font
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(7);
        pdf.setTextColor(...COLORS.mediumGray);
        const abonoText = "(Abono)";
        const abonoWidth = pdf.getTextWidth(abonoText);
        // Position abono label to the left of the amount with spacing
        pdf.text(abonoText, marginRight - 5 - montoWidth - abonoWidth - 3, y + 5);

        // Restore font for amount
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...COLORS.black);
      }
      pdf.text(formatCLP(montoAPagar), marginRight - 5, y + 5, { align: "right" });

      // Row bottom border
      pdf.setDrawColor(...COLORS.lightGray);
      pdf.setLineWidth(0.1);
      pdf.line(marginLeft, y + rowHeight, marginRight, y + rowHeight);

      // Use montoAPagar for subtotal calculation
      subtotalEmpresa += montoAPagar || 0;
      y += rowHeight;

      // Credit notes associated
      // Show credit notes if includeNotaCredito is explicitly true
      // For abonos with NC: NC is shown for documentation (it's being marked as pagado), but NOT subtracted from subtotal
      // For full payments with NC: NC is shown AND subtracted from subtotal
      const shouldShowNC = typeof facturaItem === "object"
        ? facturaItem.includeNotaCredito === true
        : true; // For backwards compatibility with old format (string/number)
      if (shouldShowNC && factura.notasCredito && factura.notasCredito.length > 0) {
        for (const ncNum of factura.notasCredito) {
          // Handle both object format ({numeroDoc: "123"}) and string/number format
          const ncNumero = typeof ncNum === "object" ? ncNum.numeroDoc : ncNum;
          const ncRef = doc(db, companyRUT, "_root", "empresas", empresa.rut, "notasCredito", String(ncNumero));
          const ncSnap = await getDoc(ncRef);
          if (!ncSnap.exists()) continue;
          const ncData = ncSnap.data();

          // Parse credit note date safely
          let fechaNC = "";
          if (ncData.fechaE) {
            if (ncData.fechaE.toDate) {
              fechaNC = ncData.fechaE.toDate().toLocaleDateString("es-CL");
            } else if (ncData.fechaE.seconds) {
              fechaNC = new Date(ncData.fechaE.seconds * 1000).toLocaleDateString("es-CL");
            } else if (ncData.fechaE instanceof Date) {
              fechaNC = ncData.fechaE.toLocaleDateString("es-CL");
            }
          }

          // Credit note row (indented and in gray)
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(8);
          pdf.setTextColor(...COLORS.mediumGray);

          colX = marginLeft + 6; // Indented
          pdf.text("- N.C.", colX, y + 4);
          colX = marginLeft + 3 + colWidths.tipo; // Align with document number column
          pdf.text(String(ncData.numeroDoc || ncNumero), colX, y + 4);
          colX += colWidths.numero;
          pdf.text(fechaNC, colX, y + 4);
          pdf.text(`-${formatCLP(ncData.total || 0)}`, marginRight - 5, y + 4, { align: "right" });

          // Row bottom border (lighter)
          pdf.setDrawColor(...COLORS.lightGray);
          pdf.setLineWidth(0.1);
          pdf.line(marginLeft + 5, y + rowHeight - 1, marginRight, y + rowHeight - 1);

          // Always subtract NC from subtotal when it's shown
          // For abonos with NC: montoAPagar already includes NC (abono + NC), so we subtract it
          // For full payments with NC: montoAPagar is the original total, so we subtract NC
          subtotalEmpresa -= ncData.total || 0;
          y += rowHeight - 1;

          // Show debit notes linked to this credit note (if any)
          if (ncData.notasDebito && ncData.notasDebito.length > 0) {
            for (const ndNum of ncData.notasDebito) {
              const ndNumero = typeof ndNum === "object" ? ndNum.numeroDoc : ndNum;
              const ndRef = doc(db, companyRUT, "_root", "empresas", empresa.rut, "notasDebito", String(ndNumero));
              const ndSnap = await getDoc(ndRef);
              if (!ndSnap.exists()) continue;
              const ndData = ndSnap.data();

              // Parse debit note date safely
              let fechaND = "";
              if (ndData.fechaE) {
                if (ndData.fechaE.toDate) {
                  fechaND = ndData.fechaE.toDate().toLocaleDateString("es-CL");
                } else if (ndData.fechaE.seconds) {
                  fechaND = new Date(ndData.fechaE.seconds * 1000).toLocaleDateString("es-CL");
                } else if (ndData.fechaE instanceof Date) {
                  fechaND = ndData.fechaE.toLocaleDateString("es-CL");
                }
              }

              // Debit note row (indented more and in green for additive)
              pdf.setFont("helvetica", "bold");
              pdf.setFontSize(8);
              pdf.setTextColor(0, 128, 0); // Green for additive

              colX = marginLeft + 10; // More indented than NC
              pdf.text("+ N.D.", colX, y + 4);
              colX = marginLeft + 3 + colWidths.tipo;
              pdf.text(String(ndData.numeroDoc || ndNumero), colX, y + 4);
              colX += colWidths.numero;
              pdf.text(fechaND, colX, y + 4);
              pdf.text(`+${formatCLP(ndData.total || 0)}`, marginRight - 5, y + 4, { align: "right" });

              // Row bottom border (lighter)
              pdf.setDrawColor(...COLORS.lightGray);
              pdf.setLineWidth(0.1);
              pdf.line(marginLeft + 5, y + rowHeight - 1, marginRight, y + rowHeight - 1);

              // Debit notes are ADDITIVE (they reduce the credit note's effect)
              subtotalEmpresa += ndData.total || 0;
              y += rowHeight - 1;
            }
          }
        }
      }
    }

    // Table bottom border
    pdf.setDrawColor(...COLORS.darkGray);
    pdf.setLineWidth(0.5);
    pdf.line(marginLeft, y, marginRight, y);

    // Subtotal for this provider
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Subtotal proveedor:", marginRight - 50, y);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLORS.black);
    pdf.text(formatCLP(subtotalEmpresa), marginRight - 5, y, { align: "right" });

    // Add to grand total
    grandTotal += subtotalEmpresa;

    y += 15; // Space before next provider
  }

  // ═══════════════════════════════════════════════════════════════
  // TOTAL SECTION
  // ═══════════════════════════════════════════════════════════════

  // Check if we need a new page for total
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }

  // Total box
  const totalBoxWidth = 70;
  const totalBoxHeight = 18;
  const totalBoxX = marginRight - totalBoxWidth;
  const totalBoxY = y;

  // Draw total box with double border effect
  pdf.setDrawColor(...COLORS.darkGray);
  pdf.setLineWidth(1);
  pdf.rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight, "S");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.darkGray);
  pdf.text("TOTAL EGRESO", totalBoxX + 5, totalBoxY + 7);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(...COLORS.black);
  // Use calculated grandTotal (sum of subtotals) which correctly accounts for credit notes
  pdf.text(formatCLP(grandTotal), totalBoxX + totalBoxWidth - 5, totalBoxY + 14, { align: "right" });

  y += totalBoxHeight + 20;

  // ═══════════════════════════════════════════════════════════════
  // SIGNATURE SECTION
  // ═══════════════════════════════════════════════════════════════

  // Only add signature if there's enough space
  if (y < 260) {
    drawHorizontalLine(pdf, y, marginLeft, marginLeft + 60, COLORS.darkGray);
    y += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.mediumGray);
    pdf.text("Firma autorizada", marginLeft, y);
  }

  // ═══════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════

  const pageCount = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.lightGray);
    pdf.text(`Documento generado por FACTO - Página ${i} de ${pageCount}`, pageWidth / 2, 290, { align: "center" });
  }

  // Download PDF - most reliable cross-platform solution for Electron
  const fechaStr = new Date().toISOString().split('T')[0];
  pdf.save(`Egreso_${numeroEgreso}_${fechaStr}.pdf`);
};
