
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'snake_battle_retro_v5'; 

export const getOrGenerateTitleImage = async (): Promise<string | null> => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch (e) {
    console.warn('Storage access failed', e);
  }

  try {
    if (!process.env.API_KEY) {
        return null;
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{
          text: "A 1990s retro arcade game title screen for 'SNAKE BATTLE'. In the center, a pixel-art boxing ring with a green snake on the left and a red snake on the right, both wearing boxing gloves and facing each other. The title 'SNAKE BATTLE' is at the top in large, glowing neon red retro arcade fonts. The background is dark and moody with a CRT scanline effect. Pixel art style, 16-bit aesthetic, high contrast."
        }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    });

    let base64 = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64 = part.inlineData.data;
        break;
      }
    }

    if (base64) {
      const dataUrl = `data:image/png;base64,${base64}`;
      try {
        localStorage.setItem(STORAGE_KEY, dataUrl);
      } catch (e) {}
      return dataUrl;
    }
  } catch (e) {
    console.error("Failed to generate title image", e);
  }

  return null;
};
