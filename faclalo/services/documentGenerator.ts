
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
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Blue Bar on the Left
  doc.setFillColor(116, 175, 222); // Light blue from template
  doc.rect(10, 80, 10, 100, 'F');
  
  // Vertical Text in the bar
  doc.setTextColor(20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  // Save state for rotation
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 1 }));
  // Rotate and write
  doc.text(invoiceCode, 17, 130, { angle: 90 });
  doc.restoreGraphicsState();

  // 2. Header "FACTURA" (Top and Bottom)
  const drawFacturaHeader = (y: number) => {
    doc.setFontSize(42);
    doc.setFont("times", "bold");
    doc.setTextColor(116, 175, 222, 0.5); // Shadow color
    doc.text("FACTURA", pageWidth / 2, y + 1.5, { align: 'center' });
    doc.setTextColor(60, 100, 180); // Blue serif color
    doc.text("FACTURA", pageWidth / 2, y, { align: 'center' });
  };
  drawFacturaHeader(25);

  // 3. Sender Info (Eduardo Quilis Llorens)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(EMISOR_DATA.name, 35, 45);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${EMISOR_DATA.address} · ${EMISOR_DATA.city}`, 35, 52);
  doc.text(EMISOR_DATA.email, 35, 57);
  doc.text(`${EMISOR_DATA.phone} · NIF: ${EMISOR_DATA.nif}`, 35, 62);

  // 4. Client and Date fields
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 35, 75);
  doc.setFont("helvetica", "normal");
  doc.text(budget.clientName, 55, 75);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 35, 82);
  doc.setFont("helvetica", "normal");
  doc.text(config.date.split('-').reverse().join('/'), 55, 82);

  // 5. Logo placeholder (Top Right)
  doc.setFillColor(45, 55, 72); // Dark background
  doc.rect(130, 40, 65, 25, 'F');
  doc.setTextColor(255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LALO", 135, 52);
  doc.text("QUILIS", 135, 58);
  // Pink accent line
  doc.setDrawColor(230, 30, 130);
  doc.setLineWidth(2);
  doc.line(155, 45, 185, 45);
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.text("PINTURAS Y DECORACIÓN", 135, 62);

  // 6. Table
  (doc as any).autoTable({
    startY: 90,
    margin: { left: 35 },
    head: [['DESCRIPCIÓN', 'UNIDADES', 'Precio Unitario (€)', 'Precio (€)']],
    body: budget.lines.map(line => [
      line.description,
      line.units,
      line.priceUnit.toFixed(2),
      line.total.toFixed(2)
    ]),
    theme: 'grid',
    headStyles: { 
      fillColor: [51, 65, 85], // Dark blue-grey from template
      textColor: [255, 255, 255],
      fontSize: 10,
      halign: 'left'
    },
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      cellPadding: 3,
      fontSize: 9,
      font: 'helvetica'
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'left', cellWidth: 30 }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 5;

  // 7. Totals Section (Borders like the template)
  const drawTotalBox = (label: string, value: string, y: number, isFinal: boolean = false) => {
    const boxWidth = 50;
    const boxHeight = 8;
    const labelX = 130;
    const valueX = 130 + 40;
    
    // Label Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.setFont("helvetica", "bold");
    doc.rect(labelX, y, 40, boxHeight);
    doc.text(label, labelX + 2, y + 6);
    
    // Value Box
    doc.rect(valueX, y, 25, boxHeight);
    doc.text(value, valueX + 2, y + 6);
  };

  drawTotalBox("TOTAL €", budget.subtotal.toFixed(2), currentY);
  currentY += 12;
  drawTotalBox("IVA 21%", budget.iva.toFixed(2), currentY);
  currentY += 8;
  drawTotalBox("TOTAL €", budget.total.toFixed(2), currentY);

  // 8. Important Section
  currentY += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("IMPORTANTE:", 35, currentY);
  
  const points = [
    "Cualquier imprevisto o problema surgido durante la realización de la obra se facturará aparte.",
    "Los cambios necesarios debido al estado de las superficies se presupuestarán y cobrarán por separado.",
    "El 50% del valor del presupuesto se abonará antes de iniciar la obra."
  ];

  doc.setFont("helvetica", "normal");
  points.forEach((point, i) => {
    doc.text("•", 37, currentY + 8 + (i * 10));
    const splitText = doc.splitTextToSize(point, 110);
    doc.text(splitText, 42, currentY + 8 + (i * 10));
  });

  // 9. Footer Header
  drawFacturaHeader(pageHeight - 20);

  doc.save(`Factura_${invoiceCode.replace(/\s+/g, '_')}.pdf`);
}
