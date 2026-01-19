
import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

// AJUSTES DE COORDENADAS (Configuración manual)
const DEBUG_GUIDES = false; 

const OVERLAY = {
  title: {
    page: 0,
    cover: { x: 300, y: 780, w: 220, h: 45 }, 
    text: { x: 340, y: 792, size: 30, label: "FACTURA" }
  },
  fields: {
    cliente: { page: 0, x: 100, y: 650, size: 11 },
    fecha:   { page: 0, x: 100, y: 630, size: 11 },
    numero:  { page: 0, x: 48, y: 550, size: 13, rotateDeg: 90 }
  }
};

export async function generatePdf(
  budget: BudgetData, 
  config: InvoiceConfig, 
  invoiceCode: string,
  _unused?: ArrayBuffer
) {
  // Acceso seguro a la librería desde window
  const PDFLib = (window as any).PDFLib;
  if (!PDFLib) {
    alert("Error: PDF-Lib no está cargada en el navegador.");
    return;
  }
  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer || budget.originalBuffer.byteLength === 0) {
    alert("El buffer del PDF está vacío o corrupto. Por favor, vuelve a subir el presupuesto.");
    return;
  }

  try {
    // 1. Cargar el PDF original usando Uint8Array (más compatible) e ignorando encriptación de metadatos
    const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), { 
      ignoreEncryption: true 
    });
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 2. Tapar "PRESUPUESTO"
    const t = OVERLAY.title;
    firstPage.drawRectangle({
      x: t.cover.x,
      y: t.cover.y,
      width: t.cover.w,
      height: t.cover.h,
      color: rgb(1, 1, 1),
      opacity: DEBUG_GUIDES ? 0.5 : 1
    });
    
    // Escribir "FACTURA"
    firstPage.drawText(t.text.label, {
      x: t.text.x,
      y: t.text.y,
      size: t.text.size,
      font: fontBold,
      color: rgb(0.27, 0.45, 0.72)
    });

    // 3. Escribir campos manuales
    const f = OVERLAY.fields;
    
    // Cliente (con fallback por si está vacío)
    firstPage.drawText((budget.clientName || "CLIENTE").toUpperCase(), {
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

    // Número de Factura
    firstPage.drawText(invoiceCode, {
      x: f.numero.x,
      y: f.numero.y,
      size: f.numero.size,
      font: fontBold,
      rotate: f.numero.rotateDeg ? degrees(f.numero.rotateDeg) : undefined
    });

    // 4. Generar y descargar
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const dateObj = new Date(config.date);
    const monthStr = MONTHS_ABREV_ES[dateObj.getMonth()];
    const yearStr = dateObj.getFullYear().toString().slice(-2);
    const fileName = `FACTURA_${config.number}_${monthStr}-${yearStr}.pdf`;
    
    link.download = fileName;
    link.click();

  } catch (error) {
    console.error("Error detallado al procesar PDF:", error);
    alert(`No se pudo procesar el PDF. Error: ${error instanceof Error ? error.message : 'Desconocido'}`);
  }
}

export async function generateDocx(_b: any, _c: any, _i: any) {
  alert("Generación de Word no disponible en modo Overlay.");
}
