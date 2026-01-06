
import { GoogleGenAI, Type, GenerateContentResponse, GenerateContentResponseData } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const extractClientDataFromId = async (base64Image: string): Promise<{name: string, taxId: string, address: string, city: string}> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: "Extrae los datos de este documento de identidad para el registro de un cliente. Devuelve estrictamente un JSON con: name (Nombre completo), taxId (Número de identificación/cédula/NIT), address (Dirección si aparece), city (Ciudad si aparece). Si no encuentras un campo, deja el string vacío."
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            taxId: { type: Type.STRING },
            address: { type: Type.STRING },
            city: { type: Type.STRING }
          },
          required: ["name", "taxId"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error al extraer datos con Gemini:", error);
    return { name: "", taxId: "", address: "", city: "" };
  }
};

export const generateProfessionalDescription = async (basicText: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
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

export const generateSMSVerification = async (userName: string, code: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera un mensaje de texto SMS corto y profesional para ${userName} con el código de verificación: ${code}. Máximo 160 caracteres.`,
      config: { temperature: 0.5, maxOutputTokens: 100 }
    });
    return response.text?.trim() || `Tu código de FacturaPro es: ${code}`;
  } catch (error) {
    return `Tu código de FacturaPro es: ${code}`;
  }
};

export const optimizeProductListing = async (name: string): Promise<{description: string, suggestedPrice: number, category: string}> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Escribe notas de agradecimiento y pago para una ${type} de ${amount} ${currency}.`,
      config: { temperature: 0.5, maxOutputTokens: 200 }
    });
    return response.text?.trim() || "";
  } catch (error) {
    return "";
  }
};

export const generateWelcomeEmail = async (userName: string, companyName: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
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
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Email de recuperación para ${userName}. Contraseña: ${passwordHint}.`,
      config: { temperature: 0.4, maxOutputTokens: 200 }
    });
    return response.text?.trim() || `Tu contraseña es: ${passwordHint}`;
  } catch (error) {
    return `Tu contraseña es: ${passwordHint}`;
  }
};
