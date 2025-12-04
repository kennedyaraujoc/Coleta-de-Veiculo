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
          { text: "Analise a imagem para extrair a placa (licensePlate) e o modelo do veículo (vehicleModel). A placa deve ser extraída independentemente do formato (padrão Mercosul 'ABC1D23', padrão antigo 'ABC-1234', ou de motocicletas com 2 letras 'AB-1234', etc.). Retorne a placa exatamente como ela aparece na imagem. O modelo deve ser o mais específico possível (ex: 'Motocicleta Honda Biz', 'Caminhão Scania R450'). Se um campo não for identificado, retorne um valor vazio para ele." },
          imagePart
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            licensePlate: { type: Type.STRING, description: 'A placa do veículo, ex: ABC-1234, ABC1D23, AB-1234.' },
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