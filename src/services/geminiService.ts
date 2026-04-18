/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { AdventureStory, PracticeCategory } from "../types";
import chineseS2T from 'chinese-s2t';
const { s2t } = chineseS2T;

// Correct initialization for the environment's @google/genai wrapper
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CATEGORY_MAP: Record<PracticeCategory, string> = {
  RETROFLEX: "平翹舌音 (z/zh, c/ch, s/sh, r)",
  NASAL: "前後鼻音 (an/ang, en/eng)",
  NL: "鼻音與邊音 (n/l)",
  TONES: "聲調精準度",
  CUSTOM: "自定義練習"
};

// Global in-flight promise to deduplicate concurrent requests
let inFlightStoryPromise: Promise<AdventureStory> | null = null;

/**
 * Helper to retry AI calls with exponential backoff on 429 (Quota) errors.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Check for 429 Resource Exhausted
      const isQuotaError = 
        error?.message?.includes('429') || 
        error?.status === 'RESOURCE_EXHAUSTED' ||
        (error?.response?.status === 429);
      
      if (isQuotaError && i < maxRetries - 1) {
        // Base delay 2s, 4s, 8s + jitter
        const delay = Math.pow(2, i + 1) * 1000 + Math.random() * 1000;
        console.warn(`[Gemini] Quota exceeded (429). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

const CLEAN_REGEX = /[*`#_]/g;

function cleanText(text: string): string {
  if (!text) return "";
  // Remove markdown artifacts and ensure standard quotes
  return text.replace(CLEAN_REGEX, "").replace(/"/g, "「").replace(/"/g, "」").trim();
}

/**
 * Generates an adventure story based on user input and category.
 */
export async function generateAdventure(
  inputStory: string, 
  category: PracticeCategory,
  heroName: string,
  assessmentReport?: string
): Promise<AdventureStory> {
  // Deduplication: If already generating, join the existing promise
  if (inFlightStoryPromise) {
    console.log("[Service] Adventure already generating, skipping duplicate request.");
    return inFlightStoryPromise;
  }

  inFlightStoryPromise = (async () => {
    console.log("Starting adventure generation...", { category, heroName });
    const categoryDesc = CATEGORY_MAP[category];
    
    const prompt = `你是一位資深的童書作家與語言教學專家，專長是引導學前兒童克服口語發展障礙。
    主角名字：${heroName || "小冒險家"}。
    練習重點：${categoryDesc}。
    ${inputStory ? `背景：${inputStory}` : "主題：森林資源冒險"}。
    
    ${assessmentReport ? `【核心依據：兒童觀察與開發分析報告】
    報告內容：
    ${assessmentReport}
    
    根據以上報告，請：
    1. 從報告的「需要跟進的部分」提取關鍵單詞（如特定的名詞、動詞）。
    2. 分析報告反映的兒童語言特點（如：詞彙量不足、發音不穩定、只會短句）。
    3. 在冒險關卡中「自然地」融入這些需要練習的詞彙，並針對其發音特點設計引導語。` : ""}
    
    任務與創作風格：
    1. 生成 1 個開場序幕（prologue）與 5 個冒險關卡。
    2. 【序幕指導】：不要使用「歡迎來到魔法世界」或「我是星寶」之類的開場白。
       - 應該根據主角名字、背景或觀察報告，直接切入一個充滿懸疑感、吸引力或深度的場景描述。
       - 語氣自然、專業且帶有一點探險的沉浸感。
    3. 創作風格應為「啟發式」與「引導式」，不要直接在故事中給出答案。
    4. 【語言風格】：避免刻意提及「魔法」、「咒語」等詞彙。
       - 將發音練習自然地融入探險過程（如：解開機關、與森林通話、識別特殊物品）。
    5. 【關鍵要求】：storySegment 應該是一個情境，引導孩子說出難點單詞（word）。
       - 案例如：小勇士在岩石縫隙中發現了一個奇怪的「面粉」袋，這裡怎麼會出現製作月餅的材料呢？
    6. 在 storySegment 的結尾，使用引導語氣讓孩子準確念出那個詞。
    7. 全程使用【簡體中文】生成 JSON。
    8. 故事內容要純淨生動，不要包含任何 Markdown 格式符號。
    9. 「visualMotif」欄位【僅限 Emoji 表情符號】，禁止出現任何漢字、字母或文字描述。
    10. 【成就系統】：為這次探險生成一個專屬的成就獎章（achievement）。
       - icon：一個代表成就的 Emoji（例如：🎖️, 🏆, 🏹, 🌊）。
       - title：一個基於故事主題的帥氣稱號（例如：「深海珍珠收藏家」、「森林守護之星」）。

    JSON 格式要求：
    - title: 標題
    - category: "${category}"
    - prologue: 開場序幕（深深地吸引孩子進入特定場景）
    - ending: 結局
    - achievement: { icon, title }
    - challenges: Array<{ id, word, pinyin, instruction, hint, storySegment, visualMotif }>
    `;

    try {
      const response = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              prologue: { type: Type.STRING },
              ending: { type: Type.STRING },
              achievement: {
                type: Type.OBJECT,
                properties: {
                  icon: { type: Type.STRING },
                  title: { type: Type.STRING },
                },
                required: ["icon", "title"]
              },
              challenges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    word: { type: Type.STRING },
                    pinyin: { type: Type.STRING },
                    instruction: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    storySegment: { type: Type.STRING },
                    visualMotif: { type: Type.STRING },
                  },
                  required: ["id", "word", "instruction", "hint", "storySegment", "visualMotif"]
                }
              }
            },
            required: ["title", "category", "prologue", "challenges", "ending", "achievement"]
          }
        }
      }));

      const text = response.text;
      if (!text) throw new Error("AI returned empty content");
      
      const rawData = JSON.parse(text);
      
      const story: AdventureStory = {
        title: s2t(cleanText(rawData.title)),
        category: rawData.category as PracticeCategory,
        prologue: s2t(cleanText(rawData.prologue)),
        ending: s2t(cleanText(rawData.ending)),
        achievement: {
          icon: rawData.achievement.icon,
          title: s2t(cleanText(rawData.achievement.title)),
        },
        challenges: rawData.challenges.map((c: any) => ({
          ...c,
          word: s2t(cleanText(c.word)),
          storySegment: s2t(cleanText(c.storySegment)),
          instruction: s2t(cleanText(c.instruction)),
          hint: s2t(cleanText(c.hint)),
          visualMotif: s2t(cleanText(c.visualMotif)), // Ensure Traditional Chinese
          pinyin: c.pinyin
        }))
      };
      
      return story;
    } catch (error) {
      console.error("Story generation failed:", error);
      throw error;
    } finally {
      inFlightStoryPromise = null;
    }
  })();

  return inFlightStoryPromise;
}

/**
 * Evaluates speech audio using AI.
 */
export async function evaluateSpeech(
  audioBase64: string, 
  targetWord: string, 
  targetPinyin?: string
): Promise<{ isCorrect: boolean; score: number; feedback: string; simplifiedFeedback: string }> {
  const prompt = `評測發音：「${targetWord}」。請以繁體中文給出兒童友好的建議，簡體中文給出語音合成用的建議。不包含任何標記符號。返回 JSON: isCorrect, score, feedback, simplifiedFeedback。`;

  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            simplifiedFeedback: { type: Type.STRING },
          },
          required: ["isCorrect", "score", "feedback", "simplifiedFeedback"]
        }
      }
    }));

    const result = JSON.parse(response.text);
    return {
      ...result,
      feedback: cleanText(result.feedback),
      simplifiedFeedback: cleanText(result.simplifiedFeedback)
    };
  } catch (error) {
    console.error("Evaluation failed:", error);
    return {
      isCorrect: false, score: 0, 
      feedback: "星寶沒聽清，再說一次吧！",
      simplifiedFeedback: "星宝没听清，再说一次吧！"
    };
  }
}

// TTS cache and requests
const globalTtsCache: Record<string, string> = {};
const inFlightTtsRequests: Record<string, Promise<string | null>> = {};

/**
 * Generates speech for text.
 */
export async function generateSpeech(text: string, speed: number = 1.0, pinyin?: string): Promise<string | null> {
  const safeText = text?.trim();
  if (!safeText) return null;
  const key = `${safeText}_${speed}_${pinyin || ''}`;
  
  if (globalTtsCache[key]) return globalTtsCache[key];
  if (inFlightTtsRequests[key]) return inFlightTtsRequests[key];

  inFlightTtsRequests[key] = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s client-side timeout

      const resp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: safeText, speed, pinyin }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!resp.ok) return null;
      const buffer = await resp.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < uint8Array.length; i += 8192) {
        binary += String.fromCharCode.apply(null, uint8Array.slice(i, i + 8192) as any);
      }
      const b64 = btoa(binary);
      globalTtsCache[key] = b64;
      return b64;
    } catch (e) {
      console.warn("[TTS] Fetch failed or timed out:", e);
      return null;
    } finally {
      delete inFlightTtsRequests[key];
    }
  })();

  return inFlightTtsRequests[key];
}

/**
 * Common weakness analysis.
 */
export async function analyzeWeaknesses(mistakes: any[]): Promise<any> {
  if (!mistakes?.length) return null;
  const prompt = `分析錯誤紀錄：${JSON.stringify(mistakes)}。返回 JSON: analysis, mistakeSummary, recommendations (array), letterFromXingbao.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            mistakeSummary: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            letterFromXingbao: { type: Type.STRING },
          },
          required: ["analysis", "mistakeSummary", "recommendations", "letterFromXingbao"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch {
    return null;
  }
}
