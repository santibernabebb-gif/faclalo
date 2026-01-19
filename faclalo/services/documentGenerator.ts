
import { BudgetData, InvoiceConfig, EMISOR_DATA, MONTHS_ABREV_ES } from '../types';

export async function generatePdf(
  budget: BudgetData, 
  config: InvoiceConfig, 
  invoiceCode: string,
  customTemplateBuffer?: ArrayBuffer // Nueva opción para buffer cargado
) {
  // @ts-ignore
  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

  try {
    let pdfDoc;
    let firstPage;
    let isUsingTemplate = false;
    
    // 1. PRIORIDAD: Intentar usar el buffer personalizado cargado por el usuario
    if (customTemplateBuffer) {
      try {
        pdfDoc = await PDFDocument.load(customTemplateBuffer);
        firstPage = pdfDoc.getPages()[0];
        isUsingTemplate = true;
        console.log("Usando plantilla cargada manualmente.");
      } catch (e) {
        console.error("Error cargando el buffer de plantilla personalizado.");
      }
    }

    // 2. SECUNDARIO: Si no hay buffer, intentar fetch a la ruta pública
    if (!isUsingTemplate) {
      try {
        const templateUrl = '/Plantilla_Factura_BASE.pdf'; // Cambiado de ./ a /
        const response = await fetch(templateUrl);
        
        if (response.ok) {
          const templateBytes = await response.arrayBuffer();
          pdfDoc = await PDFDocument.load(templateBytes);
          firstPage = pdfDoc.getPages()[0];
          isUsingTemplate = true;
          console.log("Plantilla cargada desde /public con éxito.");
        }
      } catch (e) {
        console.warn("Plantilla /Plantilla_Factura_BASE.pdf no encontrada en servidor.");
      }
    }

    // 3. FALLBACK: Si todo falla, diseño vectorial
    if (!isUsingTemplate) {
      console.warn("Generando diseño base vectorial por defecto.");
      pdfDoc = await PDFDocument.create();
      firstPage = pdfDoc.addPage([595.28, 841.89]);
    }

    const { width, height } = firstPage.getSize();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // DIBUJAR ENCABEZADO SEGÚN MODO
    if (!isUsingTemplate) {
      // DISEÑO VECTORIAL
      firstPage.drawText("FACTURA", { x: 50, y: height - 60, size: 40, font: fontBold, color: rgb(0.27, 0.45, 0.72) });
      const emisorY = height - 120;
      firstPage.drawText(EMISOR_DATA.name, { x: 50, y: emisorY, size: 12, font: fontBold });
      firstPage.drawText(EMISOR_DATA.address, { x: 50, y: emisorY - 15, size: 9, font: fontRegular });
      firstPage.drawText(EMISOR_DATA.city, { x: 50, y: emisorY - 28, size: 9, font: fontRegular });
      firstPage.drawText(EMISOR_DATA.email, { x: 50, y: emisorY - 41, size: 9, font: fontRegular, color: rgb(0, 0, 0.8) });
      firstPage.drawText(`NIF: ${EMISOR_DATA.nif} · Tel: ${EMISOR_DATA.phone}`, { x: 50, y: emisorY - 54, size: 9, font: fontRegular });

      const logoX = 380;
      const logoY = height - 140;
      firstPage.drawRectangle({ x: logoX, y: logoY, width: 160, height: 80, color: rgb(0.12, 0.16, 0.21) });
      firstPage.drawText("LALO", { x: logoX + 10, y: logoY + 50, size: 22, font: fontBold, color: rgb(1, 1, 1) });
      firstPage.drawText("QUILIS", { x: logoX + 10, y: logoY + 28, size: 22, font: fontBold, color: rgb(1, 1, 1) });
      firstPage.drawText("PINTURAS Y DECORACIÓN", { x: logoX + 12, y: logoY + 10, size: 8, font: fontRegular, color: rgb(1, 1, 1) });
      firstPage.drawRectangle({ x: logoX + 120, y: logoY + 60, width: 30, height: 15, color: rgb(0, 0.68, 0.94) });
      firstPage.drawRectangle({ x: logoX + 105, y: logoY + 40, width: 45, height: 20, color: rgb(0.93, 0, 0.55) });
      firstPage.drawRectangle({ x: logoX + 115, y: logoY + 20, width: 35, height: 20, color: rgb(1, 0.95, 0) });
    } else {
      // SOBRE PLANTILLA
      firstPage.drawRectangle({ x: 200, y: height - 100, width: 350, height: 80, color: rgb(1, 1, 1) });
      firstPage.drawText("FACTURA", { x: 350, y: height - 60, size: 35, font: fontBold, color: rgb(0.27, 0.45, 0.72) });
    }

    // DATOS DE LA FACTURA
    const infoY = height - 210;
    firstPage.drawText(`Nº ${invoiceCode}`, { x: 50, y: infoY, size: 12, font: fontBold });
    const fechaFormatted = config.date.split('-').reverse().join('/');
    firstPage.drawText(`Fecha: ${fechaFormatted}`, { x: width - 180, y: infoY, size: 12, font: fontBold });

    firstPage.drawLine({ start: { x: 50, y: infoY - 10 }, end: { x: width - 50, y: infoY - 10 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    firstPage.drawText("DATOS DEL CLIENTE:", { x: 50, y: infoY - 30, size: 9, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    firstPage.drawText(budget.clientName.toUpperCase(), { x: 50, y: infoY - 45, size: 11, font: fontBold });

    // TABLA
    let currentY = infoY - 80;
    const itemX = 50;
    const qtyX = 380;
    const priceX = 440;
    const totalX = 520;
    const rowHeight = 18;

    firstPage.drawRectangle({ x: 50, y: currentY, width: width - 100, height: 20, color: rgb(0.27, 0.45, 0.72) });
    const headerY = currentY + 6;
    firstPage.drawText("DESCRIPCIÓN", { x: itemX + 5, y: headerY, size: 9, font: fontBold, color: rgb(1,1,1) });
    firstPage.drawText("UDS", { x: qtyX, y: headerY, size: 9, font: fontBold, color: rgb(1,1,1) });
    firstPage.drawText("PRECIO", { x: priceX, y: headerY, size: 9, font: fontBold, color: rgb(1,1,1) });
    firstPage.drawText("TOTAL", { x: totalX, y: headerY, size: 9, font: fontBold, color: rgb(1,1,1) });

    currentY -= rowHeight;

    budget.lines.slice(0, 25).forEach((line, idx) => {
      if (idx % 2 !== 0) {
        firstPage.drawRectangle({ x: 50, y: currentY - 4, width: width - 100, height: rowHeight, color: rgb(0.97, 0.98, 0.99) });
      }
      firstPage.drawText(line.description.substring(0, 65), { x: itemX + 5, y: currentY, size: 9, font: fontRegular });
      firstPage.drawText(line.units.toString(), { x: qtyX, y: currentY, size: 9, font: fontRegular });
      firstPage.drawText(line.priceUnit.toFixed(2) + "€", { x: priceX, y: currentY, size: 9, font: fontRegular });
      firstPage.drawText(line.total.toFixed(2) + "€", { x: totalX, y: currentY, size: 9, font: fontBold });
      currentY -= rowHeight;
    });

    // TOTALES
    const totalsY = 120;
    const rightAlignX = width - 50;
    
    firstPage.drawText("Subtotal:", { x: 400, y: totalsY, size: 10, font: fontRegular });
    const subStr = budget.subtotal.toFixed(2) + "€";
    firstPage.drawText(subStr, { x: rightAlignX - fontBold.widthOfTextAtSize(subStr, 10), y: totalsY, size: 10, font: fontBold });

    firstPage.drawText("IVA 21%:", { x: 400, y: totalsY - 15, size: 10, font: fontRegular });
    const ivaStr = budget.iva.toFixed(2) + "€";
    firstPage.drawText(ivaStr, { x: rightAlignX - fontBold.widthOfTextAtSize(ivaStr, 10), y: totalsY - 15, size: 10, font: fontBold });
    
    firstPage.drawRectangle({ x: 390, y: totalsY - 45, width: 165, height: 25, color: rgb(0.27, 0.45, 0.72) });
    firstPage.drawText("TOTAL FACTURA:", { x: 400, y: totalsY - 38, size: 11, font: fontBold, color: rgb(1,1,1) });
    const totalStr = budget.total.toFixed(2) + "€";
    firstPage.drawText(totalStr, { x: rightAlignX - 10 - fontBold.widthOfTextAtSize(totalStr, 12), y: totalsY - 38, size: 12, font: fontBold, color: rgb(1,1,1) });

    firstPage.drawText("Gracias por su confianza.", { x: width/2 - 50, y: 40, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${invoiceCode.replace(/\s+/g, '_')}.pdf`;
    link.click();

  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Ocurrió un error al generar el PDF. Revisa la consola.");
  }
}

export async function generateDocx(budget: BudgetData, config: InvoiceConfig, invoiceCode: string) {
    alert("Función no implementada. Use la generación de PDF.");
}
