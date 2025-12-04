import { GoogleGenAI, Type } from "@google/genai";

import { ExtractedVehicleInfo } from '../types';

function base64ToGenerativePart(base64Data: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Data.split(',')[1],
      mimeType
    },
  };
}

export async function extractVehicleInfoFromImage(
  imageDataUrl: string
): Promise<ExtractedVehicleInfo> {
  // Inicializa a IA somente quando a função é chamada para evitar erros de inicialização.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const mimeType = imageDataUrl.match(/data:(.*);base64,/)?.[1] ?? 'image/jpeg';
  const imagePart = base64ToGenerativePart(imageDataUrl, mimeType);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: "Analise a imagem deste veículo e extraia a placa (licensePlate) e o modelo do veículo (vehicleModel). A placa deve estar no formato brasileiro. Se não conseguir identificar um dos campos, deixe-o em branco." },
          imagePart
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            licensePlate: { type: Type.STRING, description: 'A placa do veículo no formato ABC-1234 ou ABC-1B23.' },
            vehicleModel: { type: Type.STRING, description: 'O modelo do veículo, por exemplo: "Honda Civic" ou "CARRETA".' },
          },
        },
      }
    });

    const text = response.text.trim();
    if (text) {
        return JSON.parse(text) as ExtractedVehicleInfo;
    }
    throw new Error('Empty response from AI.');
  } catch (error) {
    console.error("AI extraction error:", error);
    throw new Error("Não foi possível extrair as informações da imagem.");
  }
}
