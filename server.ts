import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import chineseS2T from "chinese-s2t";
const { t2s } = chineseS2T;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function createApp() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API keys from environment or hardcoded (user provided)
  const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "sk-cp-AGjqRWFpE-k6tHhiHOe7dU3CdEZBpUq5wfzDy3V4qh6ZwQYyGDPnSZVgPvwWfWEyLwPXut3k2VKSsBsDNiVjUrCMR676QidQ6mSsItqPBdOpdv7fbr5HZ1Q";
  const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || "1848913859063071415";
  const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || "sk-vnvkabupeyrupdgjszmhkwuleqbxvvlvqiyljreyicexqjji";
  const SILICONFLOW_URL = "https://api.siliconflow.cn/v1/audio/speech";

  // API route for TTS
  app.post("/api/tts", async (req: express.Request, res: express.Response) => {
    const { text, speed = 1.0 } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    try {
      // Cleaning logic - avoid stripping Traditional Chinese characters
      let cleanText = text
        .replace(/\(.*\)/g, "")
        .replace(/（.*）/g, "")
        .replace(/pinyin:\s*[a-zA-Z1-5\s]*/gi, "")
        .replace(/instruction:\s*[^，。！？]*/gi, "")
        .replace(/[^\u4e00-\u9fff，。！？；：「」『』]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Send raw Traditional Chinese text as requested
      const ttsInput = cleanText || text;
      console.log(`[Server TTS] Service: SiliconFlow | Text: "${ttsInput}"`);

      // Primary: SiliconFlow (Unified for all segments)
      if (SILICONFLOW_API_KEY) {
        try {
          const sfResponse = await fetch(SILICONFLOW_URL, {
            method: "POST",
            signal: AbortSignal.timeout(15000), // 15s timeout
            headers: {
              "Authorization": `Bearer ${SILICONFLOW_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "FunAudioLLM/CosyVoice2-0.5B",
              input: ttsInput,
              voice: "FunAudioLLM/CosyVoice2-0.5B:anna",
              speed: speed,
              response_format: "mp3"
            })
          });

          if (sfResponse.ok) {
            const buffer = await sfResponse.arrayBuffer();
            res.set("Content-Type", "audio/mpeg");
            return res.send(Buffer.from(buffer));
          } else {
            const errText = await sfResponse.text();
            console.warn(`[Server TTS] SiliconFlow failed (${sfResponse.status}):`, errText);
          }
        } catch (sfErr) {
          console.error("[Server TTS] SiliconFlow error:", sfErr);
        }
      }

      // Secondary: MiniMax Fallback
      if (MINIMAX_API_KEY && MINIMAX_GROUP_ID) {
        try {
          return await handleMiniMax(ttsInput, speed, res);
        } catch (mmErr) {
          console.error("[Server TTS] MiniMax fallback failed:", mmErr);
        }
      }

      res.status(502).json({ error: "All TTS providers failed" });
    } catch (error) {
      console.error("[Server TTS] General error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  async function handleMiniMax(text: string, speed: number, res: express.Response) {
    console.log("[Server TTS] MiniMax processing...");
    const mmUrl = `https://api.minimax.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`;
    
    let processedText = text;
    if (processedText.includes("念")) {
      processedText = processedText.replace(/念/g, "念(niàn)");
    }

    const mmResponse = await fetch(mmUrl, {
      method: "POST",
      signal: AbortSignal.timeout(10000), // 10s timeout
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "speech-2.8-hd",
        text: processedText,
        stream: false,
        voice_setting: {
          voice_id: "Chinese (Mandarin)_Sweet_Lady",
          speed: speed,
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

    if (mmResponse.ok) {
      const contentType = mmResponse.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const jsonData = await mmResponse.json() as any;
        const hexAudio = jsonData.data?.audio;
        if (hexAudio) {
          const audioBuffer = Buffer.from(hexAudio, 'hex');
          res.set("Content-Type", "audio/mpeg");
          return res.send(audioBuffer);
        }
      } else {
        const buffer = await mmResponse.arrayBuffer();
        res.set("Content-Type", "audio/mpeg");
        return res.send(Buffer.from(buffer));
      }
    } else {
      const mmErr = await mmResponse.text();
      console.error(`[Server TTS] MiniMax failed (${mmResponse.status}):`, mmErr);
      throw new Error("MiniMax failed");
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
}

// Only start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}` || !process.env.VERCEL) {
  createApp().then(app => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}
