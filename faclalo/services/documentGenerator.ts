
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
  // Load dependencies if not present
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

    // Formatting for template
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

    // Save file
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
  
  // Header / Emisor
  doc.setFontSize(22);
  doc.setTextColor(40);
  doc.text(EMISOR_DATA.name, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`NIF: ${EMISOR_DATA.nif}`, 14, 30);
  doc.text(EMISOR_DATA.address, 14, 35);
  doc.text(EMISOR_DATA.city, 14, 40);
  doc.text(`Email: ${EMISOR_DATA.email} | Tel: ${EMISOR_DATA.phone}`, 14, 45);

  // Invoice Code
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(invoiceCode, 14, 60);
  
  // Client & Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("CLIENTE:", 14, 75);
  doc.setFont("helvetica", "bold");
  doc.text(budget.clientName, 40, 75);
  
  doc.setFont("helvetica", "normal");
  doc.text("FECHA:", 14, 82);
  doc.setFont("helvetica", "bold");
  doc.text(config.date.split('-').reverse().join('/'), 40, 82);

  // Table
  (doc as any).autoTable({
    startY: 95,
    head: [['DESCRIPCIÓN', 'UNIDADES', 'PRECIO UNIT.', 'TOTAL']],
    body: budget.lines.map(line => [
      line.description,
      line.units,
      line.priceUnit.toFixed(2) + "€",
      line.total.toFixed(2) + "€"
    ]),
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 140, finalY);
  doc.text(budget.subtotal.toFixed(2) + "€", 190, finalY, { align: 'right' });
  
  doc.text("IVA 21%:", 140, finalY + 7);
  doc.text(budget.iva.toFixed(2) + "€", 190, finalY + 7, { align: 'right' });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL:", 140, finalY + 16);
  doc.text(budget.total.toFixed(2) + "€", 190, finalY + 16, { align: 'right' });

  // Important Block
  const importantY = finalY + 35;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("IMPORTANTE:", 14, importantY);
  doc.setFont("helvetica", "normal");
  doc.text("Este documento es una factura fiscal generada según los servicios prestados.", 14, importantY + 5);
  doc.text("Por favor, realice el pago a la cuenta bancaria indicada en el presupuesto original.", 14, importantY + 10);
  doc.text("Gracias por su confianza.", 14, importantY + 15);

  doc.save(`Factura_${invoiceCode.replace(/\s+/g, '_')}.pdf`);
}
