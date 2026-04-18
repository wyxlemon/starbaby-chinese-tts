import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mistake, IntelligenceAnalysis } from '../types';
import { generateSpeech, analyzeWeaknesses } from '../services/geminiService';
import { BookMarked, Trash2, ArrowLeft, Volume2, Sparkles, BrainCircuit, Wand2, Mail } from 'lucide-react';

interface Props {
  mistakes: Mistake[];
  onClear: () => void;
  onBack: () => void;
  onAnalysisUpdate: (analysis: IntelligenceAnalysis | null) => void;
  initialAnalysis: IntelligenceAnalysis | null;
}

export default function MistakesLibrary({ mistakes, onClear, onBack, onAnalysisUpdate, initialAnalysis }: Props) {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<IntelligenceAnalysis | null>(initialAnalysis);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isRequestingRef = React.useRef(false);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const currentSourceRef = React.useRef<AudioBufferSourceNode | null>(null);

  // Sync internal state if initialAnalysis changes from parent
  useEffect(() => {
    setAnalysis(initialAnalysis);
  }, [initialAnalysis]);

  const handleAnalyze = async () => {
    if (mistakes.length === 0 || isAnalyzing || isRequestingRef.current) return;
    setIsAnalyzing(true);
    isRequestingRef.current = true;
    try {
      const result = await analyzeWeaknesses(mistakes);
      setAnalysis(result);
      onAnalysisUpdate(result);
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setIsAnalyzing(false);
      isRequestingRef.current = false;
    }
  };

  const speak = async (text: string, id: string, pinyin?: string) => {
    if (isPlaying || isRequestingRef.current) return;
    setIsPlaying(id);
    isRequestingRef.current = true;

    // Stop existing audio if any
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }

    try {
      const base64Audio = await generateSpeech(text, 1.0, pinyin);
      if (base64Audio) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioContext = audioContextRef.current;
        await audioContext.resume();

        const binaryString = window.atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBuffer = await audioContext.decodeAudioData(bytes.buffer.slice(0));
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        // Add minimal fade in
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.05);

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.onended = () => {
          setIsPlaying(null);
          currentSourceRef.current = null;
        };
        currentSourceRef.current = source;
        source.start();
        return;
      }
    } catch (error) {
      console.warn("Library TTS failed", error);
    } finally {
      isRequestingRef.current = false;
    }

    // Fallback
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.onend = () => {
      setIsPlaying(null);
      isRequestingRef.current = false;
    };
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

      <AnimatePresence>
        {mistakes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            {!analysis && !isAnalyzing ? (
              <button 
                onClick={handleAnalyze}
                className="w-full bg-gradient-to-r from-primary to-secondary p-8 rounded-[40px] text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-white/20 p-4 rounded-3xl group-hover:rotate-12 transition-transform">
                    <BrainCircuit className="w-10 h-10" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-black">智慧精靈分析</h3>
                    <p className="text-white/80 font-medium">讓星寶為你分析發音規律，並推薦專屬課程</p>
                  </div>
                </div>
                <Wand2 className="w-8 h-8 opacity-50" />
              </button>
            ) : isAnalyzing ? (
              <div className="w-full bg-white p-12 rounded-[40px] shadow-sm border-2 border-primary/20 flex flex-col items-center justify-center space-y-4 animate-pulse">
                <BrainCircuit className="w-12 h-12 text-primary animate-bounce" />
                <p className="text-primary font-black text-xl">星寶正在魔法森林中翻閱資料...</p>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-[48px] shadow-xl overflow-hidden border border-primary/10"
              >
                <div className="bg-gradient-to-br from-primary to-primary/80 p-10 text-white relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <BrainCircuit className="w-32 h-32" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3 bg-white/20 w-fit px-4 py-1.5 rounded-full backdrop-blur-md">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-black tracking-widest uppercase">智慧深度分析報告</span>
                    </div>
                    <h3 className="text-3xl font-black leading-tight tracking-tight">「{analysis.mistakeSummary}」</h3>
                  </div>
                </div>

                <div className="p-10 space-y-10">
                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-ink font-black">
                        <Wand2 className="w-5 h-5 text-primary" />
                        <span>發音弱點診斷</span>
                      </div>
                      <div className="bg-app-bg p-6 rounded-[32px] text-gray-600 font-medium leading-relaxed border-l-4 border-primary">
                        {analysis.analysis}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-ink font-black">
                        <Sparkles className="w-5 h-5 text-secondary" />
                        <span>專屬魔法訓練推薦</span>
                      </div>
                      <div className="grid gap-3">
                        {analysis.recommendations.map((rec, i) => (
                          <div 
                            key={i}
                            className="bg-secondary/5 p-4 rounded-2xl flex items-center gap-4 group cursor-pointer hover:bg-secondary/10 transition-all"
                          >
                            <div className="w-8 h-8 bg-secondary/20 rounded-xl flex items-center justify-center text-secondary font-black text-sm">
                              {i + 1}
                            </div>
                            <span className="font-bold text-ink/80 group-hover:text-secondary transition-colors">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FDFCF0] p-8 rounded-[40px] border border-[#F0EEDC] relative">
                    <div className="absolute top-6 right-6 text-4xl opacity-20">📜</div>
                    <div className="flex items-start gap-4">
                      <Mail className="w-6 h-6 text-primary mt-1" />
                      <div className="space-y-3">
                        <div className="text-sm font-black text-primary uppercase tracking-widest">來自星寶的一封信</div>
                        <p className="text-gray-700 font-bold italic leading-relaxed text-lg italic">
                          "{analysis.letterFromXingbao}"
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setAnalysis(null);
                      onAnalysisUpdate(null);
                    }}
                    className="text-xs font-bold text-gray-300 hover:text-primary transition-colors text-center w-full uppercase tracking-tighter"
                  >
                    重新生成魔法報告
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                    onClick={() => speak(m.word, m.id, m.pinyin)}
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
