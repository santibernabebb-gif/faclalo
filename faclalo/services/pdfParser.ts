
import { BudgetData, InvoiceLine } from '../types';

interface PDFTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

/**
 * Normaliza números en formato español (3.825,00€, 3825€, 3825.00) a Number (3825.00)
 */
function cleanNumber(str: string): number | null {
  if (!str) return null;
  // Eliminar símbolo de euro, unidades de medida pegadas y espacios
  let clean = str.replace(/[€\s]/g, '').trim();
  
  if (!clean) return null;

  // Caso 1: 3.825,00 (punto miles, coma decimal)
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } 
  // Caso 2: 3825,00 (solo coma decimal)
  else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } 
  // Caso 3: 3.825 (podría ser miles o decimal)
  else if (clean.includes('.')) {
    const parts = clean.split('.');
    // Heurística: Si hay exactamente 3 dígitos tras el punto, asumimos miles (3.825 -> 3825)
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

export async function parseBudgetPdf(file: File): Promise<BudgetData> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  const allItems: PDFTextItem[] = textContent.items.map((item: any) => ({
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width
  }));

  // 1. AGRUPAR POR LÍNEAS (Eje Y con tolerancia)
  const linesMap: { [key: number]: PDFTextItem[] } = {};
  const yTolerance = 3.0;

  allItems.forEach(item => {
    const foundY = Object.keys(linesMap).find(y => Math.abs(Number(y) - item.y) < yTolerance);
    if (foundY) {
      linesMap[Number(foundY)].push(item);
    } else {
      linesMap[item.y] = [item];
    }
  });

  const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
  const rows = sortedY.map(y => linesMap[y].sort((a, b) => a.x - b.x));
  const textLines = rows.map(items => items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim());

  // 2. EXTRACCIÓN DE TOTALES (Regex Robusto)
  let subtotal: number | null = null;
  let iva: number | null = null;
  let totalFinal: number | null = null;
  const warnings: string[] = [];

  textLines.forEach(line => {
    const upper = line.toUpperCase();
    // Subtotal: "TOTAL € 3825"
    if (upper.includes('TOTAL €')) {
      const match = line.match(/TOTAL\s*€\s*([\d.,]+)/i);
      if (match) subtotal = cleanNumber(match[1]);
    }
    // IVA: "IVA 21% 803.25"
    if (upper.includes('IVA 21%')) {
      const match = line.match(/IVA\s*21%\s*([\d.,]+)/i);
      if (match) iva = cleanNumber(match[1]);
    }
  });

  // El Total Final suele ser el ÚLTIMO "TOTAL" (que no sea el de "TOTAL €")
  for (let i = textLines.length - 1; i >= 0; i--) {
    const line = textLines[i];
    const upper = line.toUpperCase();
    if (upper.startsWith('TOTAL') && !upper.includes('TOTAL €')) {
      const match = line.match(/TOTAL\s*([\d.,]+)/i);
      if (match) {
        totalFinal = cleanNumber(match[1]);
        break;
      }
    }
  }

  // 3. EXTRACCIÓN DE LÍNEAS (Doble Método)
  const extractedLines: InvoiceLine[] = [];
  
  // METODO 1: Detección por Cabeceras
  let headerX: { desc?: number, units?: number, pu?: number, price?: number } = {};
  let headerRowIndex = -1;

  rows.forEach((rowItems, idx) => {
    const rowText = rowItems.map(i => i.str.toUpperCase()).join(' ');
    if (rowText.includes('DESCRIPCIÓN') || rowText.includes('DESCRIPCION')) {
      headerRowIndex = idx;
      rowItems.forEach(item => {
        const s = item.str.toUpperCase();
        if (s.includes('DESCRIP')) headerX.desc = item.x;
        if (s.includes('UNIDADES') || s.includes('UDS')) headerX.units = item.x;
        if (s.includes('UNITARIO')) headerX.pu = item.x;
        if (s.includes('PRECIO') && !s.includes('UNITARIO')) headerX.price = item.x;
      });
    }
  });

  // Si encontramos cabeceras, usamos zonas X
  if (headerX.desc !== undefined && headerX.price !== undefined) {
    const colUnits = headerX.units || (headerX.desc + (headerX.pu || headerX.price) - headerX.desc) / 1.5;
    const colPU = headerX.pu || (colUnits + headerX.price) / 2;
    
    // Procesar filas debajo del header y antes de los totales
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const rowItems = rows[i];
      const lineText = rowItems.map(it => it.str).join(' ');
      if (lineText.toUpperCase().includes('TOTAL') || lineText.toUpperCase().includes('IMPORTANTE')) break;

      let descParts: string[] = [];
      let unitsVal: number | null = null;
      let puVal: number | null = null;
      let priceVal: number | null = null;

      rowItems.forEach(item => {
        const val = cleanNumber(item.str);
        if (item.x < (colUnits - 10)) {
          descParts.push(item.str);
        } else if (item.x < (colPU - 10)) {
          if (val !== null) unitsVal = val;
        } else if (item.x < (headerX.price! - 10)) {
          if (val !== null) puVal = val;
        } else {
          if (val !== null) priceVal = val;
        }
      });

      if (priceVal !== null) {
        extractedLines.push({
          description: descParts.join(' ').trim(),
          units: unitsVal ?? 1,
          priceUnit: puVal ?? priceVal,
          total: priceVal
        });
      }
    }
  }

  // METODO 2: Fallback por Patrón de Texto (Si el Método 1 falló o no dio resultados)
  if (extractedLines.length === 0) {
    const amountWithEuro = /([\d.,]+\s*€)/g;
    const anyNumber = /([\d.,]+)/g;

    textLines.forEach(line => {
      const upper = line.toUpperCase();
      if (upper.includes('TOTAL') || upper.includes('IVA') || upper.includes('DESCRIP') || line.length < 10) return;

      const matches = line.match(amountWithEuro) || line.match(anyNumber);
      if (matches && matches.length >= 2) {
        // En un presupuesto estándar: [Unidades?] ... [Precio Unitario] [Precio Total]
        const pTotal = cleanNumber(matches[matches.length - 1]);
        const pUnit = cleanNumber(matches[matches.length - 2]);
        
        if (pTotal !== null && pUnit !== null) {
          const parts = line.split(matches[matches.length - 2]);
          const descriptionRaw = parts[0].trim();
          
          // Intentar sacar unidades del final de la descripción
          const descWords = descriptionRaw.split(' ');
          let units = 1;
          let description = descriptionRaw;
          
          if (descWords.length > 1) {
            const lastWord = descWords[descWords.length - 1];
            const u = parseFloat(lastWord.replace(',', '.'));
            if (!isNaN(u) && u > 0 && u < 1000) {
              units = u;
              description = descWords.slice(0, -1).join(' ');
            }
          }

          extractedLines.push({
            description: description.replace(/^[-•]\s*/, '').trim(),
            units,
            priceUnit: pUnit,
            total: pTotal
          });
        }
      }
    });
  }

  // 4. VALIDACIÓN CRUZADA
  const sumLines = extractedLines.reduce((acc, l) => acc + l.total, 0);
  
  if (subtotal === null) {
    subtotal = sumLines;
  } else if (Math.abs(subtotal - sumLines) > 0.1) {
    warnings.push("Aviso: El subtotal del PDF no coincide con la suma de las líneas.");
  }

  if (iva === null) iva = Math.round(subtotal * 21) / 100;
  if (totalFinal === null) totalFinal = subtotal + iva;

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName: "Detectado en Formulario", 
    date: new Date().toLocaleDateString('es-ES'),
    lines: extractedLines,
    subtotal: subtotal || 0,
    iva: iva || 0,
    total: totalFinal || 0,
    detectedTotals: {
      subtotal: subtotal || 0,
      iva: iva || 0,
      total: totalFinal || 0
    }
  };
}
