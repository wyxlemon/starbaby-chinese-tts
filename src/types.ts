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
  word: string; // Traditional (for UI)
  simplifiedWord: string; // Simplified (for TTS)
  pinyin?: string;
  instruction: string;
  hint: string;
  storySegment: string; // Traditional
  simplifiedStorySegment: string; // Simplified
  visualMotif?: string; 
}

export interface AdventureStory {
  title: string;
  category: PracticeCategory;
  challenges: WordChallenge[];
  ending: string;
  simplifiedEnding: string;
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

export interface GameState {
  currentLevelIndex: number;
  completedLevels: string[];
  totalScore: number;
}
