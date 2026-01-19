
import { BudgetData, InvoiceConfig, EMISOR_DATA } from '../types';

async function loadScript(src: string) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function generateDocx(budget: BudgetData, config: InvoiceConfig, invoiceCode: string) {
  if (!(window as any).PizZip) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pizzip/3.1.4/pizzip.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/docxtemplater/3.42.3/docxtemplater.js');
  }

  try {
    const response = await fetch('/Plantilla_Factura_LALO_BASE.docx');
    if (!response.ok) throw new Error("Template not found in /public");
    
    const content = await response.arrayBuffer();
    const zip = new (window as any).PizZip(content);
    const doc = new (window as any).docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    doc.setData({
      invoice_code: invoiceCode,
      cliente: budget.clientName,
      fecha: config.date.split('-').reverse().join('/'), 
      items: budget.lines.map(l => ({
        desc: l.description,
        ud: l.units,
        pu: l.priceUnit.toFixed(2) + "€",
        tot: l.total.toFixed(2) + "€"
      })),
      subtotal: budget.subtotal.toFixed(2) + "€",
      iva: budget.iva.toFixed(2) + "€",
      total: budget.total.toFixed(2) + "€"
    });

    doc.render();
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(out);
    link.download = `Factura_${invoiceCode.replace(/\s+/g, '_')}.docx`;
    link.click();
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function generatePdf(budget: BudgetData, config: InvoiceConfig, invoiceCode: string) {
  if (!(window as any).jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js');
  }

  const { jsPDF } = (window as any).jspdf;
  const doc = new jsPDF();
  
  // --- HEADER: "FACTURA" ---
  doc.setFont("times", "normal");
  doc.setFontSize(40);
  doc.setTextColor(69, 114, 184); // Color azulado de la imagen
  doc.text("FACTURA", 105, 25, { align: 'center' });
  
  // Simulación de reflejo sutil (opcional, como en la imagen)
  doc.setTextColor(69, 114, 184, 0.2);
  doc.text("FACTURA", 105, 30, { align: 'center', angle: 0 }); // En PDF puro es difícil hacer el flip vertical, omitimos el flip por compatibilidad.

  // --- EMISOR DATA (LEFT) ---
  const leftX = 14;
  const emisorY = 50;
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(EMISOR_DATA.name, leftX, emisorY);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${EMISOR_DATA.address} · ${EMISOR_DATA.city}`, leftX, emisorY + 8);
  doc.setTextColor(0, 0, 255); // Color azul para el email (estilo link)
  doc.text(EMISOR_DATA.email, leftX, emisorY + 15);
  doc.setTextColor(0);
  doc.text(`${EMISOR_DATA.phone} · NIF: ${EMISOR_DATA.nif}`, leftX, emisorY + 22);

  // --- LOGO (RIGHT RECREATION) ---
  const logoX = 135;
  const logoY = 45;
  
  // Fondo negro del logo
  doc.setFillColor(31, 41, 55); // Gris oscuro / Negro
  doc.rect(logoX, logoY, 55, 30, 'F');
  
  // Texto "LALO"
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LALO", logoX + 2, logoY + 10);
  doc.text("QUILIS", logoX + 2, logoY + 18);
  
  // Texto inferior "PINTURAS Y DECORACIÓN"
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("PINTURAS Y DECORACIÓN", logoX + 7, logoY + 26);
  
  // Cuadrados de colores (Estilo CMYK)
  doc.setFillColor(0, 174, 239); // Cyan
  doc.rect(logoX + 40, logoY + 3, 12, 6, 'F');
  
  doc.setFillColor(236, 0, 140); // Magenta
  doc.rect(logoX + 28, logoY + 9, 24, 7, 'F');
  
  doc.setFillColor(255, 242, 0); // Yellow
  doc.rect(logoX + 36, logoY + 15, 16, 7, 'F');

  // Rodillo (Línea decorativa blanca)
  doc.setDrawColor(255);
  doc.setLineWidth(0.8);
  doc.line(logoX + 17, logoY + 10, logoX + 25, logoY + 10);
  doc.line(logoX + 25, logoY + 10, logoX + 28, logoY + 17);
  doc.line(logoX + 28, logoY + 17, logoX + 32, logoY + 17);

  // --- INVOICE INFO & CLIENT ---
  const infoY = 85;
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`Nº ${invoiceCode}`, leftX, infoY);
  doc.text(`Fecha: ${config.date.split('-').reverse().join('/')}`, 196, infoY, { align: 'right' });

  doc.setDrawColor(200);
  doc.line(leftX, infoY + 3, 196, infoY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("DATOS DEL CLIENTE:", leftX, infoY + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(budget.clientName.toUpperCase(), leftX, infoY + 18);

  // --- TABLE ---
  (doc as any).autoTable({
    startY: infoY + 25,
    head: [['DESCRIPCIÓN', 'UNIDADES', 'PRECIO UNIT.', 'TOTAL']],
    body: budget.lines.map(line => [
      line.description,
      line.units,
      line.priceUnit.toFixed(2) + "€",
      line.total.toFixed(2) + "€"
    ]),
    theme: 'striped',
    headStyles: { fillColor: [69, 114, 184], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // --- TOTALS ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Subtotal:", 140, finalY);
  doc.text(budget.subtotal.toFixed(2) + "€", 196, finalY, { align: 'right' });
  
  doc.text("IVA 21%:", 140, finalY + 7);
  doc.text(budget.iva.toFixed(2) + "€", 196, finalY + 7, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(69, 114, 184);
  doc.text("TOTAL FACTURA:", 140, finalY + 16);
  doc.text(budget.total.toFixed(2) + "€", 196, finalY + 16, { align: 'right' });

  // --- FOOTER ---
  const footerY = 270;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.setFont("helvetica", "normal");
  doc.text("Gracias por su confianza.", 105, footerY, { align: 'center' });
  doc.text(`${EMISOR_DATA.name} | NIF: ${EMISOR_DATA.nif} | Tel: ${EMISOR_DATA.phone}`, 105, footerY + 5, { align: 'center' });

  doc.save(`Factura_${invoiceCode.replace(/\s+/g, '_')}.pdf`);
}
