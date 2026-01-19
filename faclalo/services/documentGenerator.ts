
import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

// MODO DEBUG: Dibuja bordes de colores para ajustar coordenadas
const DEBUG_GUIDES = false; 

// Configuración de Layout A4 (Ancho estándar: 595 puntos, Alto: 842)
const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

// LÍMITES ESTRICTOS (Guardrails)
const LIMITS = {
  LOGO_LEFT_X: 595,
  Y_NAME_LIMIT: 780
};

const OVERLAY = {
  // 1. Zonas de Tapado (Rectángulos Blancos 100% Opacos)
  covers: [
    // CABECERA: Tapado total del ancho superior
    { name: "top_header_cleaner", x: 0, y: 790, w: 595, h: 52 }, 
    
    // CUERPO: Tapado zona Cliente/Fecha original
    { name: "info_wipe",  x: 40,  y: 615, w: 515, h: 50 },  
  ],
  
  // 2. Posiciones de Texto Final
  texts: {
    titulo: { y: 802, size: 38, label: "FACTURA" },
    sub_datos: { y: 635, size: 11 },
    num_lateral: { x: 48, y: 550, size: 13, rotateDeg: 90 }
  }
};

export async function generatePdf(
  budget: BudgetData, 
  config: InvoiceConfig, 
  invoiceCode: string,
  _unused?: ArrayBuffer
): Promise<string> {
  const PDFLib = (window as any).PDFLib;
  if (!PDFLib) {
    throw new Error("PDF-Lib no cargada.");
  }
  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer || budget.originalBuffer.byteLength === 0) {
    throw new Error("No hay buffer del PDF original.");
  }

  try {
    const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), { 
      ignoreEncryption: true 
    });
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- PASO 1: APLICAR TODAS LAS CAPAS DE TAPADO (RECTÁNGULOS BLANCOS) ---
    
    // Tapados fijos (Header e Info Cliente)
    OVERLAY.covers.forEach(area => {
      let finalX = area.x;
      let finalY = area.y;
      let finalW = area.w;
      let finalH = area.h;

      if (area.name.startsWith("top")) {
        if (finalX + finalW > LIMITS.LOGO_LEFT_X) {
          finalW = Math.max(0, LIMITS.LOGO_LEFT_X - finalX);
        }
      }

      firstPage.drawRectangle({
        x: finalX,
        y: finalY,
        width: finalW,
        height: finalH,
        color: rgb(1, 1, 1),
        opacity: 1
      });
    });

    // TAPADO DINÁMICO: Borrado desde "IMPORTANTE" hasta el final de la página
    // Si se detectó la marca, borramos desde ese punto (más un margen de seguridad) hasta el final (y=0)
    if (budget.footerMarkerY !== undefined) {
      const safetyMargin = 15; // Para asegurar que tapamos la propia palabra "IMPORTANTE"
      const coverHeight = budget.footerMarkerY + safetyMargin;
      
      firstPage.drawRectangle({
        x: 0,
        y: 0,
        width: 595,
        height: coverHeight,
        color: rgb(1, 1, 1),
        opacity: 1
      });

      if (DEBUG_GUIDES) {
        firstPage.drawRectangle({
          x: 0, y: 0, width: 595, height: coverHeight,
          borderColor: rgb(0, 1, 0), borderWidth: 2
        });
      }
    } else {
      // Si no se encuentra "IMPORTANTE", aplicamos un tapado de pie de página mínimo por defecto
      firstPage.drawRectangle({
        x: 0,
        y: 0,
        width: 595,
        height: 60,
        color: rgb(1, 1, 1),
        opacity: 1
      });
    }

    // --- PASO 2: ESCRIBIR TEXTOS NUEVOS ENCIMA DE LOS TAPADOS ---
    
    // A. Título "FACTURA"
    const titleText = OVERLAY.texts.titulo.label;
    const titleSize = OVERLAY.texts.titulo.size;
    const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
    const centerX = (LAYOUT.width - titleWidth) / 2;

    firstPage.drawText(titleText, {
      x: centerX,
      y: OVERLAY.texts.titulo.y,
      size: titleSize,
      font: fontBold,
      color: rgb(LAYOUT.blueColor.r, LAYOUT.blueColor.g, LAYOUT.blueColor.b)
    });

    // B. Bloque "CLIENTE" + "FECHA"
    const dateFormatted = config.date.split('-').reverse().join('/');
    const cleanClient = (budget.clientName || "CLIENTE").toUpperCase();
    const fullInfoLine = `CLIENTE: ${cleanClient}      |      FECHA: ${dateFormatted}`;
    
    const infoSize = OVERLAY.texts.sub_datos.size;
    const infoWidth = fontBold.widthOfTextAtSize(fullInfoLine, infoSize);
    const infoX = (LAYOUT.width - infoWidth) / 2;

    firstPage.drawText(fullInfoLine, {
      x: infoX,
      y: OVERLAY.texts.sub_datos.y,
      size: infoSize,
      font: fontBold,
      color: rgb(0, 0, 0)
    });

    // C. Código de Factura Lateral
    firstPage.drawText(invoiceCode, {
      x: OVERLAY.texts.num_lateral.x,
      y: OVERLAY.texts.num_lateral.y,
      size: OVERLAY.texts.num_lateral.size,
      font: fontBold,
      rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
      color: rgb(0, 0, 0)
    });

    // --- PASO 3: FINALIZAR DOCUMENTO ---
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    // El navegador manejará la descarga. devolvemos el blobUrl para la Web Share API.
    return blobUrl;

  } catch (error) {
    console.error("Error en generación PDF:", error);
    throw error;
  }
}

export async function generateDocx(_b: any, _c: any, _i: any) {
  alert("El modo Word no está habilitado para el sistema de limpieza por overlay.");
}
