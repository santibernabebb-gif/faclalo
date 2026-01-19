
import { BudgetData, InvoiceLine } from '../types';

interface PDFTextItem {
  str: string;
  x: number;
  y: number;
}

/**
 * Normaliza números en formato español (3.825,00€ o 3825.00) a Number (3825.00)
 */
function cleanNumber(str: string): number | null {
  if (!str) return null;
  // Eliminar símbolo de euro y espacios
  let clean = str.replace(/[€\s]/g, '');
  
  // Detectar si usa coma como decimal
  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    // Formato 1.234,56 -> quitar puntos, cambiar coma por punto
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    // Formato 1234,56 -> cambiar coma por punto
    clean = clean.replace(',', '.');
  } else if (hasDot) {
    // Podría ser 1.234 (mil) o 1234.56 (decimal). 
    // Heurística: si hay exactamente 3 dígitos tras el punto, es separador de miles si no hay más puntos
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // Es muy probable que sea miles (ej: 3.825)
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
    y: item.transform[5]
  }));

  // 1. Reconstruir líneas por coordenada Y (tolerancia de 4px)
  const linesMap: { [key: number]: PDFTextItem[] } = {};
  const tolerance = 4;

  allItems.forEach(item => {
    const foundY = Object.keys(linesMap).find(y => Math.abs(Number(y) - item.y) < tolerance);
    if (foundY) {
      linesMap[Number(foundY)].push(item);
    } else {
      linesMap[item.y] = [item];
    }
  });

  // Ordenar líneas de arriba a abajo y elementos de izquierda a derecha
  const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
  const textLines = sortedY.map(y => {
    return linesMap[y]
      .sort((a, b) => a.x - b.x)
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  });

  // 2. Extracción de Totales mediante Regex
  let detectedSubtotal: number | null = null;
  let detectedIva: number | null = null;
  let detectedTotal: number | null = null;
  const warnings: string[] = [];

  textLines.forEach(line => {
    const upperLine = line.toUpperCase();
    
    // Subtotal: "TOTAL € 3825€"
    if (upperLine.includes('TOTAL €')) {
      const match = line.match(/TOTAL\s*€\s*([\d.,]+\s*€?)/i);
      if (match) detectedSubtotal = cleanNumber(match[1]);
    }
    
    // IVA: "IVA 21% 803.25€"
    if (upperLine.includes('IVA 21%')) {
      const match = line.match(/IVA\s*21%\s*([\d.,]+\s*€?)/i);
      if (match) detectedIva = cleanNumber(match[1]);
    }
  });

  // El Total Final suele ser el último "TOTAL" que aparece
  for (let i = textLines.length - 1; i >= 0; i--) {
    const line = textLines[i];
    if (line.toUpperCase().startsWith('TOTAL') && !line.toUpperCase().includes('TOTAL €')) {
      const match = line.match(/TOTAL\s*([\d.,]+\s*€?)/i);
      if (match) {
        detectedTotal = cleanNumber(match[1]);
        break;
      }
    }
  }

  // 3. Extracción de Líneas Facturables
  const tableLines: InvoiceLine[] = [];
  const amountRegex = /[\d.,]+\s*€/g;

  textLines.forEach(line => {
    const upperLine = line.toUpperCase();
    
    // Saltamos encabezados y líneas de totales
    if (upperLine.includes('TOTAL') || 
        upperLine.includes('IVA 21%') || 
        upperLine.includes('DESCRIPCIÓN') ||
        upperLine.includes('PRESUPUESTO') ||
        upperLine.includes('CLIENTE') ||
        line.length < 5) return;

    const matches = line.match(amountRegex);
    
    // Una línea válida tiene al menos 2 importes con € (Precio Unitario y Total)
    if (matches && matches.length >= 2) {
      const totalStr = matches[matches.length - 1];
      const unitPriceStr = matches[matches.length - 2];
      
      const total = cleanNumber(totalStr);
      const priceUnit = cleanNumber(unitPriceStr);
      
      if (total !== null && priceUnit !== null) {
        // Buscamos las unidades (el número que esté antes de los importes)
        const beforeAmounts = line.split(unitPriceStr)[0].trim();
        const words = beforeAmounts.split(' ');
        let units = 1;
        let description = beforeAmounts;

        // Intentamos detectar el número de unidades al final del texto restante
        const lastWord = words[words.length - 1];
        const possibleUnits = parseFloat(lastWord.replace(',', '.'));
        if (!isNaN(possibleUnits) && possibleUnits > 0 && possibleUnits < 1000) {
          units = possibleUnits;
          description = words.slice(0, -1).join(' ');
        }

        tableLines.push({
          description: description.replace(/^[-•]\s*/, '').trim(),
          units,
          priceUnit,
          total
        });
      }
    }
  });

  // 4. Validación Cruzada y Fallbacks
  if (tableLines.length === 0) warnings.push("No se detectaron líneas de detalle en la tabla.");
  
  const sumLines = tableLines.reduce((acc, l) => acc + l.total, 0);
  
  if (detectedSubtotal === null) {
    detectedSubtotal = sumLines;
  } else if (Math.abs(detectedSubtotal - sumLines) > 0.1) {
    warnings.push("El subtotal detectado no coincide con la suma de las líneas.");
  }

  if (detectedIva === null && detectedSubtotal !== null) {
    detectedIva = Math.round(detectedSubtotal * 21) / 100;
  }

  if (detectedTotal === null && detectedSubtotal !== null && detectedIva !== null) {
    detectedTotal = detectedSubtotal + detectedIva;
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName: "Detectado en Formulario", // No se pide extraer
    date: new Date().toLocaleDateString('es-ES'), // No se pide extraer
    lines: tableLines,
    subtotal: detectedSubtotal || 0,
    iva: detectedIva || 0,
    total: detectedTotal || 0,
    detectedTotals: {
      subtotal: detectedSubtotal || 0,
      iva: detectedIva || 0,
      total: detectedTotal || 0
    }
  };
}
