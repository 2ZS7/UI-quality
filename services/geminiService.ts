import { GoogleGenAI, Type } from "@google/genai";
import { StaticAnalysisResult, Severity } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeCode = async (code: string): Promise<StaticAnalysisResult> => {
  if (!apiKey) throw new Error("API Key missing");

  const model = "gemini-3-flash-preview";

  const prompt = `
    You are a senior frontend engineer and QA specialist. Analyze the following React/TypeScript/Tailwind code.
    Identify issues related to accessibility, performance, React best practices (hooks, rendering), and Tailwind usage.
    
    Return the response as a valid JSON object matching this schema:
    {
      "score": number (0-100),
      "summary": "Short executive summary of quality",
      "issues": [
        {
          "id": "unique_id",
          "line": number (approximate),
          "message": "Description of the issue",
          "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          "suggestion": "How to fix it",
          "category": "ACCESSIBILITY" | "PERFORMANCE" | "BEST_PRACTICE" | "LOGIC"
        }
      ],
      "optimizedCode": "Refactored code snippet if improvements are possible (optional)"
    }
    
    Code to analyze:
    ${code}
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            optimizedCode: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  line: { type: Type.INTEGER },
                  message: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
                  suggestion: { type: Type.STRING },
                  category: { type: Type.STRING, enum: ['ACCESSIBILITY', 'PERFORMANCE', 'BEST_PRACTICE', 'LOGIC'] }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const parsed = JSON.parse(text) as StaticAnalysisResult;
    
    // Defensive coding: Ensure issues array exists to prevent runtime errors
    if (!parsed.issues) {
      parsed.issues = [];
    }
    
    return parsed;
  } catch (error) {
    console.error("Static Analysis Error:", error);
    throw error;
  }
};

export const analyzeVisualDiff = async (baseImageBase64: string, compareImageBase64: string, diffPercent: number): Promise<string> => {
  if (!apiKey) throw new Error("API Key missing");
  
  // Clean base64 strings if they contain headers
  const baseClean = baseImageBase64.replace(/^data:image\/\w+;base64,/, "");
  const compareClean = compareImageBase64.replace(/^data:image\/\w+;base64,/, "");

  const model = "gemini-2.5-flash-latest"; // Using a multimodal capable model

  const prompt = `
    You are a Visual QA Automation Engineer.
    I am providing two images:
    1. The Baseline (Expected) UI.
    2. The Actual (Current) UI.
    
    The computed pixel difference is ${diffPercent.toFixed(2)}%.
    
    Analyze the visual differences. 
    - Ignore minor anti-aliasing artifacts.
    - Focus on layout shifts, color changes, missing elements, or broken typography.
    - Determine if this change looks like a regression (bug) or an intentional design update.
    - Be concise.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: baseClean } },
          { inlineData: { mimeType: "image/png", data: compareClean } }
        ]
      }
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Visual Analysis Error:", error);
    return "Failed to generate AI analysis for the visual diff.";
  }
};