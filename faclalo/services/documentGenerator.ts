
import { BudgetData, InvoiceConfig, EMISOR_DATA, MONTHS_ABREV_ES } from '../types';

export async function generatePdf(budget: BudgetData, config: InvoiceConfig, invoiceCode: string) {
  // @ts-ignore
  const { PDFDocument, rgb, StandardFonts } = window.PDFLib;

  try {
    // 1. Cargar la plantilla base
    const templateUrl = '/Plantilla_Factura_BASE.pdf';
    const templateBytes = await fetch(templateUrl).then(res => {
      if (!res.ok) throw new Error("No se pudo cargar la plantilla base en /public/Plantilla_Factura_BASE.pdf");
      return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // 2. TAPAR "PRESUPUESTO" Y ESCRIBIR "FACTURA"
    // Coordenadas aproximadas para tapar el título principal y posibles secundarios
    // Estas coordenadas deben ajustarse según la plantilla real
    const coverZones = [
      { x: 300, y: height - 60, w: 200, h: 40 }, // Título principal arriba derecha
    ];

    coverZones.forEach(zone => {
      firstPage.drawRectangle({
        x: zone.x,
        y: zone.y,
        width: zone.w,
        height: zone.h,
        color: rgb(1, 1, 1), // Blanco para tapar
      });
    });

    // Escribir "FACTURA" encima
    firstPage.drawText("FACTURA", {
      x: 350,
      y: height - 50,
      size: 30,
      font: fontBold,
      color: rgb(0.27, 0.45, 0.72), // Azul Lalo aprox
    });

    // 3. DIBUJAR DATOS VARIABLES
    const drawText = (text: string, x: number, y: number, size = 10, font = fontRegular, color = rgb(0,0,0)) => {
      firstPage.drawText(text, { x, y, size, font, color });
    };

    // Código Factura
    drawText(invoiceCode, 350, height - 80, 12, fontBold);

    // Fecha
    const fechaFormatted = config.date.split('-').reverse().join('/');
    drawText(`Fecha: ${fechaFormatted}`, 350, height - 95, 10, fontRegular);

    // Datos Cliente
    drawText("CLIENTE:", 50, height - 150, 9, fontBold);
    drawText(budget.clientName.toUpperCase(), 50, height - 165, 11, fontBold);

    // 4. TABLA DE LÍNEAS
    let currentY = height - 230;
    const itemX = 50;
    const qtyX = 350;
    const priceX = 420;
    const totalX = 500;
    const rowHeight = 15;

    budget.lines.slice(0, 25).forEach(line => {
      drawText(line.description.substring(0, 50), itemX, currentY, 9);
      drawText(line.units.toString(), qtyX, currentY, 9);
      drawText(line.priceUnit.toFixed(2) + "€", priceX, currentY, 9);
      drawText(line.total.toFixed(2) + "€", totalX, currentY, 9, fontBold);
      currentY -= rowHeight;
    });

    // 5. TOTALES
    const totalsY = 150;
    drawText("Subtotal:", 400, totalsY, 10, fontRegular);
    drawText(budget.subtotal.toFixed(2) + "€", 500, totalsY, 10, fontBold);

    drawText("IVA 21%:", 400, totalsY - 15, 10, fontRegular);
    drawText(budget.iva.toFixed(2) + "€", 500, totalsY - 15, 10, fontBold);

    drawText("TOTAL FACTURA:", 400, totalsY - 35, 12, fontBold, rgb(0.27, 0.45, 0.72));
    drawText(budget.total.toFixed(2) + "€", 500, totalsY - 35, 14, fontBold, rgb(0.27, 0.45, 0.72));

    // 6. GUARDAR Y DESCARGAR
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${invoiceCode.replace(/\s+/g, '_')}.pdf`;
    link.click();

  } catch (error) {
    console.error("Error generating PDF from template:", error);
    alert("Error al generar el PDF. Asegúrate de que 'Plantilla_Factura_BASE.pdf' esté en la carpeta public.");
  }
}

// Mantenemos generateDocx por compatibilidad aunque la prioridad es PDF
export async function generateDocx(budget: BudgetData, config: InvoiceConfig, invoiceCode: string) {
    // Implementación mínima o aviso de que se use PDF
    alert("Esta función está optimizada para la generación de PDF con plantilla.");
}
