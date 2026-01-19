
import { BudgetData, InvoiceLine } from '../types';

interface PDFTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

export async function parseBudgetPdf(file: File): Promise<BudgetData> {
  const arrayBuffer = await file.arrayBuffer();
  const bufferForPdfJs = arrayBuffer.slice(0);
  
  // @ts-ignore
  const pdf = await window.pdfjsLib.getDocument({ data: bufferForPdfJs }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  const allItems: PDFTextItem[] = textContent.items.map((item: any) => ({
    str: item.str,
    x: item.transform[4],
    y: item.transform[5],
    width: item.width
  }));

  const textLines = allItems.map(i => i.str).join(' ');
  let detectedClient = "CLIENTE DETECTADO";
  
  const lowerText = textLines.toLowerCase();
  const markers = ["cliente:", "señor/a:", "atn:"];
  
  for (const marker of markers) {
    const idx = lowerText.indexOf(marker);
    if (idx !== -1) {
      const start = idx + marker.length;
      detectedClient = textLines.substring(start, start + 30).trim().split('\n')[0];
      break;
    }
  }

  // Búsqueda dinámica de la marca "IMPORTANTE"
  let footerMarkerY: number | undefined = undefined;
  
  // Agrupamos por líneas aproximadas para detectar "IMPORTANTE" si está roto en varios items
  for (const item of allItems) {
    if (item.str.toUpperCase().includes("IMPORTANTE")) {
      // Queremos el IMPORTANTE que esté más arriba (Y mayor en PDF) 
      // para borrar todo desde ahí hacia abajo.
      if (footerMarkerY === undefined || item.y > footerMarkerY) {
        footerMarkerY = item.y;
      }
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    clientName: detectedClient,
    date: new Date().toLocaleDateString('es-ES'),
    lines: [],
    subtotal: 0,
    iva: 0,
    total: 0,
    originalBuffer: arrayBuffer,
    footerMarkerY
  };
}
