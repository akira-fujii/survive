
import { GoogleGenAI, Type } from "@google/genai";
import { AIResult, GameHistoryItem } from "../types";
import { GAME_CONFIG } from "../config";

async function callWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.error?.code === 500 || error?.status === 500 || !error.status;
    if (retries > 0 && isRetryable) {
      console.warn(`API Error encountered. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function evaluateItem(
  itemName: string,
  history: GameHistoryItem[],
  remainingMoney: number
): Promise<AIResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const historyContext = history
    .map((h) => `- ${h.itemName} (コスト:${h.cost}円, 経過:${h.timeKilled.toString()}年)`)
    .join("\n");

  const prompt = GAME_CONFIG.PROMPTS.ITEM_EVALUATION(itemName, remainingMoney, historyContext);

  const response = await callWithRetry(() => 
    ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: GAME_CONFIG.PROMPTS.SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cost: { type: Type.NUMBER },
            timeKilledYears: { type: Type.STRING },
            sanityChange: { type: Type.NUMBER },
            story: { type: Type.STRING },
            synergyAnalysis: { type: Type.STRING },
          },
          required: ["cost", "timeKilledYears", "sanityChange", "story", "synergyAnalysis"],
        },
      },
    })
  );

  const text = response.text || "{}";
  return JSON.parse(text.trim()) as AIResult;
}

export async function generateEnding(
  history: GameHistoryItem[],
  status: string,
  remainingTime: bigint,
  remainingMoney: number,
  sanity: number
): Promise<{ title: string; story: string; evaluation: string, scoreGrade: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const historyContext = history.map((h) => h.itemName).join(", ");
  const prompt = GAME_CONFIG.PROMPTS.ENDING_GENERATION(
    status, 
    remainingTime.toString(), 
    remainingMoney, 
    sanity, 
    historyContext
  );

  const response = await callWithRetry(() => 
    ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            story: { type: Type.STRING },
            evaluation: { type: Type.STRING },
            scoreGrade: { type: Type.STRING },
          },
          required: ["title", "story", "evaluation", "scoreGrade"],
        },
      },
    })
  );

  const text = response.text || "{}";
  return JSON.parse(text.trim());
}

export async function generateImage(promptText: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await callWithRetry(() => 
    ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    })
  );

  const candidates = (response as any).candidates;
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  }
  return "https://picsum.photos/800/450";
}

export async function generateItemImage(itemName: string): Promise<string> {
  return generateImage(GAME_CONFIG.PROMPTS.IMAGE_ITEM(itemName));
}

export async function generateEndingImage(title: string, status: string): Promise<string> {
  const context = status === 'COMPLETED' ? "Divine light, rebirth, white background, heaven-like cinematic aesthetic" : "Dark void, collapse, existential dread, dark aesthetic";
  return generateImage(GAME_CONFIG.PROMPTS.IMAGE_ENDING(title, context));
}
