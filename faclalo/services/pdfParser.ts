
import { BudgetData, InvoiceLine } from '../types';

/**
 * Parses a budget PDF file using PDF.js and Gemini AI as fallback/refiner
 */
export async function parseBudgetPdf(file: File): Promise<BudgetData> {
  const arrayBuffer = await file.arrayBuffer();
  // @ts-ignore - pdfjs is loaded via CDN in index.html
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += pageText + "\n";
  }

  // Use Cloudflare Function to parse the unstructured text via Gemini
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: fullText })
    });

    if (!response.ok) throw new Error('AI parsing failed');
    
    const aiData = await response.json();
    
    return {
      id: Math.random().toString(36).substr(2, 9),
      fileName: file.name,
      clientName: aiData.clientName || "NO DETECTADO",
      date: aiData.date || "01/01/2026",
      lines: aiData.lines || [],
      subtotal: aiData.subtotal || 0,
      iva: aiData.iva || 0,
      total: aiData.total || 0
    };
  } catch (err) {
    console.error("AI Parse Error, falling back to basic regex", err);
    // Basic regex fallback if AI fails
    return fallbackRegexParser(fullText, file.name);
  }
}

function fallbackRegexParser(text: string, fileName: string): BudgetData {
  // Very basic regex to try to find some data
  const clientMatch = text.match(/Cliente:\s*([^]+?)(?=\s*Fecha:|$)/i);
  const dateMatch = text.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const totalMatch = text.match(/TOTAL\s*(?:€)?\s*(\d+[.,]\d{2})/i);
  
  const total = totalMatch ? parseFloat(totalMatch[1].replace(',', '.')) : 0;
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    fileName: fileName,
    clientName: clientMatch ? clientMatch[1].trim() : "NO DETECTADO",
    date: dateMatch ? dateMatch[1] : "01/01/2026",
    lines: [], // Table lines are hard to get with simple regex
    subtotal: total / 1.21,
    iva: total - (total / 1.21),
    total: total
  };
}
