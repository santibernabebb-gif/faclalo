
import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 }
};

const OVERLAY = {
  covers: [
    { name: "top_header_cleaner", x: 0, y: 790, w: 595, h: 52 }, 
    { name: "info_wipe",  x: 40,  y: 615, w: 515, h: 50 },  
  ],
  texts: {
    titulo: { y: 802, size: 38, label: "FACTURA" },
    sub_datos: { y: 635, size: 11 },
    num_lateral: { x: 48, y: 550, size: 13, rotateDeg: 90 }
  }
};

export async function generatePdf(
  budget: BudgetData, 
  config: InvoiceConfig, 
  invoiceCode: string
): Promise<string> {
  const PDFLib = (window as any).PDFLib;
  if (!PDFLib) throw new Error("PDF-Lib no cargada.");
  
  const { PDFDocument, rgb, StandardFonts, degrees } = PDFLib;

  if (!budget.originalBuffer) throw new Error("No hay buffer original.");

  const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), { 
    ignoreEncryption: true 
  });
  
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // 1. Limpieza de cabecera y datos de cliente originales (Overlays superiores)
  OVERLAY.covers.forEach(area => {
    firstPage.drawRectangle({
      x: area.x,
      y: area.y,
      width: area.w,
      height: area.h,
      color: rgb(1, 1, 1),
      opacity: 1
    });
  });

  // 2. Escribir nuevos datos de cabecera
  const titleText = OVERLAY.texts.titulo.label;
  const titleSize = OVERLAY.texts.titulo.size;
  const titleWidth = fontBold.widthOfTextAtSize(titleText, titleSize);
  
  firstPage.drawText(titleText, {
    x: (LAYOUT.width - titleWidth) / 2,
    y: OVERLAY.texts.titulo.y,
    size: titleSize,
    font: fontBold,
    color: rgb(LAYOUT.blueColor.r, LAYOUT.blueColor.g, LAYOUT.blueColor.b)
  });

  const dateFormatted = config.date.split('-').reverse().join('/');
  const fullInfoLine = `CLIENTE: ${(budget.clientName || "CLIENTE").toUpperCase()}      |      FECHA: ${dateFormatted}`;
  const infoSize = OVERLAY.texts.sub_datos.size;
  const infoWidth = fontBold.widthOfTextAtSize(fullInfoLine, infoSize);

  firstPage.drawText(fullInfoLine, {
    x: (LAYOUT.width - infoWidth) / 2,
    y: OVERLAY.texts.sub_datos.y,
    size: infoSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });

  // 3. Escribir código de factura lateral
  firstPage.drawText(invoiceCode, {
    x: OVERLAY.texts.num_lateral.x,
    y: OVERLAY.texts.num_lateral.y,
    size: OVERLAY.texts.num_lateral.size,
    font: fontBold,
    rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
    color: rgb(0, 0, 0)
  });

  // 4. SOLUCIÓN OBLIGATORIA (RECORTE / CROP):
  // Eliminamos visualmente todo desde la marca 'IMPORTANTE' hacia abajo mediante CropBox.
  const DEBUG_CROP = false;
  if (budget.footerMarkerY !== undefined) {
    // AJUSTE: El punto de corte debe estar por encima de 'IMPORTANTE' pero por debajo del TOTAL.
    const EXTRA_MARGIN = 25; 
    const yImportantePdfLib = budget.footerMarkerY;
    
    // En PDF-Lib (eje Y desde abajo), sumamos para subir el corte por encima de la marca.
    let yCut = yImportantePdfLib + EXTRA_MARGIN;
    
    // PROTECCIÓN: 'MAX_CUT_Y' es el límite máximo que permitimos subir el corte.
    // Esto asegura que el bloque de IVA/TOTAL (que está arriba del pie) nunca se oculte.
    const MAX_CUT_Y = 160; 
    yCut = Math.min(yCut, MAX_CUT_Y);
    
    // Establecemos el Crop Box: define el área visible (desde yCut hasta el tope)
    const newHeight = LAYOUT.height - yCut;
    
    // Solo aplicamos si el cálculo es válido (altura positiva)
    if (newHeight > 0) {
      firstPage.setCropBox(0, yCut, LAYOUT.width, newHeight);
    }

    if (DEBUG_CROP && newHeight > 0) {
      // Línea guía visual para depuración
      firstPage.drawLine({
        start: { x: 0, y: yCut },
        end: { x: LAYOUT.width, y: yCut },
        thickness: 1,
        color: rgb(1, 0, 0),
      });
    }
  } else {
    console.warn("Palabra 'IMPORTANTE' no detectada. No se aplicará el recorte.");
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  return URL.createObjectURL(blob);
}

export async function generateDocx(
  _budget: BudgetData, 
  _config: InvoiceConfig, 
  _invoiceCode: string
) {
  alert("El modo Word no está disponible.");
}
