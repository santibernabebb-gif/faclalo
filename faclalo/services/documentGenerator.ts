
import { BudgetData, InvoiceConfig, MONTHS_ABREV_ES } from '../types';

// AJUSTES DE COORDENADAS - Modo Ajuste Final
const DEBUG_GUIDES = false; 

// Configuración de Layout A4 (Ancho estándar: 595 puntos)
const LAYOUT = {
  width: 595,
  height: 842,
  blueColor: { r: 0.27, g: 0.45, b: 0.72 } // Azul corporativo
};

const OVERLAY = {
  // 1. Zonas de Tapado (Rectángulos Blancos 100% Opacos)
  covers: [
    { name: "cabecera_total", x: 0, y: 760, w: 595, h: 82 },    // Limpia TODA la franja superior
    { name: "pie_pagina",     x: 0, y: 0, w: 595, h: 70 },      // Limpia TODO el pie de página
    { name: "bloque_datos",   x: 40, y: 615, w: 515, h: 55 },   // Limpia zona de Cliente/Fecha original
  ],
  // 2. Posiciones de Texto Final
  texts: {
    titulo: { y: 790, size: 36, label: "FACTURA" },             // Centrado horizontalmente
    sub_datos: { y: 635, size: 11 },                            // Cliente y Fecha en una línea
    num_lateral: { x: 48, y: 550, size: 13, rotateDeg: 90 }     // Código de factura lateral
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
    alert("Error: El PDF original no se ha cargado correctamente.");
    return;
  }

  try {
    const pdfDoc = await PDFDocument.load(new Uint8Array(budget.originalBuffer), { 
      ignoreEncryption: true 
    });
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- PASO 1: DIBUJAR TODOS LOS TAPADOS (RECTÁNGULOS BLANCOS) ---
    OVERLAY.covers.forEach(area => {
      firstPage.drawRectangle({
        x: area.x,
        y: area.y,
        width: area.w,
        height: area.h,
        color: rgb(1, 1, 1),
        opacity: 1
      });

      if (DEBUG_GUIDES) {
        firstPage.drawRectangle({
          x: area.x, y: area.y, width: area.w, height: area.h,
          borderColor: rgb(1, 0, 0), borderWidth: 1
        });
      }
    });

    // --- PASO 2: DIBUJAR TODOS LOS TEXTOS NUEVOS ---
    
    // A. Título "FACTURA" (Calculamos centro exacto)
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

    // B. Bloque "CLIENTE" + "FECHA" (Línea unificada y centrada)
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

    // C. Código de Factura Lateral (Nº + MES-26)
    firstPage.drawText(invoiceCode, {
      x: OVERLAY.texts.num_lateral.x,
      y: OVERLAY.texts.num_lateral.y,
      size: OVERLAY.texts.num_lateral.size,
      font: fontBold,
      rotate: degrees(OVERLAY.texts.num_lateral.rotateDeg),
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
    console.error("Error final de generación:", error);
    alert(`Error: ${error instanceof Error ? error.message : 'No se pudo generar la factura'}`);
  }
}

export async function generateDocx(_b: any, _c: any, _i: any) {
  alert("El modo de generación DOCX no está disponible con el sistema de overlays.");
}
