import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

// AJUSTES DE COORDENADAS (Modificables aquí)
const DEBUG_GUIDES = false; // Cambiar a true para ver rectángulos de posicionamiento

const OVERLAY = {
  // Tapado de "PRESUPUESTO" y escritura de "FACTURA"
  title: {
    page: 0,
    cover: { x: 300, y: 785, w: 220, h: 40 }, // Rectángulo blanco para tapar
    text: { x: 345, y: 795, size: 32, label: "FACTURA" }
  },
  // Campos manuales
  fields: {
    cliente: { page: 0, x: 100, y: 653, size: 11 },
    fecha:   { page: 0, x: 100, y: 633, size: 11 },
    numero:  { page: 0, x: 48, y: 550, size: 13, rotateDeg: 90 } // Texto vertical lateral si aplica
  }
};

export async function generatePdf(
  budget: BudgetData, 
  config: InvoiceConfig, 
  invoiceCode: string,
  _unused?: ArrayBuffer // Mantenemos firma para no romper App.tsx
) {
  // @ts-ignore
  const { PDFDocument, rgb, StandardFonts, degrees } = window.PDFLib;

  if (!budget.originalBuffer) {
    alert("No se ha encontrado el PDF original del presupuesto.");
    return;
  }

  try {
    // 1. Cargar el PDF original
    const pdfDoc = await PDFDocument.load(budget.originalBuffer);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { height } = firstPage.getSize();
    
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 2. Tapar "PRESUPUESTO" y poner "FACTURA"
    const t = OVERLAY.title;
    firstPage.drawRectangle({
      x: t.cover.x,
      y: t.cover.y,
      width: t.cover.w,
      height: t.cover.h,
      color: rgb(1, 1, 1), // Blanco
      opacity: DEBUG_GUIDES ? 0.5 : 1
    });
    
    if (DEBUG_GUIDES) {
      firstPage.drawRectangle({
        x: t.cover.x, y: t.cover.y, width: t.cover.w, height: t.cover.h,
        borderColor: rgb(1, 0, 0), borderWidth: 1
      });
    }

    firstPage.drawText(t.text.label, {
      x: t.text.x,
      y: t.text.y,
      size: t.text.size,
      font: fontBold,
      color: rgb(0.27, 0.45, 0.72)
    });

    // 3. Escribir campos manuales
    const f = OVERLAY.fields;
    
    // Cliente
    firstPage.drawText(budget.clientName.toUpperCase(), {
      x: f.cliente.x,
      y: f.cliente.y,
      size: f.cliente.size,
      font: fontBold
    });

    // Fecha
    const dateFormatted = config.date.split('-').reverse().join('/');
    firstPage.drawText(dateFormatted, {
      x: f.fecha.x,
      y: f.fecha.y,
      size: f.fecha.size,
      font: fontBold
    });

    // Número de Factura (Overlay vertical o normal)
    const numText = invoiceCode;
    firstPage.drawText(numText, {
      x: f.numero.x,
      y: f.numero.y,
      size: f.numero.size,
      font: fontBold,
      rotate: f.numero.rotateDeg ? degrees(f.numero.rotateDeg) : undefined
    });

    if (DEBUG_GUIDES) {
      // Guías para campos
      [f.cliente, f.fecha, f.numero].forEach(field => {
        firstPage.drawCircle({ x: field.x, y: field.y, radius: 2, color: rgb(0, 1, 0) });
      });
    }

    // 4. Guardar y descargar
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // Nombre de archivo: FACTURA_N_MES-YY.pdf
    const dateObj = new Date(config.date);
    const monthStr = MONTHS_ABREV_ES[dateObj.getMonth()];
    const yearStr = dateObj.getFullYear().toString().slice(-2);
    const fileName = `FACTURA_${config.number}_${monthStr}-${yearStr}.pdf`;
    
    link.download = fileName;
    link.click();

  } catch (error) {
    console.error("Error overlaying PDF:", error);
    alert("Error al procesar el PDF original. Asegúrate de que el archivo no esté protegido.");
  }
}

// Fix: Updated generateDocx signature to accept the arguments passed in InvoiceEditor.tsx to resolve TS error
export async function generateDocx(
  _budget: BudgetData, 
  _config: InvoiceConfig, 
  _invoiceCode: string
) {
  alert("DOCX deshabilitado en este modo.");
}
