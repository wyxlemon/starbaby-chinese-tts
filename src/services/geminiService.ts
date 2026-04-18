/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordChallenge, AdventureStory, PracticeCategory } from "../types";
import { t2s, s2t } from 'chinese-s2t';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The user filled in the key directly, I'll consolidate it here
const MINIMAX_API_KEY = "sk-cp-AGjqRWFpE-k6tHhiHOe7dU3CdEZBpUq5wfzDy3V4qh6ZwQYyGDPnSZVgPvwWfWEyLwPXut3k2VKSsBsDNiVjUrCMR676QidQ6mSsItqPBdOpdv7fbr5HZ1Q";
const MINIMAX_GROUP_ID = "1848913859063071415";

const CATEGORY_MAP: Record<PracticeCategory, string> = {
  RETROFLEX: "平翹舌音 (z/zh, c/ch, s/sh, r)",
  NASAL: "前後鼻音 (an/ang, en/eng)",
  NL: "鼻音與邊音 (n/l)",
  TONES: "聲調精準度",
  CUSTOM: "自定義練習"
};

export async function generateAdventure(
  inputStory: string, 
  category: PracticeCategory,
  heroName: string
): Promise<AdventureStory> {
  console.log("Starting adventure generation...", { category, heroName });
  const categoryDesc = CATEGORY_MAP[category];
  
  const prompt = `你是一位資深的童書作家與語言教學專家。
  現在請為孩子創作或改編一個冒險故事。
  
  主角名字：${heroName || "小冒險家"}。
  輸入內容：${inputStory ? `基於這個故事線：${inputStory}` : "請自由創作一個關於森林精靈的冒險故事"}。
  練習重點：${categoryDesc}。
  
  任務步驟：
  1. 請務必讓「${heroName || "小冒險家"}」作為故事的主角參與冒險，並由精靈「星寶」作為夥伴。
  2. 確保故事內容生動有趣，適合孩子。
  3. 從故事中挑選 5 個包含「${categoryDesc}」難點的關鍵詞作為「冒險關卡」。
  4. 將故事拆分成 5 個片段，每個片段引出一個關鍵詞。
  5. 為每個關鍵詞提供【簡體中文】的拼音引導和具體的「精靈口訣」（身體發音指導）。
  6. 為每個片段提供一個「視覺意象」(visualMotif)，挑選 3 個最能代表該情節的表情符號 (Emoji)。
  7. 請全程使用【簡體中文】生成內容。
  
  返回值必須符合 AdventureStory JSON 格式：
  - title: 故事標題
  - category: "${category}"
  - challenges: Array of WordChallenge { id, word, pinyin, instruction, hint, storySegment, visualMotif }
  - ending: 故事的溫馨結局
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            ending: { type: Type.STRING },
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
          required: ["title", "category", "challenges", "ending"]
        }
      }
    });

    const text = response.text;
    console.log("Adventure generation response received.");
    if (!text) throw new Error("No response from AI");
    
    const simplifiedData = JSON.parse(text);
    
    // Post-process: Convert to Traditional for the UI while keeping Simplified for TTS
    const story: AdventureStory = {
      title: s2t(simplifiedData.title),
      category: simplifiedData.category as PracticeCategory,
      ending: s2t(simplifiedData.ending),
      simplifiedEnding: simplifiedData.ending,
      challenges: simplifiedData.challenges.map((c: any) => ({
        ...c,
        word: s2t(c.word),
        simplifiedWord: c.word,
        storySegment: s2t(c.storySegment),
        simplifiedStorySegment: c.storySegment,
        instruction: s2t(c.instruction),
        hint: s2t(c.hint),
        pinyin: c.pinyin // Pinyin usually stays the same or is already in correct format
      }))
    };
    
    return story;
  } catch (error) {
    console.error("Failed to generate adventure:", error);
    throw error;
  }
}

export async function evaluateSpeech(
  audioBase64: string, 
  targetWord: string, 
  targetPinyin?: string
): Promise<{ isCorrect: boolean; score: number; feedback: string }> {
  const prompt = `你是一位活潑可愛的小精靈「星寶」，你是孩子的語音探險專家。
  當前挑戰咒語： 「${targetWord}」 ${targetPinyin ? `(拼音: ${targetPinyin})` : ""}。
  
  請仔細聽錄音並提供【繁體中文】反饋。
  
  評測準則（專業語音治療師模式）：
  1. 【精準診斷】：嚴格區分平翹舌、前後鼻音、聲調。即便只有一點點不準確也要指出。
  2. 【具體身體動作指令】：不要只說「讀錯了」，要像老師一樣給出具體的「肌肉動作」指導：
     - 若是平音(z/c/s)讀成翹音：指導舌尖輕觸下牙齒後面，「舌頭要平得像個小薄餅」。
     - 若是翹音(zh/ch/sh)讀成平音：指導舌尖向上捲，「像在舌頭下藏了一個休息的小山洞」，注意舌尖不要碰到牙齒或上顎。
     - 若是前鼻音(n/an/en)：舌尖輕輕頂住上門牙背後，「像一扇關上的小木門」，讓氣流從鼻子優雅地流出。
     - 若是後鼻音(ng/ang/eng)：舌根向後縮，嘴巴張圓，「像想打一個大噴嚏一樣把空間留給喉嚨」。
     - 若是聲調問題：一聲像「平平的小路」，二聲像「爬小坡」，三聲像「盪鞦韆」，四聲像「溜滑梯」。
  3. 【精靈風格】：將建議包裝在「魔法練習」中，如「咒語能量發生了偏移」、「需要調整你的發音魔棒」等。
  4. 【感官引導】：引導孩子感受「小微風」吹過掌心（氣流）或「牙齒小圍欄」的作用。
  
  請返回 JSON：
  - isCorrect: (boolean)
  - score: (number) 0-100
  - feedback: (string) 精靈評語（錯誤分析 + 魔法發音動作建議 + 鼓勵）
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "audio/webm",
            data: audioBase64
          }
        },
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
          },
          required: ["isCorrect", "score", "feedback"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No evaluation response");
    const result = JSON.parse(resultText);
    
    // Server-side logging for debugging
    console.log(`[Evaluation] Target: ${targetWord}, Score: ${result.score}, Correct: ${result.isCorrect}`);
    
    return result;
  } catch (error) {
    console.error("Speech evaluation failed:", error);
    return {
      isCorrect: false,
      score: 0,
      feedback: "哎呀！星寶剛才分心了，沒聽清魔法咒語。再為我讀一次好嗎？"
    };
  }
}

const STORYBOOK_SYSTEM_PROMPT = `
You are "Luna", a warm and patient storyteller for 6-year-olds.
Tone: Melodic, nurturing, and emotionally intelligent. 
Pacing: 30% slower than normal, with intentional pauses for cognitive processing.
Articulation: Hyper-articulated vowels and consonants, but soft and soothing like a lullaby.
Breathing: Include gentle, audible inhales before surprises and soothing exhales at sentence ends.
Role: An AI companion guiding children through magical language learning with a "smiling voice".
`;

export async function generateSpeech(text: string): Promise<string | null> {
  if (!text.trim()) return null;

  const useMiniMax = !!(MINIMAX_API_KEY && MINIMAX_GROUP_ID);
  
  // Round-robin / Rotation logic: alternate starting provider based on time
  const rotation = Math.floor(Date.now() / 1000) % 2;
  const sequence = rotation === 0 ? ['gemini', 'minimax'] : ['minimax', 'gemini'];

  for (const provider of sequence) {
    if (provider === 'gemini') {
      try {
        const result = await generateGeminiSpeech(text);
        if (result) return result;
      } catch (e) {
        console.warn("[TTS] Gemini failed, checking fallback...");
      }
    } else if (provider === 'minimax' && useMiniMax) {
      try {
        const result = await generateMiniMaxSpeech(text);
        if (result) return result;
      } catch (e) {
        console.warn("[TTS] MiniMax failed, checking fallback...");
      }
    }
  }

  return null;
}

async function generateGeminiSpeech(text: string): Promise<string | null> {
  try {
    // If text is already simplified, we just use it.
    // However, to be extra safe, we ensure it's simplified.
    const simplifiedText = t2s(text);
    const prompt = `請用溫柔、親切、緩慢且字正腔圓的故事老師語氣朗讀這段中文（確保發音為標準中文）：${simplifiedText}`;
    console.log("[TTS] Gemini Requesting...");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    return audioData || null;
  } catch (error) {
    if (error instanceof Error && error.message.includes("429")) {
      console.warn("[TTS] Gemini quota exhausted (429), switching to alternative provider...");
    } else {
      console.error("Gemini TTS API error:", error);
    }
    throw error;
  }
}

async function generateMiniMaxSpeech(text: string): Promise<string | null> {
  if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) return null;

  try {
    const simplifiedText = t2s(text);
    
    // Fix pronunciation for "念" (niàn) - force correct tone
    // Note: Some models interpret (niàn) better than [niàn]
    let processedText = simplifiedText;
    if (processedText.includes("念")) {
      processedText = processedText.replace(/念/g, "念(niàn)");
    }

    console.log("[TTS] MiniMax Payload Text:", processedText);
    console.log("[TTS] MiniMax Requesting (Simplified & Guided)...");
    
    // MiniMax T2A V2 API
    const url = `https://api.minimax.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "speech-2.8-hd",
        text: processedText,
        stream: false,
        voice_setting: {
          voice_id: "Chinese (Mandarin)_Gentle_Senior", 
          speed: 0.85, 
          vol: 1.0,
          pitch: 0
        },
        audio_setting: {
          sample_rate: 32000, 
          format: "mp3", 
          channel: 1,
          bitrate: 128000
        }
      })
    });

    if (!response.ok) {
      const errStatus = response.status;
      const errText = await response.text();
      console.error(`[TTS] MiniMax API Error (Status: ${errStatus}):`, errText);
      return null;
    }

    console.log("[TTS] MiniMax response received successfully.");

    const contentType = response.headers.get("content-type") || "";
    const buffer = await response.arrayBuffer();

    if (contentType.includes("application/json")) {
      const decoder = new TextDecoder();
      const jsonText = decoder.decode(buffer);
      try {
        const jsonData = JSON.parse(jsonText);
        const hexAudio = jsonData.data?.audio;
        if (hexAudio) {
          console.log("[TTS] MiniMax Hex audio detected, converting...");
          return hexToBase64(hexAudio);
        }
        console.warn("[TTS] MiniMax JSON response missing audio data:", jsonText);
        return null;
      } catch (e) {
        console.error("[TTS] Failed to parse MiniMax JSON response:", e);
        return null;
      }
    }

    const uint8Array = new Uint8Array(buffer);
    console.log(`[TTS] MiniMax audio received. Size: ${uint8Array.length} bytes`);
    let binary = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("MiniMax TTS Exception:", error);
    return null;
  }
}

function hexToBase64(hex: string): string {
  const len = hex.length;
  const bytes = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
