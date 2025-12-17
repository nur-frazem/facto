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
export const generarPDF = async (numeroEgreso, facturasPorEmpresa, totalEgreso, fechaPago = null) => {
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

  const fechaPagoStr = fechaPago
    ? (fechaPago instanceof Date ? fechaPago : new Date(fechaPago)).toLocaleDateString("es-CL")
    : new Date().toLocaleDateString("es-CL");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.darkGray);
  pdf.text("Fecha de emisión:", marginLeft, 48);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...COLORS.black);
  pdf.text(fechaPagoStr, marginLeft + 38, 48);

  let y = 60;

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER SECTIONS (iterate per company)
  // ═══════════════════════════════════════════════════════════════

  for (const empresa of facturasPorEmpresa) {
    // Check if we need a new page
    if (y > 240) {
      pdf.addPage();
      y = 20;
    }

    // Fetch company info from Firestore
    const empresaRef = doc(db, "empresas", empresa.rut);
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

      // Determine the collection to fetch from
      const facturaRef = doc(db, "empresas", empresa.rut, tipoDoc, String(facturaNum));
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
      // Check for montoAPagar first, then montoPagado (stored in pago_recepcion), then fallback to factura.total
      const montoAPagar = typeof facturaItem === "object" && facturaItem.montoAPagar != null
        ? facturaItem.montoAPagar
        : typeof facturaItem === "object" && facturaItem.montoPagado != null
        ? facturaItem.montoPagado
        : factura.total;

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
      if (factura.notasCredito && factura.notasCredito.length > 0) {
        for (const ncNum of factura.notasCredito) {
          // Handle both object format ({numeroDoc: "123"}) and string/number format
          const ncNumero = typeof ncNum === "object" ? ncNum.numeroDoc : ncNum;
          const ncRef = doc(db, "empresas", empresa.rut, "notasCredito", String(ncNumero));
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

          subtotalEmpresa -= ncData.total || 0;
          y += rowHeight - 1;
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
  pdf.text(formatCLP(totalEgreso), totalBoxX + totalBoxWidth - 5, totalBoxY + 14, { align: "right" });

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
