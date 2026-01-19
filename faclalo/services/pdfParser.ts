
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
  
  // Caso 1: 3.825,00 (punto miles, coma decimal)
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } 
  // Caso 2: 3825,00 (coma decimal)
  else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  } 
  // Caso 3: 3.825 (podría ser miles o decimal)
  else if (clean.includes('.')) {
    const parts = clean.split('.');
    // Si tiene exactamente 3 dígitos tras el punto, asumimos miles (3.825 -> 3825)
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
    y: item.transform[5]
  }));

  // 1. Reconstruir líneas por coordenada Y (tolerancia de 2.5px para saltos pequeños)
  const linesMap: { [key: number]: PDFTextItem[] } = {};
  const tolerance = 2.5;

  allItems.forEach(item => {
    const foundY = Object.keys(linesMap).find(y => Math.abs(Number(y) - item.y) < tolerance);
    if (foundY) {
      linesMap[Number(foundY)].push(item);
    } else {
      linesMap[item.y] = [item];
    }
  });

  // Ordenar líneas de arriba a abajo (Y desc) y elementos de izquierda a derecha (X asc)
  const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
  const textLines = sortedY.map(y => {
    return linesMap[y]
      .sort((a, b) => a.x - b.x)
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  });

  // 2. Extracción de Totales mediante Regex (Robustos al orden y espacios)
  let detectedSubtotal: number | null = null;
  let detectedIva: number | null = null;
  let detectedTotalFinal: number | null = null;
  const warnings: string[] = [];

  textLines.forEach(line => {
    const upperLine = line.toUpperCase();
    
    // Subtotal: Busca específicamente "TOTAL €"
    if (upperLine.includes('TOTAL €')) {
      const match = line.match(/TOTAL\s*€\s*([\d.,]+\s*€?)/i);
      if (match) detectedSubtotal = cleanNumber(match[1]);
    }
    
    // IVA: Busca "IVA 21%"
    if (upperLine.includes('IVA 21%')) {
      const match = line.match(/IVA\s*21%\s*([\d.,]+\s*€?)/i);
      if (match) detectedIva = cleanNumber(match[1]);
    }
  });

  // El Total Final suele ser el último "TOTAL" que aparece (pero no el que dice "TOTAL €")
  for (let i = textLines.length - 1; i >= 0; i--) {
    const line = textLines[i];
    const upperLine = line.toUpperCase();
    if (upperLine.startsWith('TOTAL') && !upperLine.includes('TOTAL €')) {
      const match = line.match(/TOTAL\s*([\d.,]+\s*€?)/i);
      if (match) {
        detectedTotalFinal = cleanNumber(match[1]);
        break;
      }
    }
  }

  // 3. Extracción de Líneas Facturables mediante patrón de importes
  const tableLines: InvoiceLine[] = [];
  const amountWithSymbolRegex = /[\d.,]+\s*€/g; // Patrón con € explícito
  const anyAmountRegex = /[\d.,]+/g; // Patrón genérico de números

  textLines.forEach(line => {
    const upperLine = line.toUpperCase();
    
    // Filtrar ruido obvio
    if (upperLine.includes('TOTAL') || 
        upperLine.includes('IVA 21%') || 
        upperLine.includes('DESCRIPCIÓN') ||
        upperLine.includes('IMPORTANTE') ||
        upperLine.includes('CLIENTE') ||
        line.length < 5) return;

    // Buscamos líneas que contengan al menos 2 importes (Precio Unitario y Precio Total)
    // El PDF de ejemplo tiene importes con €
    const matches = line.match(amountWithSymbolRegex);
    
    if (matches && matches.length >= 2) {
      const priceStr = matches[matches.length - 1]; // Último es el total de línea
      const unitPriceStr = matches[matches.length - 2]; // Penúltimo es unitario
      
      const totalPrice = cleanNumber(priceStr);
      const unitPrice = cleanNumber(unitPriceStr);
      
      if (totalPrice !== null && unitPrice !== null) {
        // Obtenemos el texto antes de los importes para buscar las unidades
        const beforeAmounts = line.split(unitPriceStr)[0].trim();
        const parts = beforeAmounts.split(' ');
        
        let units = 1;
        let description = beforeAmounts;

        // Intentamos detectar las unidades (el último número antes del precio unitario)
        if (parts.length > 0) {
          const lastPart = parts[parts.length - 1];
          const possibleUnits = parseFloat(lastPart.replace(',', '.'));
          if (!isNaN(possibleUnits) && possibleUnits > 0) {
            units = possibleUnits;
            description = parts.slice(0, -1).join(' ').trim();
          }
        }

        tableLines.push({
          description: description.replace(/^[-•]\s*/, '').trim(),
          units,
          priceUnit: unitPrice,
          total: totalPrice
        });
      }
    }
  });

  // 4. Validación cruzada y correcciones finales
  if (tableLines.length === 0) warnings.push("No se detectaron líneas detalladas.");

  const calculatedSubtotal = tableLines.reduce((acc, l) => acc + l.total, 0);

  // Si no se detectó el literal "TOTAL €", usamos la suma de líneas
  if (detectedSubtotal === null) {
    detectedSubtotal = calculatedSubtotal;
  } else if (Math.abs(detectedSubtotal - calculatedSubtotal) > 0.1) {
    warnings.push("La suma de las líneas no coincide con el subtotal detectado.");
  }

  // Si falta IVA, lo calculamos
  if (detectedIva === null && detectedSubtotal !== null) {
    detectedIva = Math.round(detectedSubtotal * 21) / 100;
  }

  // Si falta Total Final, calculamos
  if (detectedTotalFinal === null && detectedSubtotal !== null && detectedIva !== null) {
    detectedTotalFinal = detectedSubtotal + detectedIva;
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName: "Detectado en Formulario", // Los datos de cliente se introducen manualmente en App.tsx
    date: new Date().toLocaleDateString('es-ES'),
    lines: tableLines,
    subtotal: detectedSubtotal || 0,
    iva: detectedIva || 0,
    total: detectedTotalFinal || 0,
    detectedTotals: {
      subtotal: detectedSubtotal || 0,
      iva: detectedIva || 0,
      total: detectedTotalFinal || 0
    }
  };
}
