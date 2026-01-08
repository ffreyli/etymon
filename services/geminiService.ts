import { GoogleGenAI, Type, Schema } from "@google/genai";
import { EtymologyData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Simple in-memory cache to store results for the session
const searchCache = new Map<string, EtymologyData>();

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    language: { type: Type.STRING },
    summary: { type: Type.STRING },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          era: { type: Type.STRING },
          language: { type: Type.STRING },
          word: { type: Type.STRING },
          transliteration: { type: Type.STRING, description: "Romanization for non-Latin scripts (e.g., Pinyin, Romaji)" },
          meaning: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['root', 'ancestor', 'derived', 'cognate', 'borrowing', 'current'] },
          description: { type: Type.STRING }
        },
        required: ["era", "language", "word", "meaning", "type"]
      }
    },
    graph: {
      type: Type.OBJECT,
      properties: {
        nodes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              transliteration: { type: Type.STRING, description: "Romanization for non-Latin scripts" },
              language: { type: Type.STRING },
              definition: { type: Type.STRING, description: "Short English definition/gloss of the word" },
              era: { type: Type.STRING, description: "Approximate time period (e.g., '12th Century', 'PIE', '1600s')" },
              type: { type: Type.STRING, enum: ['root', 'ancestor', 'current', 'cognate', 'derivative'] }
            },
            required: ["id", "label", "language", "type", "definition", "era"]
          }
        },
        links: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              source: { type: Type.STRING, description: "Must match a node id" },
              target: { type: Type.STRING, description: "Must match a node id" },
              type: { type: Type.STRING, enum: ['derived', 'borrowed', 'cognate'] }
            },
            required: ["source", "target", "type"]
          }
        }
      },
      required: ["nodes", "links"]
    }
  },
  required: ["word", "language", "summary", "timeline", "graph"]
};

export async function fetchEtymology(word: string, language: string): Promise<EtymologyData> {
  const cacheKey = `${word.trim().toLowerCase()}-${language.trim().toLowerCase()}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the etymology of the word "${word}" in ${language}.
    
    1. Timeline: Direct lineage to the root. Keep descriptions concise.
    2. Graph: Network of related words. Include the root, ancestors, and 3 distinct cognates. 
       **Crucial**: Provide a short English definition (gloss) AND approximate era/time period for EVERY node in the graph.
    3. Summary: A concise paragraph explaining the origin.
    
    IMPORTANT for non-Latin scripts:
    - Use NATIVE script for 'word'/'label'.
    - Provide Romanization in 'transliteration'.
    
    Return strict JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for lower latency
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text) as EtymologyData;
    searchCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}