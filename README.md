# 仙境發音大冒險 (Wonderland Pronunciation Adventure) 🧚‍♂️🎙️

這是一款專為兒童設計的互動式普通話發音學習應用。結合了 Gemini AI 的故事創作能力、MiniMax 的高品質語音合成 (TTS)，以及 AI 語音評測技術，讓孩子在冒險故事中快樂練習發音。

## 🚀 核心技術棧
- **前端**: React 18, Vite, TypeScript, Tailwind CSS, Framer Motion
- **AI 邏輯**: Google Gemini API (1.5 Flash)
- **語音合成**: MiniMax T2A V2 API (Mandarin Optimized)
- **部署環境**: 支持標準 Node.js 容器化部署

## ⚙️ 環境變量設置 (.env)

在部署到伺服器之前，請確保設置以下環境變量：

```env
# Google Gemini API Key (用於生成故事、AI 評分)
GEMINI_API_KEY=你的_GEMINI_API_KEY

# MiniMax API 設置 (用於高品質語音合成)
# 獲取地址: https://www.minimaxi.com/
MINIMAX_API_KEY=你的_MINIMAX_API_KEY
MINIMAX_GROUP_ID=你的_MINIMAX_GROUP_ID
```

## 📦 部署步驟

### 1. 本地開發
```bash
npm install
npm run dev
```

### 2. 構建與部署 (SPA)
本應用已配置為標準 SPA (Single Page Application)。
```bash
# 構建靜態文件
npm run build
```
構建完成後，將 `dist` 文件夾中的內容部署到任何靜態網站託管平台（如 Vercel, Netlify, Cloudflare Pages 或 Nginx）。

## 🛠️ 重要維護說明

### 多音字與讀音修正
在 `src/services/geminiService.ts` 中，我們使用了「簡體核心、繁體介面」的策略。
- **TTSText**: 發送給語音引擎的是簡體中文，以獲得最高的拼音識別率。
- **UI**: 介面顯示時透過 `chinese-s2t` 轉化為繁體。
- 若發現特定字讀音錯誤，可在 `generateMiniMaxSpeech` 函數中添加 `processedText.replace(/目標字/g, "目標字(拼音)")` 進行強制修正。

### 模型更新
本項目目前使用 `gemini-3-flash-preview`。若未來模型版本更新，請在 `geminiService.ts` 中查找並替換模型字符串。

## 📜 許可證
Apache-2.0
