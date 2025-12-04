import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedVehicleInfo } from "./types";

export async function extractVehicleInfoFromImage(
  base64ImageData: string
): Promise<ExtractedVehicleInfo | null> {
  try {
    // Moved AI client initialization inside the function
    // This prevents a crash on app load if the API_KEY is not set in the environment.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64ImageData,
            },
          },
          {
            text: "Extraia a placa (licensePlate) e o modelo do veículo (vehicleModel) desta imagem. Retorne apenas o JSON.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            licensePlate: {
              type: Type.STRING,
              description:
                "A placa do veículo, em formato brasileiro se possível (ex: ABC-1234 ou ABC1D23).",
            },
            vehicleModel: {
              type: Type.STRING,
              description:
                'O modelo do veículo (ex: "Caminhão Toco", "Carreta", "Caminhão Baú").',
            },
          },
          required: ["licensePlate", "vehicleModel"],
        },
      },
    });

    const jsonString = response.text.trim();
    if (jsonString) {
      return JSON.parse(jsonString) as ExtractedVehicleInfo;
    }
    return null;
  } catch (error) {
    console.error("Error extracting vehicle info from image:", error);
    return null;
  }
}