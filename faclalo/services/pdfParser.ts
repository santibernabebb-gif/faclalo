
import { BudgetData, InvoiceLine } from '../types';

interface PDFTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

function cleanNumber(str: string): number | null {
  if (!str) return null;
  let clean = str.replace(/[€\s]/g, '').trim();
  if (!clean) return null;
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
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

  // Extracción mínima solo para que la UI tenga algo que mostrar
  const textLines = allItems.map(i => i.str).join(' ');
  let detectedClient = "Cliente Detectado";
  
  // Si encontramos "Cliente:" intentamos pillar lo siguiente
  const clientIdx = textLines.indexOf("Cliente:");
  if (clientIdx !== -1) {
    const afterClient = textLines.substring(clientIdx + 8, clientIdx + 50).trim();
    if (afterClient) detectedClient = afterClient.split('\n')[0];
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName: detectedClient,
    date: new Date().toLocaleDateString('es-ES'),
    lines: [], // No necesitamos las líneas para el modo overlay
    subtotal: 0,
    iva: 0,
    total: 0,
    originalBuffer: arrayBuffer // IMPORTANTE: Guardamos el PDF original
  };
}
