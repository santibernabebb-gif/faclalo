
import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

// AJUSTES DE COORDENADAS - Modo Ajuste
const DEBUG_GUIDES = false; 

// Configuración de Zonas de Intervención (Basado en el layout A4 estándar del presupuesto)
const OVERLAY_CONFIG = {
  // 1. Zonas de Tapado (Rectángulos Blancos Opacos)
  covers: [
    { name: "titulo_superior", x: 320, y: 780, w: 250, h: 50 },  // Tapa "PRESUPUESTO" cabecera
    { name: "titulo_inferior", x: 30, y: 25, w: 250, h: 45 },    // Tapa "PRESUPUESTO" pie de página
    { name: "bloque_cliente",  x: 45, y: 645, w: 350, h: 22 },   // Tapa "Cliente: [Nombre Anterior]"
    { name: "bloque_fecha",    x: 45, y: 625, w: 250, h: 20 },   // Tapa "Fecha: [Fecha Anterior]"
  ],
  // 2. Posiciones de Texto Nuevo
  texts: {
    factura_titulo: { x: 355, y: 792, size: 32, label: "FACTURA" },
    cliente_linea:  { x: 50, y: 649, size: 11 },
    fecha_linea:    { x: 50, y: 629, size: 11 },
    num_factura:    { x: 48, y: 550, size: 13, rotateDeg: 90 }
  }
};

export async function generatePdf(
  budget: BudgetData, 
  config: InvoiceConfig, 
  invoiceCode: string,
  _unused?: ArrayBuffer
) {
  const PDFLib = (window as any).PDFLib;
  if (!PDFLib) {
    alert("Error: PDF-Lib no está cargada.");
    return;
  }
  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer || budget.originalBuffer.byteLength === 0) {
    alert("El buffer del PDF original no está disponible.");
    return;
  }

  try {
    const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), { 
      ignoreEncryption: true 
    });
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; // Aplicamos cambios solo en la primera página
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- PASO 1: DIBUJAR TODOS LOS TAPADOS (RECTÁNGULOS BLANCOS) ---
    // Dibujamos primero todos los parches para que el texto nuevo quede siempre encima
    OVERLAY_CONFIG.covers.forEach(area => {
      firstPage.drawRectangle({
        x: area.x,
        y: area.y,
        width: area.w,
        height: area.h,
        color: rgb(1, 1, 1), // Blanco 100% opaco
        opacity: 1
      });

      // Si el modo debug está activo, dibujamos el borde de la zona
      if (DEBUG_GUIDES) {
        firstPage.drawRectangle({
          x: area.x, y: area.y, width: area.w, height: area.h,
          borderColor: rgb(1, 0, 0), borderWidth: 1
        });
      }
    });

    // --- PASO 2: DIBUJAR TODOS LOS TEXTOS NUEVOS ---
    const t = OVERLAY_CONFIG.texts;

    // A. Título Principal
    firstPage.drawText(t.factura_titulo.label, {
      x: t.factura_titulo.x,
      y: t.factura_titulo.y,
      size: t.factura_titulo.size,
      font: fontBold,
      color: rgb(0.27, 0.45, 0.72) // Azul corporativo
    });

    // B. Línea de Cliente (Escribimos etiqueta + valor para unificar estilo)
    const clienteTexto = `CLIENTE: ${(budget.clientName || "DATO NO DISPONIBLE").toUpperCase()}`;
    firstPage.drawText(clienteTexto, {
      x: t.cliente_linea.x,
      y: t.cliente_linea.y,
      size: t.cliente_linea.size,
      font: fontBold,
      color: rgb(0, 0, 0)
    });

    // C. Línea de Fecha
    const dateFormatted = config.date.split('-').reverse().join('/');
    const fechaTexto = `FECHA: ${dateFormatted}`;
    firstPage.drawText(fechaTexto, {
      x: t.fecha_linea.x,
      y: t.fecha_linea.y,
      size: t.fecha_linea.size,
      font: fontBold,
      color: rgb(0, 0, 0)
    });

    // D. Código de Factura (Número + Mes/Año)
    firstPage.drawText(invoiceCode, {
      x: t.num_factura.x,
      y: t.num_factura.y,
      size: t.num_factura.size,
      font: fontBold,
      rotate: t.num_factura.rotateDeg ? degrees(t.num_factura.rotateDeg) : undefined,
      color: rgb(0, 0, 0)
    });

    // --- PASO 3: GUARDAR Y DESCARGAR ---
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
    console.error("Error al aplicar overlays:", error);
    alert(`Error al generar la factura: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

export async function generateDocx(_b: any, _c: any, _i: any) {
  alert("Generación de Word no disponible en modo Overlay.");
}
