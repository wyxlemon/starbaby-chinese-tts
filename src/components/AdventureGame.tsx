/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AdventureStory } from '../types';
import { speechService } from '../services/speechService';
import { evaluateSpeech, generateSpeech } from '../services/geminiService';
import { Mic, MicOff, Trophy, Volume2, Star, MessageCircle, ChevronRight, Book, Play } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  story: AdventureStory;
  onExit: () => void;
  onAddMistake: (mistake: { word: string; pinyin?: string; feedback: string }) => void;
  onCompleteStory: () => void;
}

export default function AdventureGame({ story, onExit, onAddMistake, onCompleteStory }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'idle', message: string, score?: number }>({ type: 'idle', message: '' });
  const [isDone, setIsDone] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [isHoveringWord, setIsHoveringWord] = useState(false);

  // Audio Caching
  const ttsCache = React.useRef<Record<string, string>>({});
  
  // Audio management to prevent overlaps
  const currentAudioSource = React.useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);

  const challenge = story.challenges[currentIdx];

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      stopCurrentAudio();
    };
  }, []);

  const stopCurrentAudio = () => {
    // Stop Browser TTS
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    // Stop Gemini Audio
    if (currentAudioSource.current) {
      try {
        currentAudioSource.current.stop();
        currentAudioSource.current.disconnect();
      } catch (e) {
        // Source might have already ended
      }
      currentAudioSource.current = null;
    }
  };

  const playReference = () => {
    speak(challenge.word, challenge.simplifiedWord, 0.5, 1.6, 'word');
  };

  const speak = async (
    text: string, 
    simplifiedText?: string,
    rate: number = 0.8, 
    pitch: number = 1.0, 
    type: 'story' | 'word' = 'story'
  ) => {
    if (!text) return;
    
    // We use the simplified text strictly for the TTS engine for better Mandarin accuracy
    const ttsText = simplifiedText || text;

    // If the same text is already playing, stop it and return (toggle behavior)
    if (isPlaying === text) {
      stopCurrentAudio();
      setIsPlaying(null);
      return;
    }

    // Stop any existing audio before starting new one
    stopCurrentAudio();
    setIsPlaying(text);
    setIsTTSLoading(true);
    
    // Defensive check: Ensure ttsText is a string before calling substring
    const safeText = String(ttsText || "");
    console.log(`[TTS] Requesting speech for: "${safeText.substring(0, 20)}..."`);

    try {
      // Check Cache First (using simplified text as key for robustness)
      let base64Audio = ttsCache.current[safeText];
      
      if (!base64Audio) {
        // We pass the simplified text to the service
        base64Audio = await generateSpeech(safeText) || '';
        if (base64Audio) {
          ttsCache.current[safeText] = base64Audio;
        }
      } else {
        console.log("[TTS] Using cached audio for:", safeText.substring(0, 10));
      }

      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        const audioContext = audioContextRef.current;
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        let audioBuffer: AudioBuffer;
        
        try {
          // Attempt to decode as standard format (MP3/WAV/etc)
          // This is what MiniMax returns (mp3)
          audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
          console.log("[TTS] Standard audio format detected and decoded.");
        } catch (e) {
          // If decoding fails, it's likely raw PCM (Gemini)
          console.log("[TTS] Raw PCM detected, manual decoding...");
          audioBuffer = audioContext.createBuffer(1, bytes.length / 2, 24000);
          const channelData = audioBuffer.getChannelData(0);
          const dataView = new DataView(bytes.buffer);
          
          for (let i = 0; i < bytes.length / 2; i++) {
            channelData[i] = dataView.getInt16(i * 2, true) / 32768;
          }
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        
        // Store so we can stop it if needed
        currentAudioSource.current = source;
        
        source.onended = () => {
          if (currentAudioSource.current === source) {
            currentAudioSource.current = null;
            setIsPlaying(null);
          }
        };

        source.start();
        setIsTTSLoading(false);
        return;
      } else {
        console.warn("[TTS] Gemini returned no audio, falling back...");
      }
    } catch (error) {
      console.warn("[TTS] Gemini TTS failed, falling back to browser TTS", error);
    }

    // Fallback: Browser Speech Synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsTTSLoading(false);
    utterance.onerror = () => setIsTTSLoading(false);
    utterance.onend = () => setIsTTSLoading(false);
    utterance.lang = 'zh-CN';
    
    const getChildVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return voices.find(v => 
        (v.name.includes('Kid') || v.name.includes('Child') || v.name.includes('Junior')) && 
        v.lang.startsWith('zh')
      ) || voices.find(v => v.lang.startsWith('zh') && v.name.includes('Lili'))
        || voices.find(v => v.lang.startsWith('zh'));
    };
    
    const selectedVoice = getChildVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = rate; // rate/pitch might not map perfectly to API, but for browser it's fine
    utterance.pitch = pitch;
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeechAction = async () => {
    if (isEvaluating) return;

    if (!isListening) {
      try {
        await speechService.startRecording();
        setIsListening(true);
        setFeedback({ type: 'idle', message: '星寶正在聽喔，請大聲唸出咒語吧！' });
      } catch (err) {
        setFeedback({ type: 'error', message: '哎呀，星寶聽不到你的聲音，請檢查麥克風權限。' });
      }
    } else {
      setIsListening(false);
      setIsEvaluating(true);
      setFeedback({ type: 'idle', message: '星寶正在努力感應魔法能量...' });

      try {
        const audioBase64 = await speechService.stopRecording();
        const result = await evaluateSpeech(audioBase64, challenge.word, challenge.pinyin);
        
        setIsEvaluating(false);
        
        if (result.isCorrect) {
          setFeedback({ 
            type: 'success', 
            message: result.feedback, 
            score: result.score 
          });
          
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#FF7E33', '#FFD23F', '#4FB5FF']
          });

          // Play success feedback audio
          speak(result.feedback, '', 0.9, 1.4);
        } else {
          setFeedback({ 
            message: result.feedback,
            score: result.score,
            type: 'error'
          });
          onAddMistake({
            word: challenge.word,
            pinyin: challenge.pinyin,
            feedback: result.feedback
          });
          speak(result.feedback, '', 0.9, 1.4);
        }
      } catch (error) {
        console.error(error);
        setIsEvaluating(false);
        setFeedback({ type: 'error', message: '糟糕！魔法斷線了，請再試一次吧。' });
      }
    }
  };

  const skipLevel = () => {
    if (currentIdx < story.challenges.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setFeedback({ type: 'idle', message: '' });
    } else {
      setIsDone(true);
      onCompleteStory();
    }
  };

  if (showIntro) {
     return (
       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="max-w-3xl mx-auto p-12 bg-white rounded-[48px] shadow-2xl border-8 border-[#FDFCF0] text-center space-y-10"
       >
         <div className="w-40 h-40 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
           <div className="text-8xl">🧚‍♂️</div>
         </div>
         <div className="space-y-6">
           <h2 
             className="text-4xl font-black text-ink cursor-pointer hover:text-primary transition-colors"
             onClick={() => speak('歡迎來到星寶的世界！', '欢迎来到星宝的世界！', 0.8, 1.5)}
           >
             歡迎來到星寶的世界！ 🔊
           </h2>
           <div 
             className="bg-app-bg p-8 rounded-3xl text-left border-l-8 border-secondary font-medium text-lg leading-relaxed text-gray-600 cursor-pointer hover:bg-secondary/5 transition-colors relative group"
             onClick={() => speak(
                '星寶的魔法來自於你美妙的聲音。這本書裡隱藏了一些古代咒語，只有當你準確地唸對它們，產生的魔法共鳴才能幫助我們解開路上的障礙。準備好用你的聲音拯救森林了嗎？', 
                '星宝的魔法来自于你美妙的声音。这本书里隐藏了一些古代咒语，只有当你准确地念对它们，产生的魔法共鸣才能帮助我们解开路上的障碍。准备好用你的声音拯救森林了吗？',
                0.8, 
                1.4
              )}
           >
             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <Volume2 className="w-4 h-4 text-secondary" />
             </div>
             「星寶的魔法來自於你美妙的聲音。這本書裡隱藏了一些古代咒語，只有當你**準確地唸對它們**，產生的魔法共鳴才能幫助我們解開路上的障礙。準備好用你的聲音拯救森林了嗎？」
             <div className="mt-4 text-xs font-bold text-secondary text-center italic opacity-60">點擊文字讓星寶說給你聽 ✨</div>
           </div>
         </div>
         <button 
           onClick={() => setShowIntro(false)}
           className="w-full bg-primary text-white py-6 rounded-2xl text-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center justify-center gap-3"
         >
           <span>我知道了，開始探險！</span>
           <ChevronRight className="w-8 h-8" />
         </button>
       </motion.div>
     );
  }

  if (isDone) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-3xl mx-auto text-center p-16 bg-white rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.1)] mt-10 border-8 border-[#FDFCF0] relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 text-9xl opacity-10">✨</div>
        <div className="w-32 h-32 bg-accent rounded-full flex items-center justify-center mx-auto mb-10 shadow-lg animate-bounce">
          <Trophy className="w-16 h-16 text-white" />
        </div>
        <h2 className="text-5xl font-black mb-6 text-ink tracking-tight">冒險大成功！</h2>
        <div className="bg-app-bg p-8 rounded-[32px] mb-10 text-left relative">
           <div className="absolute -top-4 -left-4 bg-primary text-white p-2 rounded-xl">
             <MessageCircle className="w-6 h-6" />
           </div>
           <p 
             className="text-xl leading-relaxed text-gray-600 font-medium italic cursor-pointer hover:text-primary transition-colors"
             onClick={() => speak(story.ending, story.simplifiedEnding, 0.8, 1.4)}
           >
             "{story.ending}"
           </p>
           <p className="mt-4 font-bold text-primary">—— 小精靈星寶如是說</p>
        </div>
        <button 
          onClick={onExit}
          className="bg-primary text-white w-full py-6 rounded-2xl text-2xl font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          返回圖書館
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 relative py-12 atmosphere-forest">
      {/* Storybook Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-white p-3 rounded-2xl shadow-sm text-primary">
            <Book className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">{story.title}</h2>
            <p className="text-xs font-bold text-[#B2BEC3] uppercase tracking-widest">章節 {currentIdx + 1} / {story.challenges.length}</p>
          </div>
        </div>
        
        {/* Progress Bookmark */}
        <div className="flex gap-2 h-10 items-center bg-white px-4 rounded-full shadow-sm">
           {story.challenges.map((_, i) => (
             <div 
               key={i}
               className={`w-3 h-3 rounded-full transition-all duration-500 ${i <= currentIdx ? 'bg-secondary' : 'bg-gray-100'}`}
             />
           ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-0 glass rounded-[48px] overflow-hidden min-h-[680px]">
        
        {/* Story Content (Left Page) */}
        <motion.div 
          key={`segment-${currentIdx}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 p-16 bg-[#FDFCF0] relative border-r border-[#F0EEDC] flex flex-col"
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:24px_24px]" />
          
          <div className="relative z-10 space-y-8 flex-grow">
            <div className="w-16 h-1 w-primary bg-primary rounded-full" />
            
            <div className="space-y-6">
              <div 
                className="group cursor-pointer hover:bg-primary/5 p-4 rounded-3xl transition-all relative border border-transparent hover:border-primary/10"
                onClick={() => speak(challenge.storySegment, challenge.simplifiedStorySegment, 0.8, 1.5)}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 p-2 rounded-full">
                  <Volume2 className="w-4 h-4 text-primary" />
                </div>
                <p className="text-3xl lg:text-4xl leading-[1.8] font-medium text-ink/80 font-serif first-letter:text-6xl first-letter:font-black first-letter:text-primary first-letter:mr-3 first-letter:float-left">
                  {challenge.storySegment}
                </p>
                <div className="mt-2 text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {isTTSLoading ? '星寶正在深呼吸準備說話...' : '點擊聆聽故事段落 🔊'}
                </div>
              </div>
              
              <AnimatePresence>
                {isTTSLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/20 shadow-sm w-fit mx-auto"
                  >
                    <div className="flex gap-1.5">
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                    </div>
                    <span className="text-[10px] font-black text-primary tracking-widest uppercase">魔法語音生成中</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Visual Motifs (The Scene Box) */}
            <div className="mt-12 p-8 bg-white/50 rounded-[32px] border-2 border-dashed border-primary/20 flex justify-center items-center gap-8 shadow-inner min-h-[160px]">
               {Array.from(challenge.visualMotif || '').map((emoji, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ 
                      delay: 0.5 + i * 0.1, 
                      type: 'spring',
                      stiffness: 260,
                      damping: 20 
                    }}
                    className="text-6xl hover:scale-125 transition-transform cursor-default select-none filter drop-shadow-lg"
                  >
                    {emoji}
                  </motion.div>
               ))}
               {(!challenge.visualMotif || challenge.visualMotif.length === 0) && (
                 <div className="text-primary/20 italic font-medium">魔法場景加載中...</div>
               )}
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 text-secondary font-bold">
            <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center">
              <ChevronRight className="w-5 h-5" />
            </div>
            <span>向右翻頁開啟魔法挑戰</span>
          </div>
        </motion.div>

        {/* Action Zone (Right Page) */}
        <motion.div 
          key={`action-${currentIdx}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 p-12 flex flex-col items-center justify-center text-center relative bg-white"
        >
          {/* Xing Bao Persona */}
          <div className="mb-10 relative">
            <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center relative overflow-hidden group">
               <span className="text-5xl group-hover:scale-125 transition-transform duration-500">🧚‍♂️</span>
               <div className="absolute inset-0 bg-gradient-to-t from-secondary/20 to-transparent" />
            </div>
            <div className="absolute -right-20 top-2 bg-ink text-white p-3 rounded-2xl rounded-bl-none text-sm font-bold animate-pulse whitespace-nowrap">
              跟我一起唸！✨
            </div>
          </div>

          <div className="space-y-6 mb-12">
            <div className="text-sm font-black text-[#B2BEC3] tracking-[0.2em] mb-4">魔法咒語</div>
            
            <div className="relative flex justify-center">
              <AnimatePresence>
                {isHoveringWord && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-6 w-64 bg-white p-5 rounded-[24px] shadow-2xl border-2 border-primary/10 pointer-events-none z-50 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-primary/10 p-1.5 rounded-lg">
                        <Star className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-xs font-black text-primary uppercase tracking-widest">魔法筆記</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="text-2xl font-serif text-secondary font-black border-b border-secondary/10 pb-2">
                        {challenge.pinyin}
                      </div>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">
                        {challenge.hint}
                      </p>
                    </div>
                    
                    {/* Tooltip arrow */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-primary/10 rotate-45" />
                  </motion.div>
                )}
              </AnimatePresence>

              <h3 
                className="text-7xl lg:text-8xl font-black text-primary cursor-pointer hover:scale-105 transition-transform active:scale-95 relative"
                onMouseEnter={() => setIsHoveringWord(true)}
                onMouseLeave={() => setIsHoveringWord(false)}
                onClick={playReference}
              >
                {challenge.word}
              </h3>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              {challenge.pinyin && (
                <div className="text-2xl font-serif text-secondary/60 italic">
                  {challenge.pinyin}
                </div>
              )}
              
              <button 
                onClick={playReference}
                className="flex items-center gap-2 px-6 py-2 bg-secondary/10 text-secondary rounded-full font-bold hover:bg-secondary/20 active:scale-95 transition-all text-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>聽聽星寶怎麼唸</span>
              </button>
            </div>
          </div>

          <div className="w-full max-w-[320px] space-y-8">
            <div className="relative">
              {(isListening || isEvaluating) && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: isEvaluating ? 1.2 : 1.5, opacity: 0 }}
                  transition={{ repeat: Infinity, duration: isEvaluating ? 0.8 : 1.5 }}
                  className={`absolute inset-0 rounded-full ${isEvaluating ? 'bg-secondary/40' : 'bg-primary/20'}`}
                />
              )}
              <button
                onClick={handleSpeechAction}
                disabled={isEvaluating}
                className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto transition-all shadow-2xl relative z-10
                  ${isListening 
                    ? 'bg-red-500 text-white scale-110 shadow-red-200' 
                    : isEvaluating 
                      ? 'bg-secondary text-white' 
                      : 'bg-primary text-white hover:scale-110 active:scale-90 shadow-primary/30'}`}
              >
                {isListening ? <MicOff className="w-12 h-12" /> : isEvaluating ? <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <Mic className="w-12 h-12" />}
              </button>
            </div>

            <AnimatePresence mode="wait">
              {feedback.message && (
                <motion.div
                  key={feedback.message}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onClick={() => speak(feedback.message, '', 0.9, 1.4)}
                  className={`p-6 rounded-[24px] text-sm font-bold leading-relaxed shadow-sm cursor-pointer group hover:scale-[1.02] transition-all relative ${
                    feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                    feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-secondary/5 text-secondary'
                  }`}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    {feedback.type === 'success' ? <Star className="w-4 h-4 fill-current" /> : <MessageCircle className="w-4 h-4" />}
                    <span>{feedback.type === 'success' ? '星寶：太棒了！' : '星寶：別擔心...'}</span>
                  </div>
                  <p>{feedback.message}</p>
                  <div className="mt-2 text-[10px] opacity-70 group-hover:opacity-100 uppercase tracking-widest">
                    點擊星寶來聽他怎麼說 🔊
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next Step Button (Manual Navigation) */}
            {feedback.type === 'success' && (
               <motion.button
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 onClick={skipLevel}
                 className="w-full bg-secondary text-white py-6 rounded-3xl text-xl font-black shadow-xl shadow-secondary/20 hover:bg-secondary/90 active:scale-95 flex items-center justify-center gap-3"
               >
                 <span>翻到下一頁</span>
                 <ChevronRight className="w-7 h-7" />
               </motion.button>
            )}

            {!feedback.type || feedback.type !== 'success' && (
              <button 
                onClick={skipLevel}
                disabled={isEvaluating}
                className="text-[#B2BEC3] hover:text-ink text-sm font-bold underline decoration-secondary underline-offset-8 transition-colors disabled:opacity-50"
              >
                跳過此關
              </button>
            )}
          </div>
        </motion.div>
      </div>

      <div className="mt-12 text-center text-[#B2BEC3] font-bold text-sm bg-white/40 inline-block px-8 py-3 rounded-full mx-auto block">
         「發音魔鏡：小精靈會感應你的每一絲氣息」
      </div>
    </div>
  );
}
