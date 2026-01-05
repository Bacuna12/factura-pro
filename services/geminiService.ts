
import { GoogleGenAI, Type } from "@google/genai";

const getAi = () => {
  const apiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';
  return new GoogleGenAI({ apiKey });
};

export const generateProfessionalDescription = async (basicText: string): Promise<string> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Convierte esta descripción básica de un servicio en una descripción profesional para factura en español: "${basicText}". Solo el texto mejorado.`,
      config: { temperature: 0.7, maxOutputTokens: 200 }
    });
    return response.text?.trim() || basicText;
  } catch (error) {
    console.error("Gemini Error:", error);
    return basicText;
  }
};

export const optimizeProductListing = async (name: string): Promise<{description: string, suggestedPrice: number, category: string}> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Optimiza este producto: "${name}". Responde en JSON con description, suggestedPrice (number) y category.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            suggestedPrice: { type: Type.NUMBER },
            category: { type: Type.STRING }
          },
          required: ["description", "suggestedPrice", "category"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return { description: name, suggestedPrice: 0, category: "General" };
  }
};

export const suggestInvoiceNotes = async (type: string, amount: number, currency: string = 'COP'): Promise<string> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escribe notas de agradecimiento y pago para una ${type} de ${amount} ${currency}.`,
      config: { temperature: 0.5, maxOutputTokens: 200 }
    });
    return response.text?.trim() || "";
  } catch (error) {
    return "";
  }
};

export const generateDraftItems = async (projectDesc: string): Promise<{description: string, quantity: number, unitPrice: number}[]> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera 3 items de servicios para: "${projectDesc}". Responde en JSON ARRAY con description, quantity, unitPrice.`,
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
    return [];
  }
};

export const generateWelcomeEmail = async (userName: string, companyName: string): Promise<string> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Email de bienvenida para ${userName} de la empresa ${companyName}.`,
      config: { temperature: 0.8, maxOutputTokens: 300 }
    });
    return response.text?.trim() || `Bienvenido, ${userName}.`;
  } catch (error) {
    return "Bienvenido a FacturaPro.";
  }
};

export const generateRecoveryEmail = async (userName: string, passwordHint: string): Promise<string> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Email de recuperación para ${userName}. Contraseña: ${passwordHint}.`,
      config: { temperature: 0.4, maxOutputTokens: 200 }
    });
    return response.text?.trim() || `Tu contraseña es: ${passwordHint}`;
  } catch (error) {
    return `Tu contraseña es: ${passwordHint}`;
  }
};
