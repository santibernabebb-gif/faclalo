import { GoogleGenAI, Type } from "@google/genai";

export const onRequest = async (context: any) => {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text } = await context.request.json() as { text: string };
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Eres un experto en extracción de datos de presupuestos de reformas y pintura. 
      Analiza el siguiente texto extraído de un PDF y genera un objeto JSON con la información solicitada.
      
      INSTRUCCIONES CRÍTICAS:
      1. Busca el NOMBRE DEL CLIENTE: Suele aparecer después de palabras como "Cliente:", "A la atención de:", o cerca de la dirección de entrega. Si no lo encuentras, busca nombres de personas físicas o empresas en el encabezado.
      2. Busca la FECHA: En formato dd/mm/aaaa.
      3. Extrae la TABLA DE CONCEPTOS: Identifica cada línea de trabajo. 
         - Descripción: El servicio realizado.
         - Unidades: Cantidad (si no hay, pon 1).
         - Precio Unitario: El coste por unidad.
         - Total: El resultado de unidades * precio unitario.
      4. Totales: Calcula el subtotal (suma de líneas), el IVA (21% del subtotal) y el Total Final.
      
      TEXTO DEL PRESUPUESTO:
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING, description: "Nombre completo del cliente" },
            date: { type: Type.STRING, description: "Fecha en formato dd/mm/aaaa" },
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  units: { type: Type.NUMBER },
                  priceUnit: { type: Type.NUMBER },
                  total: { type: Type.NUMBER }
                },
                required: ["description", "units", "priceUnit", "total"]
              }
            },
            subtotal: { type: Type.NUMBER },
            iva: { type: Type.NUMBER },
            total: { type: Type.NUMBER }
          },
          required: ["clientName", "date", "lines", "subtotal", "iva", "total"]
        }
      }
    });

    const resultText = response.text || "{}";

    return new Response(resultText, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};