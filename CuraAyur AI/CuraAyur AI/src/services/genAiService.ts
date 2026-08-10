import { GoogleGenAI } from '@google/genai';
import { config } from '../config/unifiedConfig';

export class GenAIService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: config.genai.apiKey });
  }

  async generateRecommendations(diseaseType: string, inputData: any, predictionResult: any): Promise<any> {
    const prompt = `
      You are an expert Ayurvedic and Allopathic doctor working for CuraAyur AI.
      A patient has just been analyzed for ${diseaseType}.
      
      Patient Profile:
      ${JSON.stringify(inputData, null, 2)}
      
      Machine Learning Prediction Result:
      ${JSON.stringify(predictionResult, null, 2)}
      
      Based on this data, provide a comprehensive, personalized health recommendation.
      Respond ONLY with a valid JSON object matching this exact structure, with no markdown formatting, no backticks, and no extra text:
      {
        "riskLevel": "Low | Moderate | High",
        "lifestyle": ["recommendation 1", "recommendation 2", "recommendation 3"],
        "clinical": ["clinical advice 1", "clinical advice 2"],
        "medicines": {
          "ayurvedic": [{ "name": "medicine 1", "dose": "dose info", "use": "reason for use" }],
          "allopathic": [{ "name": "medicine 1", "dose": "dose info", "use": "reason for use" }],
          "homeopathic": [{ "name": "medicine 1", "dose": "dose info", "use": "reason for use" }]
        }
      }
    `;

    try {
      const interaction = await this.ai.interactions.create({
        model: 'gemini-3.5-flash',
        input: prompt
      });
      
      const text = interaction.output_text || "{}";
      
      return JSON.parse(text);
    } catch (error) {
      console.error("[GenAI] Failed to generate recommendations:", error);
      return {
        riskLevel: "Unknown",
        lifestyle: ["Consult a doctor for personalized advice."],
        clinical: ["Please visit a healthcare professional."],
        medicines: { ayurvedic: [], allopathic: [], homeopathic: [] }
      };
    }
  }
}

