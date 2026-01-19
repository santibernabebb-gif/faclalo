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

  // 1. Blue Bar on the Left (positioned exactly as in template)
  doc.setFillColor(116, 175, 222); 
  doc.rect(20, 100, 15, 90, 'F');
  
  // Vertical Text in the bar
  doc.setTextColor(20);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.saveGraphicsState();
  doc.text(invoiceCode, 31, 145, { angle: 90, align: 'center' });
  doc.restoreGraphicsState();

  // 2. Header "FACTURA" (Top)
  const drawFacturaHeader = (y: number) => {
    doc.setFontSize(48);
    doc.setFont("times", "bold");
    // Reflection effect
    doc.setTextColor(116, 175, 222, 0.3);
    doc.text("FACTURA", pageWidth / 2, y + 2, { align: 'center' });
    doc.setTextColor(60, 100, 180); 
    doc.text("FACTURA", pageWidth / 2, y, { align: 'center' });
  };
  drawFacturaHeader(25);

  // 3. Sender Info
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(EMISOR_DATA.name, 45, 45);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${EMISOR_DATA.address} · ${EMISOR_DATA.city}`, 45, 52);
  doc.text(EMISOR_DATA.email, 45, 57);
  doc.text(`${EMISOR_DATA.phone} · NIF: ${EMISOR_DATA.nif}`, 45, 62);

  // 4. Client and Date (Aligned with labels)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 45, 78);
  doc.setFont("helvetica", "normal");
  doc.text(budget.clientName || "", 62, 78);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 45, 86);
  doc.setFont("helvetica", "normal");
  const formattedDate = config.date.includes('-') ? config.date.split('-').reverse().join('/') : config.date;
  doc.text(formattedDate, 62, 86);

  // 5. Logo placeholder (Top Right)
  doc.setFillColor(45, 55, 72); 
  doc.rect(125, 40, 65, 28, 'F');
  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("LALO", 130, 52);
  doc.text("QUILIS", 130, 60);
  // Color bars in logo
  doc.setFillColor(230, 30, 130); doc.rect(155, 45, 10, 8, 'F'); // Pink
  doc.setFillColor(0, 174, 239); doc.rect(175, 45, 10, 8, 'F');  // Cyan
  doc.setFillColor(255, 242, 0); doc.rect(175, 55, 10, 8, 'F');  // Yellow
  
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.text("PINTURAS Y DECORACIÓN", 130, 65);

  // 6. Table (Matching template headers and colors)
  (doc as any).autoTable({
    startY: 95,
    margin: { left: 45, right: 20 },
    head: [['DESCRIPCION', 'UNIDADES', 'Precio Unitario (€)', 'Precio (€)']],
    body: budget.lines.length > 0 ? budget.lines.map(line => [
      line.description,
      line.units,
      line.priceUnit.toFixed(2),
      line.total.toFixed(2)
    ]) : [['', '', '', '']], // Placeholder row if empty
    theme: 'grid',
    headStyles: { 
      fillColor: [71, 85, 105], // Slate 600
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 3,
      fontSize: 9,
      font: 'helvetica',
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 25 },
      3: { halign: 'left', cellWidth: 25 }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // 7. Totals Boxes (Precise styling like image)
  const drawTotalBox = (label: string, value: string, y: number, isFinal: boolean = false) => {
    const boxLabelWidth = 40;
    const boxValueWidth = 25;
    const startX = 125;
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.setFont("helvetica", "bold");
    
    // Label box
    doc.rect(startX, y, boxLabelWidth, 8);
    doc.text(label, startX + 2, y + 6);
    
    // Value box
    doc.rect(startX + boxLabelWidth, y, boxValueWidth, 8);
    doc.text(value + " €", startX + boxLabelWidth + 2, y + 6);
  };

  drawTotalBox("TOTAL €", budget.subtotal.toFixed(2), currentY);
  currentY += 15;
  drawTotalBox("IVA 21%", budget.iva.toFixed(2), currentY);
  currentY += 8;
  drawTotalBox("TOTAL €", budget.total.toFixed(2), currentY);

  // 8. Important Section
  currentY += 15;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold", "italic");
  doc.text("IMPORTANTE:", 45, currentY);
  doc.line(45, currentY + 1, 72, currentY + 1);
  
  const points = [
    "Cualquier imprevisto o problema surgido durante la realización de la obra se facturará aparte.",
    "Los cambios necesarios debido al estado de las superficies se presupuestarán y cobrarán por separado.",
    "El 50% del valor del presupuesto se abonará antes de iniciar la obra."
  ];

  doc.setFont("helvetica", "bold");
  points.forEach((point, i) => {
    doc.text("•", 55, currentY + 8 + (i * 12));
    const splitText = doc.splitTextToSize(point, 110);
    doc.text(splitText, 62, currentY + 8 + (i * 12));
  });

  // 9. Footer Header (Bottom)
  drawFacturaHeader(pageHeight - 20);

  doc.save(`Factura_${invoiceCode.replace(/\s+/g, '_')}.pdf`);
}