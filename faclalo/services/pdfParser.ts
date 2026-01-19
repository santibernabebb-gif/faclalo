
import { BudgetData, InvoiceLine } from '../types';

interface PDFTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function parseBudgetPdf(file: File): Promise<BudgetData> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let allItems: PDFTextItem[] = [];
  
  // Solo procesamos la primera página para el presupuesto base
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  allItems = textContent.items.map((item: any) => ({
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width,
    height: item.height
  }));

  // Agrupar por líneas (Y con tolerancia)
  const lines: PDFTextItem[][] = [];
  const tolerance = 3;
  
  allItems.sort((a, b) => b.y - a.y); // De arriba a abajo
  
  allItems.forEach(item => {
    let line = lines.find(l => Math.abs(l[0].y - item.y) < tolerance);
    if (line) {
      line.push(item);
    } else {
      lines.push([item]);
    }
  });
  
  // Ordenar cada línea por X
  lines.forEach(l => l.sort((a, b) => a.x - b.x));

  // Extracción de datos específicos
  let clientName = "NO DETECTADO";
  let budgetDate = new Date().toLocaleDateString('es-ES');
  let tableLines: InvoiceLine[] = [];
  let detectedSubtotal = 0;
  let detectedIva = 0;
  let detectedTotal = 0;

  lines.forEach(lineItems => {
    const lineText = lineItems.map(i => i.str).join(" ");
    
    // 1. Buscar Cliente
    if (lineText.includes("Cliente:") || lineText.includes("CLIENTE:")) {
      const parts = lineText.split(/Cliente:|CLIENTE:/i);
      if (parts[1]) clientName = parts[1].trim();
    }
    
    // 2. Buscar Fecha
    const dateMatch = lineText.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch && (lineText.includes("Fecha") || lineText.includes("FECHA"))) {
      budgetDate = dateMatch[1];
    }

    // 3. Detectar Líneas de Tabla (Heurística por coordenadas X)
    // Suponemos que la tabla tiene Description (izquierda), Units, Price, Total
    // Basado en el layout típico del presupuesto ejemplo:
    // Cantidad suele estar en x ~ 120-150
    // Precio Unitario en x ~ 160-180
    // Importe en x ~ 190+
    
    // Detectamos si la línea parece una fila de producto (tiene números al final)
    const lastItem = lineItems[lineItems.length - 1];
    const secondLast = lineItems[lineItems.length - 2];
    
    if (lineItems.length >= 3) {
      const priceMatch = lastItem.str.match(/(\d+[.,]\d{2})/);
      if (priceMatch && lastItem.x > 180) {
        // Es probable que sea una línea de tabla
        const total = parseFloat(priceMatch[1].replace(',', '.'));
        const units = parseFloat(lineItems[lineItems.length - 3]?.str.replace(',', '.')) || 1;
        const priceUnit = parseFloat(lineItems[lineItems.length - 2]?.str.replace(',', '.')) || total / units;
        
        // La descripción es todo lo anterior
        const desc = lineItems.slice(0, lineItems.length - 3).map(i => i.str).join(" ").trim();
        
        if (desc && !isNaN(total) && !lineText.includes("TOTAL")) {
          tableLines.push({
            description: desc,
            units,
            priceUnit,
            total
          });
        }
      }
    }

    // 4. Totales
    if (lineText.includes("SUBTOTAL")) {
       const match = lineText.match(/(\d+[.,]\d{2})/);
       if (match) detectedSubtotal = parseFloat(match[1].replace(',', '.'));
    }
    if (lineText.includes("IVA 21%")) {
       const match = lineText.match(/(\d+[.,]\d{2})/);
       if (match) detectedIva = parseFloat(match[1].replace(',', '.'));
    }
    if (lineText.includes("TOTAL") && !lineText.includes("IVA") && !lineText.includes("SUBTOTAL")) {
       const match = lineText.match(/(\d+[.,]\d{2})/);
       if (match) detectedTotal = parseFloat(match[1].replace(',', '.'));
    }
  });

  // Si no se detectaron líneas pero sí totales, creamos una línea genérica o dejamos vacío
  const subtotal = tableLines.reduce((acc, l) => acc + l.total, 0) || detectedSubtotal;
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName,
    date: budgetDate,
    lines: tableLines,
    subtotal: subtotal,
    iva: iva,
    total: total,
    detectedTotals: {
      subtotal: detectedSubtotal,
      iva: detectedIva,
      total: detectedTotal
    }
  };
}
