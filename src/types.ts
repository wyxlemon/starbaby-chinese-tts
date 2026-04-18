/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PracticeCategory = 
  | 'RETROFLEX' // 平翹舌音
  | 'NASAL'     // 前後鼻音
  | 'NL'        // 鼻音與邊音
  | 'TONES'     // 聲調練習
  | 'CUSTOM';   // 自定義

export interface WordChallenge {
  id: string;
  word: string; // Traditional (for UI & TTS)
  pinyin?: string;
  instruction: string;
  hint: string;
  storySegment: string; // Traditional
  visualMotif?: string; 
}

export interface AdventureStory {
  title: string;
  category: PracticeCategory;
  prologue: string;
  challenges: WordChallenge[];
  ending: string;
  achievement: {
    icon: string; // Emoji representing the medal
    title: string; // e.g., "勇敢的森林衛士"
  };
}

export interface Mistake {
  id: string;
  word: string;
  pinyin?: string;
  feedback: string;
  timestamp: number;
}

export interface Medal {
  id: string;
  storyTitle: string;
  category: PracticeCategory;
  date: string;
}

export interface IntelligenceAnalysis {
  analysis: string;
  mistakeSummary: string;
  recommendations: string[];
  letterFromXingbao: string;
}

export interface GameState {
  currentLevelIndex: number;
  completedLevels: string[];
  totalScore: number;
}
