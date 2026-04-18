import React from 'react';
import { motion } from 'motion/react';
import { Medal } from '../types';
import { Trophy, ArrowLeft, Star, Heart, Cloud, Moon, Sun } from 'lucide-react';

interface Props {
  medals: Medal[];
  onBack: () => void;
}

const MEDAL_ICONS = [
  <Star className="w-10 h-10 text-yellow-400" />,
  <Heart className="w-10 h-10 text-rose-400" />,
  <Cloud className="w-10 h-10 text-sky-400" />,
  <Moon className="w-10 h-10 text-indigo-400" />,
  <Sun className="w-10 h-10 text-orange-400" />,
];

export default function MedalsGallery({ medals, onBack }: Props) {
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
          <h2 className="text-3xl font-black text-ink">成就獎章</h2>
          <p className="text-accent font-medium">每一次通關都是一場榮耀</p>
        </div>
        <div className="w-10" />
      </div>

      {medals.length === 0 ? (
        <div className="bg-white rounded-[40px] p-20 text-center space-y-6 shadow-sm border-2 border-dashed border-gray-100">
          <div className="text-6xl grayscale opacity-30">🏆</div>
          <p className="text-gray-400 font-medium text-xl">目前還沒有獲得獎章呢<br/>完成一個完整冒險來贏取它吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {medals.map((medal, i) => (
            <motion.div
              key={medal.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: i * 0.1,
                type: 'spring',
                stiffness: 260,
                damping: 20
              }}
              className="bg-white rounded-[40px] p-8 text-center space-y-4 shadow-sm hover:shadow-xl transition-all border border-gray-50 relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-accent/5 to-transparent rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform relative z-10">
                <div className="text-4xl">
                  {MEDAL_ICONS[i % MEDAL_ICONS.length]}
                </div>
              </div>
              
              <div className="relative z-10 space-y-1">
                <h3 className="text-lg font-black text-ink leading-tight line-clamp-2">
                  {medal.storyTitle}
                </h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {medal.date}
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-black bg-accent/20 text-accent px-3 py-1 rounded-full">
                    冒險大師
                  </span>
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
