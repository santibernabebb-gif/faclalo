
import { BudgetData, InvoiceConfig, EMISOR_DATA, MONTHS_ABREV_ES } from '../types';

export async function generatePdf(budget: BudgetData, config: InvoiceConfig, invoiceCode: string) {
  // @ts-ignore
  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

  try {
    let pdfDoc;
    let firstPage;
    
    // 1. Intentar cargar la plantilla base
    try {
      const templateUrl = './Plantilla_Factura_BASE.pdf';
      const response = await fetch(templateUrl);
      
      if (response.ok) {
        const templateBytes = await response.arrayBuffer();
        pdfDoc = await PDFDocument.load(templateBytes);
        firstPage = pdfDoc.getPages()[0];
      } else {
        throw new Error("Template not found");
      }
    } catch (e) {
      // FALLBACK: Si no hay plantilla, creamos un documento A4 desde cero con el diseño oficial
      console.warn("Plantilla_Factura_BASE.pdf no encontrada. Generando diseño base vectorialmente.");
      pdfDoc = await PDFDocument.create();
      firstPage = pdfDoc.addPage([595.28, 841.89]); // Tamaño A4
    }

    const { width, height } = firstPage.getSize();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 2. DIBUJAR ENCABEZADO (Solo si es documento nuevo o para asegurar el estilo)
    // Fondo/Header (Si no existía plantilla)
    const isNewDoc = pdfDoc.getPages().length === 1 && !firstPage.getContents().length;
    
    if (isNewDoc) {
      // Recreación del logo y cabecera de la imagen
      // Texto "FACTURA" grande arriba
      firstPage.drawText("FACTURA", {
        x: 150,
        y: height - 60,
        size: 45,
        font: fontRegular,
        color: rgb(0.27, 0.45, 0.72),
      });

      // Datos Emisor (Izquierda)
      const emisorY = height - 120;
      firstPage.drawText(EMISOR_DATA.name, { x: 50, y: emisorY, size: 14, font: fontBold });
      firstPage.drawText(EMISOR_DATA.address + " · " + EMISOR_DATA.city, { x: 50, y: emisorY - 15, size: 10, font: fontRegular });
      firstPage.drawText(EMISOR_DATA.email, { x: 50, y: emisorY - 30, size: 10, font: fontRegular, color: rgb(0, 0, 1) });
      firstPage.drawText(EMISOR_DATA.phone + " · NIF: " + EMISOR_DATA.nif, { x: 50, y: emisorY - 45, size: 10, font: fontRegular });

      // Logo Cuadro (Derecha)
      const logoX = 380;
      const logoY = height - 160;
      firstPage.drawRectangle({ x: logoX, y: logoY, width: 160, height: 80, color: rgb(0.12, 0.16, 0.21) });
      firstPage.drawText("LALO", { x: logoX + 10, y: logoY + 50, size: 20, font: fontBold, color: rgb(1, 1, 1) });
      firstPage.drawText("QUILIS", { x: logoX + 10, y: logoY + 30, size: 20, font: fontBold, color: rgb(1, 1, 1) });
      firstPage.drawText("PINTURAS Y DECORACIÓN", { x: logoX + 15, y: logoY + 10, size: 8, font: fontRegular, color: rgb(1, 1, 1) });
      
      // Colores CMYK del logo
      firstPage.drawRectangle({ x: logoX + 120, y: logoY + 60, width: 30, height: 15, color: rgb(0, 0.68, 0.94) }); // Cyan
      firstPage.drawRectangle({ x: logoX + 100, y: logoY + 40, width: 50, height: 20, color: rgb(0.93, 0, 0.55) }); // Magenta
      firstPage.drawRectangle({ x: logoX + 115, y: logoY + 20, width: 35, height: 20, color: rgb(1, 0.95, 0) }); // Yellow
    } else {
      // Si hay plantilla, tapamos "PRESUPUESTO"
      firstPage.drawRectangle({
        x: 300, y: height - 100, width: 250, height: 80,
        color: rgb(1, 1, 1),
      });
      firstPage.drawText("FACTURA", {
        x: 350, y: height - 60, size: 35,
        font: fontBold, color: rgb(0.27, 0.45, 0.72),
      });
    }

    // 3. DATOS DE LA FACTURA
    const infoY = height - 210;
    firstPage.drawText(`Nº ${invoiceCode}`, { x: 50, y: infoY, size: 12, font: fontBold });
    const fechaFormatted = config.date.split('-').reverse().join('/');
    firstPage.drawText(`Fecha: ${fechaFormatted}`, { x: width - 150, y: infoY, size: 12, font: fontBold });

    // Línea separadora
    firstPage.drawLine({
      start: { x: 50, y: infoY - 10 },
      end: { x: width - 50, y: infoY - 10 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Cliente
    firstPage.drawText("DATOS DEL CLIENTE:", { x: 50, y: infoY - 30, size: 9, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    firstPage.drawText(budget.clientName.toUpperCase(), { x: 50, y: infoY - 45, size: 11, font: fontBold });

    // 4. TABLA DE LÍNEAS
    let currentY = infoY - 80;
    const itemX = 50;
    const qtyX = 380;
    const priceX = 440;
    const totalX = 520;
    const rowHeight = 18;

    // Encabezados de tabla
    firstPage.drawRectangle({ x: 50, y: currentY, width: width - 100, height: 20, color: rgb(0.27, 0.45, 0.72) });
    const headerY = currentY + 6;
    const drawHeader = (t: string, x: number) => firstPage.drawText(t, { x, y: headerY, size: 9, font: fontBold, color: rgb(1,1,1) });
    drawHeader("DESCRIPCIÓN", itemX + 5);
    drawHeader("UDS", qtyX);
    drawHeader("PRECIO", priceX);
    drawHeader("TOTAL", totalX);

    currentY -= rowHeight;

    budget.lines.slice(0, 22).forEach((line, idx) => {
      const y = currentY;
      // Fondo cebra
      if (idx % 2 !== 0) {
        firstPage.drawRectangle({ x: 50, y: y - 4, width: width - 100, height: rowHeight, color: rgb(0.97, 0.98, 0.99) });
      }
      
      firstPage.drawText(line.description.substring(0, 65), { x: itemX + 5, y, size: 9, font: fontRegular });
      firstPage.drawText(line.units.toString(), { x: qtyX, y, size: 9, font: fontRegular });
      firstPage.drawText(line.priceUnit.toFixed(2) + "€", { x: priceX, y, size: 9, font: fontRegular });
      firstPage.drawText(line.total.toFixed(2) + "€", { x: totalX, y, size: 9, font: fontBold });
      
      currentY -= rowHeight;
    });

    // 5. TOTALES
    const totalsY = 120;
    const rightAlignX = width - 50;
    
    const drawTotalLine = (label: string, value: string, y: number, size = 10, isBold = false) => {
      firstPage.drawText(label, { x: 400, y, size, font: isBold ? fontBold : fontRegular });
      firstPage.drawText(value, { x: rightAlignX - fontBold.widthOfTextAtSize(value, size), y, size, font: isBold ? fontBold : fontRegular });
    };

    drawTotalLine("Subtotal:", budget.subtotal.toFixed(2) + "€", totalsY);
    drawTotalLine("IVA 21%:", budget.iva.toFixed(2) + "€", totalsY - 15);
    
    firstPage.drawRectangle({ x: 390, y: totalsY - 45, width: 165, height: 25, color: rgb(0.27, 0.45, 0.72) });
    firstPage.drawText("TOTAL FACTURA:", { x: 400, y: totalsY - 38, size: 11, font: fontBold, color: rgb(1,1,1) });
    const totalStr = budget.total.toFixed(2) + "€";
    firstPage.drawText(totalStr, { x: rightAlignX - 10 - fontBold.widthOfTextAtSize(totalStr, 12), y: totalsY - 38, size: 12, font: fontBold, color: rgb(1,1,1) });

    // 6. PIE DE PÁGINA
    firstPage.drawText("Gracias por su confianza.", { x: width/2 - 50, y: 40, size: 8, font: fontRegular, color: rgb(0.6, 0.6, 0.6) });

    // GUARDAR Y DESCARGAR
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
    alert("Esta función requiere una plantilla Word en el servidor. Usa la generación de PDF que ya incluye diseño automático.");
}
