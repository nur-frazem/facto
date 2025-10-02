import jsPDF from "jspdf";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { formatRUT } from "./formatRUT";
import { formatCLP } from "./formatCurrency";

// Función para generar PDF
export const generarPDF = async (numeroEgreso, facturasPorEmpresa, totalEgreso) => {
  const pdf = new jsPDF();

  // Header izquierda
  pdf.setFontSize(14);
  pdf.text("FACTO", 20, 15);

  // Rectángulo con borde negro y fondo blanco
  pdf.setDrawColor(0, 0, 0);   // Color del borde
  pdf.setFillColor(255, 255, 255); // Color de fondo (blanco)
  pdf.rect(150, 10, 50, 15, "FD");

  // Texto dentro del rectángulo
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.text("Egreso", 175, 15, { align: "center" });
  pdf.text(`N° ${numeroEgreso}`, 175, 22, { align: "center" });

  // Título centrado subrayado
  pdf.setFontSize(16);
  pdf.text("Pago Recepción", 105, 40, { align: "center" });
  const titleWidth = pdf.getTextWidth("Pago Recepción");
  pdf.line(105 - titleWidth / 2, 42, 105 + titleWidth / 2, 42);

  // Fecha de pago
  const fechaPago = new Date().toLocaleDateString("es-CL");
  pdf.setFontSize(12);
  pdf.text(`Fecha de pago: ${fechaPago}`, 20, 55);

  // Línea divisoria
  pdf.line(20, 60, 190, 60);

  let y = 70;

  // Por cada empresa
  for (const empresa of facturasPorEmpresa) {
    // Traer info de empresa desde Firestore
    const empresaRef = doc(db, "empresas", empresa.rut);
    const empresaSnap = await getDoc(empresaRef);
    const empresaData = empresaSnap.exists() ? empresaSnap.data() : {};

    pdf.setFontSize(12);
    pdf.text(
      `RUT: ${formatRUT(empresa.rut)}   Razón social: ${empresaData.razon || ""}   Giro: ${empresaData.giro || ""}`,
      20,
      y
    );
    y += 10;

    // Encabezados facturas
    pdf.setFontSize(11);
    pdf.text("N° Factura", 30, y);
    pdf.text("Fecha documento", 80, y);
    pdf.text("Total", 150, y);
    y += 8;

    for (const facturaNum of empresa.facturas) {
      const facturaRef = doc(db, "empresas", empresa.rut, "facturas", facturaNum);
      const facturaSnap = await getDoc(facturaRef);
      if (!facturaSnap.exists()) continue;
      const factura = facturaSnap.data();

      const fechaE = factura.fechaE
        ? new Date(factura.fechaE.seconds * 1000).toLocaleDateString("es-CL")
        : "";

      pdf.text(factura.numeroDoc, 30, y);
      pdf.text(fechaE, 80, y);
      pdf.text(formatCLP(factura.total), 150, y);
      y += 8;

      if (factura.notasCredito && factura.notasCredito.length > 0) {
        const notas = [];
    
        for (const ncNum of factura.notasCredito) {
          const ncRef = doc(db, "empresas", empresa.rut, "notasCredito", ncNum);
          const ncSnap = await getDoc(ncRef);
          if (ncSnap.exists()) {
            const ncData = ncSnap.data();
            notas.push(ncData);
          }
        }
    
        if (notas.length > 0) {
          const idsNc = notas.map(nc => nc.numeroDoc).join(", ");
          const valorNc = notas.reduce((acc, nc) => acc + (nc.total || 0), 0);
    
          pdf.setFontSize(10);
          pdf.text(
            `Notas de crédito: [${idsNc}] Valor: ${formatCLP(valorNc)}`,
            40,
            y
          );
          y += 6; // Espacio debajo de las NC
          pdf.setFontSize(12); // restaurar tamaño normal
        }
      }
    }

    // Separador
    pdf.line(20, y, 190, y);
    y += 10;
  }

  // Total egreso (abajo derecha)
  pdf.setFontSize(12);
  pdf.text(`Total egreso: ${formatCLP(totalEgreso)}`, 190, y + 10, {
    align: "right",
  });

  // Abrir en pestaña nueva
  window.open(pdf.output("bloburl"), "_blank");
};
