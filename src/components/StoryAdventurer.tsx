import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Sparkles, Wand2, History, User } from 'lucide-react';
import { PracticeCategory } from '../types';

interface Props {
  onStart: (story: string, category: PracticeCategory, heroName: string) => void;
  isLoading: boolean;
}

const CATEGORIES: { id: PracticeCategory; label: string; icon: string }[] = [
  { id: 'RETROFLEX', label: '平翹舌音辨析', icon: '👄' },
  { id: 'NASAL', label: '前後鼻音練習', icon: '👃' },
  { id: 'NL', label: '鼻音與邊音', icon: '👅' },
  { id: 'TONES', label: '聲調穩定性', icon: '🎵' },
  { id: 'CUSTOM', label: '自定義詞庫', icon: '📝' },
];

const PRESET_STORIES = [
  "小精靈星寶在星光森林裡丟失了它的魔法笛子...",
  "在遙遠的深海城市，一隻小海龜正在尋找傳說中的彩色貝殼...",
  "勇敢的小火車多多第一次獨自穿過黑漆漆的山洞...",
];

export default function StoryAdventurer({ onStart, isLoading }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory>('RETROFLEX');
  const [customStory, setCustomStory] = useState('');
  const [customWords, setCustomWords] = useState('');
  const [heroName, setHeroName] = useState('');

  const handleStart = () => {
    // If it's custom mode, we combine customWords and customStory into the prompt
    const finalInput = selectedCategory === 'CUSTOM' ? 
      `自定義練習詞語/主題：${customWords}\n${customStory}` : 
      customStory;
    onStart(finalInput, selectedCategory, heroName || '小勇士');
  };

  return (
    <div className="max-w-4xl mx-auto px-10">
      <div className="grid lg:grid-cols-2 gap-12 bg-white rounded-[40px] p-12 shadow-[0_32px_80px_rgba(0,0,0,0.08)]">
        
        {/* Left: Configuration */}
        <div className="space-y-10">
          {/* 1. Hero Name */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
                <User className="w-4 h-4" /> 1. 主角姓名
             </h3>
             <input
                type="text"
                placeholder="輸入你的名字（如：小明）"
                maxLength={10}
                className="w-full bg-app-bg border-none rounded-3xl p-5 font-extrabold text-ink placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
             />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> 2. 選擇修煉秘籍
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="space-y-3">
                  <button
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all border-2 text-left
                      ${selectedCategory === cat.id 
                        ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10' 
                        : 'border-transparent bg-app-bg text-[#636E72] hover:bg-gray-100'}`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-extrabold text-lg">{cat.label}</span>
                  </button>
                  
                  {selectedCategory === 'CUSTOM' && cat.id === 'CUSTOM' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-2 pb-2"
                    >
                      <textarea
                        placeholder="請輸入想練習的詞語（用逗號隔開），或直接寫主題，如：『關於恐龍的詞語』..."
                        className="w-full h-24 bg-white border-2 border-primary/20 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                        value={customWords}
                        onChange={(e) => setCustomWords(e.target.value)}
                      />
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 3. 探險故事背景
            </h3>
            <textarea
              placeholder="輸入你自己想聽的故事，或是留空讓精靈為你創造..."
              className="w-full h-32 bg-app-bg border-none rounded-3xl p-6 font-medium text-ink placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all resize-none"
              value={customStory}
              onChange={(e) => setCustomStory(e.target.value)}
            />
            
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {PRESET_STORIES.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => setCustomStory(s)}
                  className="bg-app-bg text-[#B2BEC3] px-4 py-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-[10px]"
                >
                  #{s.slice(0, 10)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview & Action */}
        <div className="bg-[#F8F9FF] rounded-[32px] p-10 flex flex-col items-center justify-center text-center space-y-10 border border-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 rotate-12">🛸</div>
          <div className="absolute bottom-0 left-0 p-8 text-6xl opacity-10 -rotate-12">🧚</div>
          
          <div className="relative">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-inner mb-6 mx-auto">
              <Wand2 className="w-12 h-12 text-secondary" />
            </div>
            <h2 className="text-2xl font-black text-ink mb-6 leading-tight">準備好開啟你的<br />傳奇故事了嗎？</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-gray-500 font-bold text-sm">
                <span className="text-lg">✨</span>
                <span>AI 生成專屬故事</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-500 font-bold text-sm">
                <span className="text-lg">👄</span>
                <span>實時糾正發音難點</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-500 font-bold text-sm">
                <span className="text-lg">🎙️</span>
                <span>高清語音魔法助讀</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={isLoading}
            className={`group w-full py-6 rounded-3xl text-xl font-black text-white transition-all shadow-xl flex items-center justify-center gap-3 relative overflow-hidden
              ${isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-primary hover:bg-primary/90 active:scale-95 shadow-primary/20'}`}
          >
            {isLoading ? (
              <>
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                <span>精靈正在編寫故事...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span>開啟冒險之旅！</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
