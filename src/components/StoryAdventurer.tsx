import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, Wand2, History, User, Box } from 'lucide-react';
import { PracticeCategory, IntelligenceAnalysis } from '../types';

interface Props {
  onStart: (story: string, category: PracticeCategory, heroName: string, assessmentReport?: string) => void;
  onStartTest: () => void;
  isLoading: boolean;
  analysis: IntelligenceAnalysis | null;
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

export default function StoryAdventurer({ onStart, onStartTest, isLoading, analysis }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory>('RETROFLEX');
  const [customStory, setCustomStory] = useState('');
  const [customWords, setCustomWords] = useState('');
  const [heroName, setHeroName] = useState('');
  const [assessmentReport, setAssessmentReport] = useState('');
  const [childLikes, setChildLikes] = useState('');
  const [childDislikes, setChildDislikes] = useState('');

  const isRequestingStartRef = React.useRef(false);

  const handleStart = () => {
    if (isLoading || isRequestingStartRef.current) return;
    
    // If it's custom mode, we combine customWords and customStory into the prompt
    let finalInput = selectedCategory === 'CUSTOM' ? 
      `自定義練習詞語/主題：${customWords}\n${customStory}` : 
      customStory;

    if (childLikes) {
      finalInput += `\n孩子喜歡的事物：${childLikes}`;
    }
    if (childDislikes) {
      finalInput += `\n孩子不喜歡的事物：${childDislikes}`;
    }
    
    isRequestingStartRef.current = true;
    onStart(finalInput, selectedCategory, heroName || '小勇士', assessmentReport);
  };

  // Reset the ref if isLoading becomes false (meaning a failure or completion)
  React.useEffect(() => {
    if (!isLoading) {
      isRequestingStartRef.current = false;
    }
  }, [isLoading]);

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
                className="w-full bg-app-bg border-none rounded-3xl p-5 font-extrabold text-ink placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
             />
          </div>

          {/* 2. Assessment Report (Primary Recommendation) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-secondary flex items-center gap-2">
              <History className="w-4 h-4" /> 2. 兒童成長與發展分析 (推薦)
            </h3>
            <div className="bg-secondary/5 rounded-3xl p-1 border border-secondary/10">
              <textarea
                placeholder="在此貼上孩子的觀察報告（如：在表演區的表現、發音特點、詞彙量情況等）。精靈會自動分析並量身打造故事挑戰。"
                className="w-full h-56 bg-white border-2 border-transparent rounded-[28px] p-5 text-sm font-medium focus:border-secondary/20 focus:ring-0 outline-none resize-none placeholder:text-gray-300 transition-all"
                value={assessmentReport}
                onChange={(e) => setAssessmentReport(e.target.value)}
              />
            </div>
            <div className="px-2">
              <p className="text-[10px] text-gray-400 leading-relaxed italic">
                * 這是星寶最推薦的方式！填寫報告能讓 AI 精靈發現孩子的「最近發展區」，生成的練習詞彙會更加合理且具備引導性。
              </p>
            </div>
          </div>

          {/* 3. Likes & Dislikes */}
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-primary" /> 孩子喜歡的
                </h3>
                <input
                   type="text"
                   placeholder="如：恐龍, 草莓..."
                   className="w-full bg-app-bg border-none rounded-2xl p-4 text-sm font-bold text-ink placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                   value={childLikes}
                   onChange={(e) => setChildLikes(e.target.value)}
                />
             </div>
             <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
                   <Box className="w-4 h-4 text-gray-400" /> 孩子不喜歡的
                </h3>
                <input
                   type="text"
                   placeholder="如：打針, 黑暗..."
                   className="w-full bg-app-bg border-none rounded-2xl p-4 text-sm font-bold text-ink placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                   value={childDislikes}
                   onChange={(e) => setChildDislikes(e.target.value)}
                />
             </div>
          </div>

          {/* 4. Categories & Background (Advanced) */}
          <div className="pt-4 border-t border-dashed border-gray-100 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 3. 額外指定修煉領域
              </h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl transition-all border-2 text-sm font-bold
                      ${selectedCategory === cat.id 
                        ? 'border-primary bg-primary/5 text-primary shadow-lg shadow-primary/5' 
                        : 'border-transparent bg-app-bg text-[#636E72] hover:bg-gray-100'}`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
              
              <AnimatePresence>
                {selectedCategory === 'CUSTOM' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="px-1"
                  >
                    <input
                      type="text"
                      placeholder="指定詞彙：如『面粉, 手套』或『海底世界』"
                      className="w-full bg-white border-2 border-primary/20 rounded-2xl p-4 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      value={customWords}
                      onChange={(e) => setCustomWords(e.target.value)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#B2BEC3] flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> 5. 探險故事背景 (可留空)
              </h3>
              <textarea
                placeholder="想要什麼樣的故事背景？如：『外太空大冒險』..."
                className="w-full h-24 bg-app-bg border-none rounded-3xl p-5 text-sm font-medium text-ink placeholder:text-gray-300 focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
                value={customStory}
                onChange={(e) => setCustomStory(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {PRESET_STORIES.map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCustomStory(s)}
                    className="bg-app-bg text-[#B2BEC3] px-3 py-1.5 rounded-full hover:bg-gray-100 active:scale-95 transition-all text-[10px] font-bold"
                  >
                    #{s.slice(0, 10)}...
                  </button>
                ))}
              </div>
            </div>
          </div>

          {analysis && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-secondary/5 rounded-3xl p-6 border border-secondary/10 space-y-4"
            >
              <div className="flex items-center gap-2 text-secondary font-black text-xs uppercase tracking-widest">
                <Wand2 className="w-4 h-4" />
                <span>星寶為你挑選的主題</span>
              </div>
              <div className="grid gap-2">
                {analysis.recommendations.map((rec, i) => (
                  <button
                    key={i}
                    onClick={() => setCustomStory(rec)}
                    className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all text-left group"
                  >
                    <div className="w-6 h-6 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary text-[10px] font-black group-hover:bg-secondary group-hover:text-white transition-colors">
                      {i + 1}
                    </div>
                    <span className="text-sm font-bold text-ink/80 group-hover:text-ink transition-colors">{rec}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
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

          <div className="w-full space-y-3">
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

            {!isLoading && (
              <button
                onClick={onStartTest}
                className="w-full py-3 rounded-2xl text-xs font-bold text-gray-400 hover:text-secondary hover:bg-secondary/5 transition-all border border-dashed border-gray-200"
              >
                🧪 使用測試腳本 (快速驗證用)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
