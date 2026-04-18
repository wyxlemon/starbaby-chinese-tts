/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import StoryAdventurer from './components/StoryAdventurer';
import AdventureGame from './components/AdventureGame';
import MistakesLibrary from './components/MistakesLibrary';
import MedalsGallery from './components/MedalsGallery';
import { Book, ScrollText, Medal as MedalIcon } from 'lucide-react';
import { generateAdventure } from './services/geminiService';
import { AdventureStory, PracticeCategory, Mistake, Medal, IntelligenceAnalysis } from './types';
import { TEST_STORY } from './constants/testScript';

type Screen = 'lobby' | 'game' | 'library' | 'medals';

export default function App() {
  const [screen, setScreen] = useState<Screen>('lobby');
  const [story, setStory] = useState<AdventureStory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isGeneratingRef = React.useRef(false);
  
  // Persistence State
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [analysis, setAnalysis] = useState<IntelligenceAnalysis | null>(null);

  // Load from LocalStorage
  useEffect(() => {
    const savedMistakes = localStorage.getItem('xingbao_mistakes');
    const savedMedals = localStorage.getItem('xingbao_medals');
    const savedAnalysis = localStorage.getItem('xingbao_analysis');
    
    if (savedMistakes) setMistakes(JSON.parse(savedMistakes));
    if (savedMedals) setMedals(JSON.parse(savedMedals));
    if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('xingbao_mistakes', JSON.stringify(mistakes));
  }, [mistakes]);

  useEffect(() => {
    localStorage.setItem('xingbao_medals', JSON.stringify(medals));
  }, [medals]);

  useEffect(() => {
    if (analysis) {
      localStorage.setItem('xingbao_analysis', JSON.stringify(analysis));
    }
  }, [analysis]);

  const startJourney = async (input: string, category: PracticeCategory, heroName: string, assessmentReport?: string | AdventureStory) => {
    if (isGeneratingRef.current) return;
    setIsLoading(true);
    isGeneratingRef.current = true;
    try {
      if (typeof assessmentReport === 'object' && assessmentReport !== null && 'challenges' in assessmentReport) {
        setStory(assessmentReport as AdventureStory);
        setScreen('game');
        return;
      }
      const generated = await generateAdventure(input, category, heroName, assessmentReport as string);
      setStory(generated);
      setScreen('game');
    } catch (error) {
      console.error("Game start failed:", error);
      alert("生成探險地圖失敗，請重試。");
    } finally {
      setIsLoading(false);
      isGeneratingRef.current = false;
    }
  };

  const addMistake = (mistake: Omit<Mistake, 'id' | 'timestamp'>) => {
    const newMistake: Mistake = {
      ...mistake,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setMistakes(prev => [newMistake, ...prev].slice(0, 50)); // Keep last 50
  };

  const addMedal = (storyTitle: string, category: PracticeCategory) => {
    const newMedal: Medal = {
      id: Math.random().toString(36).substr(2, 9),
      storyTitle,
      category,
      date: new Date().toLocaleDateString()
    };
    setMedals(prev => [newMedal, ...prev]);
  };

  const resetGame = () => {
    setScreen('lobby');
    setStory(null);
  };

  return (
    <div className="min-h-screen bg-app-bg text-ink font-sans selection:bg-secondary/30">
      {/* Header Bar */}
      <header className="h-[72px] bg-white border-b border-black/5 flex items-center justify-between px-10 shadow-[0_4px_12px_rgba(0,0,0,0.05)] sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={resetGame}>
          <div className="text-2xl">✨</div>
          <span className="font-extrabold text-2xl text-primary tracking-tight">星寶語音冒險</span>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          {/* Stats removed as requested */}
        </div>
      </header>

      <main className={`min-h-[calc(100vh-72px)] transition-colors duration-500 ${screen === 'game' ? 'bg-[#FDFCF0]' : ''}`}>
        <div className="py-12">
          <AnimatePresence mode="wait">
            {screen === 'lobby' && (
              <motion.div
                key="lobby"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="text-center mb-16">
                  <h1 className="text-6xl font-black mb-4 tracking-tighter text-ink">語音探險：星寶傳說</h1>
                  <p className="text-gray-500 font-serif italic text-xl">跟隨小精靈星寶，在故事書中開啟發音奇旅</p>
                </div>
                <StoryAdventurer 
                  onStart={startJourney} 
                  onStartTest={() => startJourney('', 'RETROFLEX', '小勇士', TEST_STORY)}
                  isLoading={isLoading} 
                  analysis={analysis} 
                />
              </motion.div>
            )}

            {screen === 'game' && story && (
              <motion.div
                key="game"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.4 }}
              >
                <AdventureGame 
                  story={story} 
                  onExit={resetGame} 
                  onAddMistake={addMistake}
                  onCompleteStory={() => addMedal(story.title, story.category)}
                />
              </motion.div>
            )}

            {screen === 'library' && (
              <MistakesLibrary 
                mistakes={mistakes} 
                onClear={() => {
                  setMistakes([]);
                  setAnalysis(null);
                  localStorage.removeItem('xingbao_analysis');
                }} 
                onBack={resetGame}
                onAnalysisUpdate={setAnalysis}
                initialAnalysis={analysis}
              />
            )}

            {screen === 'medals' && (
              <MedalsGallery 
                medals={medals} 
                onBack={resetGame}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="py-6 bg-white border-t border-black/5 text-center flex justify-center gap-16 font-bold text-[10px] text-[#B2BEC3] uppercase tracking-[0.15em] fixed bottom-0 w-full left-0 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] backdrop-blur-md bg-white/90">
        <button 
          onClick={resetGame}
          className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${screen === 'lobby' || screen === 'game' ? 'text-primary scale-110' : 'hover:text-gray-600'}`}
        >
          <Book className={`w-6 h-6 ${screen === 'lobby' || screen === 'game' ? 'text-primary' : 'text-[#B2BEC3]'}`} />
          <span>探險故事</span>
        </button>
        <button 
          onClick={() => setScreen('library')}
          className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${screen === 'library' ? 'text-secondary scale-110' : 'hover:text-gray-600'}`}
        >
          <ScrollText className={`w-6 h-6 ${screen === 'library' ? 'text-secondary' : 'text-[#B2BEC3]'}`} />
          <span>精靈秘籍</span>
        </button>
        <button 
          onClick={() => setScreen('medals')}
          className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${screen === 'medals' ? 'text-accent scale-110' : 'hover:text-gray-600'}`}
        >
          <MedalIcon className={`w-6 h-6 ${screen === 'medals' ? 'text-accent' : 'text-[#B2BEC3]'}`} />
          <span>成就獎章</span>
        </button>
      </footer>
    </div>
  );
}
