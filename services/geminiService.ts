
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateProfessionalDescription = async (basicText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Convierte esta descripción básica de un servicio en una descripción profesional, detallada y persuasiva para una factura o presupuesto en español: "${basicText}". Responde solo con el texto mejorado, sin introducciones ni comillas.`,
      config: {
        temperature: 0.7,
        maxOutputTokens: 200,
      }
    });
    return response.text?.trim() || basicText;
  } catch (error) {
    console.error("Gemini Error:", error);
    return basicText;
  }
};

export const suggestInvoiceNotes = async (type: string, amount: number, currency: string = 'COP'): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escribe un breve texto de agradecimiento y condiciones de pago profesionales para una ${type} por valor de ${amount} ${currency}. Incluye que el pago se debe realizar antes de la fecha de vencimiento y menciona métodos comunes de pago. Idioma: Español. Responde solo con el texto de las notas.`,
      config: {
        temperature: 0.5,
        maxOutputTokens: 250,
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};

export const generateDraftItems = async (projectDesc: string): Promise<{description: string, quantity: number, unitPrice: number}[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera una lista de 3 a 5 ítems de servicios/productos profesionales para un proyecto de: "${projectDesc}". Para cada ítem, proporciona una descripción profesional, una cantidad lógica y un precio unitario sugerido (en términos generales). Responde estrictamente en formato JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER }
            },
            required: ["description", "quantity", "unitPrice"]
          }
        }
      }
    });
    
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini Drafting Error:", error);
    return [];
  }
};
