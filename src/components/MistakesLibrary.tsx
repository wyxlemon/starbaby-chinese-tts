import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mistake } from '../types';
import { generateSpeech } from '../services/geminiService';
import { BookMarked, Trash2, ArrowLeft, Volume2, Sparkles } from 'lucide-react';

interface Props {
  mistakes: Mistake[];
  onClear: () => void;
  onBack: () => void;
}

export default function MistakesLibrary({ mistakes, onClear, onBack }: Props) {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const speak = async (text: string, id: string) => {
    if (isPlaying) return;
    setIsPlaying(id);

    try {
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBuffer = audioContext.createBuffer(1, bytes.length / 2, 24000);
        const channelData = audioBuffer.getChannelData(0);
        const dataView = new DataView(bytes.buffer);
        for (let i = 0; i < bytes.length / 2; i++) {
          channelData[i] = dataView.getInt16(i * 2, true) / 32768;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsPlaying(null);
        source.start();
        return;
      }
    } catch (error) {
      console.warn("Library TTS failed", error);
    }

    // Fallback
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.onend = () => setIsPlaying(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="flex items-center justify-between mb-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-ink font-bold hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回冒險</span>
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-black text-ink">精靈秘籍</h2>
          <p className="text-secondary font-medium">記錄你成長的每一個小腳印</p>
        </div>
        <button 
          onClick={onClear}
          className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
          title="清空秘籍"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {mistakes.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center space-y-6 shadow-sm border-2 border-dashed border-gray-100">
          <div className="text-6xl grayscale opacity-30">📚</div>
          <p className="text-gray-400 font-medium text-xl">秘籍中還沒有內容呢<br/>快去開啟故事探險吧！</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {mistakes.map((m, i) => (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-[32px] p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group border border-gray-50"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-8 -mt-8" />
              
              <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                <div className="space-y-2 min-w-[120px]">
                  <h3 className="text-4xl font-black text-primary tracking-tight">{m.word}</h3>
                  <p className="text-lg font-serif text-secondary/60 italic">{m.pinyin}</p>
                </div>
                
                <div className="flex-grow space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-widest">精靈糾音秘訣</span>
                  </div>
                  <p 
                    onClick={() => speak(m.feedback, m.id + '-feedback')}
                    className={`text-gray-600 leading-relaxed font-bold bg-app-bg p-6 rounded-2xl border-l-4 border-primary cursor-pointer transition-colors
                      ${isPlaying === m.id + '-feedback' ? 'bg-primary/5 border-primary ring-2 ring-primary/10' : 'hover:bg-primary/5 hover:border-primary'}`}
                  >
                    {m.feedback}
                    <div className="mt-2 text-[10px] text-primary opacity-60">點擊聆聽精靈指導 🔊</div>
                  </p>
                </div>

                <div className="flex md:flex-col gap-3">
                  <button 
                    onClick={() => speak(m.word, m.id)}
                    disabled={isPlaying !== null}
                    className={`p-4 rounded-2xl shadow-lg transition-all
                      ${isPlaying === m.id ? 'bg-secondary animate-pulse' : 'bg-primary hover:scale-105 active:scale-95 shadow-primary/20'}
                      ${isPlaying !== null && isPlaying !== m.id ? 'opacity-50 grayscale' : 'text-white'}`}
                    title="聽聽正確讀音"
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                  <div className="text-[10px] font-bold text-gray-300 uppercase vertical-text hidden md:block">
                    {new Date(m.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="h-24" /> {/* Spacer for footer */}
    </div>
  );
}
