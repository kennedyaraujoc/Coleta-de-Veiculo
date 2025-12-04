import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedVehicleInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeVehicleImage = async (base64Image: string): Promise<ExtractedVehicleInfo> => {
  try {
    // Remove data:image/...;base64, prefix if present
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Analyze this image and extract only the vehicle's License Plate (placa). If you cannot find a license plate, leave the field blank."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            licensePlate: { type: Type.STRING, description: "The vehicle license plate number" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return {};
    
    return JSON.parse(text) as ExtractedVehicleInfo;
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    return {};
  }
};