
import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

// MODO DEBUG: Dibuja bordes de colores para ajustar coordenadas sin desperdiciar papel
const DEBUG_GUIDES = false; 

// Configuración de Layout A4 (Ancho estándar: 595 puntos, Alto: 842)
const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

// LÍMITES ESTRICTOS (Guardrails)
const LIMITS = {
  LOGO_LEFT_X: 585,    // Aumentado para permitir el tapado de restos a la derecha del título
  Y_NAME_LIMIT: 780    // Límite inferior para no cortar "Eduardo Quilis Llorens"
};

const OVERLAY = {
  // 1. Zonas de Tapado (Rectángulos Blancos 100% Opacos)
  // Se dibujan ANTES que cualquier texto nuevo
  covers: [
    // CABECERA: Tapado ensanchado significativamente hacia la derecha para cubrir restos de "PRESUPUESTO"
    { name: "top_header_cleaner", x: 10, y: 790, w: 575, h: 52 }, 
    
    // CUERPO: Tapado zona Cliente/Fecha original
    { name: "info_wipe",  x: 40,  y: 615, w: 515, h: 50 },  
    
    // PIE: Limpieza inferior bajada drásticamente (altura mínima para que quede en el borde inferior)
    { name: "footer_wipe", x: 0,   y: 0,   w: 595, h: 10 }, 
  ],
  
  // 2. Posiciones de Texto Final
  texts: {
    titulo: { y: 802, size: 38, label: "FACTURA" },              // Centrado y elevado para limpieza
    sub_datos: { y: 635, size: 11 },                             // Cliente y Fecha unificados
    num_lateral: { x: 48, y: 550, size: 13, rotateDeg: 90 }      // Código factura lateral
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
    alert("Error: PDF-Lib no cargada.");
    return;
  }
  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer || budget.originalBuffer.byteLength === 0) {
    alert("Error: No hay buffer del PDF original.");
    return;
  }

  try {
    const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), { 
      ignoreEncryption: true 
    });
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- PASO 1: APLICAR TODAS LAS CAPAS DE TAPADO (RECTÁNGULOS BLANCOS) ---
    OVERLAY.covers.forEach(area => {
      let finalX = area.x;
      let finalY = area.y;
      let finalW = area.w;
      let finalH = area.h;

      // APLICAR GUARDRAILS A LOS TAPADOS DEL HEADER
      if (area.name.startsWith("top")) {
        // Guardrail X: No invadir el margen extremo derecho más de lo necesario
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

      if (DEBUG_GUIDES) {
        // Rojo: El tapado aplicado
        firstPage.drawRectangle({
          x: finalX, y: finalY, width: finalW, height: finalH,
          borderColor: rgb(1, 0, 0), borderWidth: 0.5
        });
        // Verde: Límite del Logo
        firstPage.drawLine({
          start: { x: LIMITS.LOGO_LEFT_X, y: 750 },
          end: { x: LIMITS.LOGO_LEFT_X, y: 842 },
          thickness: 1, color: rgb(0, 0.8, 0)
        });
      }
    });

    // --- PASO 2: ESCRIBIR TEXTOS NUEVOS ENCIMA DE LOS TAPADOS ---
    
    // A. Título "FACTURA" (Centrado horizontal sobre el total de la página)
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

    // B. Bloque "CLIENTE" + "FECHA" (Línea centrada unificada)
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

    // C. Código de Factura Lateral (Vertical)
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
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    const dateObj = new Date(config.date);
    const monthStr = MONTHS_ABREV_ES[dateObj.getMonth()];
    const yearStr = dateObj.getFullYear().toString().slice(-2);
    const fileName = `FACTURA_${config.number}_${monthStr}-${yearStr}.pdf`;
    
    link.download = fileName;
    link.click();

  } catch (error) {
    console.error("Error en generación PDF:", error);
    alert(`Error: ${error instanceof Error ? error.message : 'Error al procesar el overlay'}`);
  }
}

export async function generateDocx(_b: any, _c: any, _i: any) {
  alert("El modo Word no está habilitado para el sistema de limpieza por overlay.");
}
