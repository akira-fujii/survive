
import React from 'react';
import { GameState } from '../types';
import { GAME_CONFIG } from '../config';

interface StatsPanelProps {
  state: GameState;
  onReset: () => void;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state, onReset }) => {
  const formatYears = (years: bigint) => {
    return years.toLocaleString();
  };

  const sanityColor = state.sanity > 50 ? 'text-green-400' : state.sanity > 20 ? 'text-yellow-400' : 'text-red-500';

  // 初期資金を難易度から取得
  const diffKey = Object.keys(GAME_CONFIG.DIFFICULTY).find(
    k => (GAME_CONFIG.DIFFICULTY[k as keyof typeof GAME_CONFIG.DIFFICULTY] as any).label === state.difficulty
  ) as keyof typeof GAME_CONFIG.DIFFICULTY || 'NORMAL';
  const initialMoney = GAME_CONFIG.DIFFICULTY[diffKey].money;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/95 border-b border-zinc-800 shadow-2xl backdrop-blur-md">
      {/* Header row */}
      <div className="flex justify-between items-center px-4 md:px-8 py-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-2xl font-black pixel-font glow-text tracking-tighter italic">
            ５億年ボタン
          </h1>
          <span className="text-zinc-600 uppercase tracking-widest text-[8px] hidden md:inline">{state.difficulty} MODE</span>
        </div>
        <button
          onClick={onReset}
          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest border border-red-500/50 px-3 py-1 rounded-full transition-all"
        >
          Give Up
        </button>
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 p-3 md:px-8 md:py-4">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-widest text-zinc-500 mb-1">残り時間</span>
        <div className="text-2xl md:text-3xl font-bold pixel-font text-white flex items-end gap-2">
          {formatYears(state.remainingTime)} <span className="text-sm font-normal text-zinc-400 pb-1">年</span>
        </div>
        <div className="w-full bg-zinc-800 h-1.5 mt-2 rounded-full overflow-hidden">
          <div 
            className="bg-indigo-500 h-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.max(0, 100 - (Number(state.remainingTime) / Number(GAME_CONFIG.INITIAL_TIME)) * 100)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col border-l border-zinc-800 pl-0 md:pl-6">
        <span className="text-xs uppercase tracking-widest text-zinc-500 mb-1">残金</span>
        <div className="text-2xl md:text-3xl font-bold pixel-font text-yellow-500">
          {state.remainingMoney.toLocaleString()} <span className="text-sm font-normal text-zinc-400">円</span>
        </div>
        <div className="w-full bg-zinc-800 h-1.5 mt-2 rounded-full overflow-hidden">
          <div 
            className="bg-yellow-500 h-full transition-all duration-1000 ease-out"
            style={{ width: `${(state.remainingMoney / initialMoney) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col border-l border-zinc-800 pl-0 md:pl-6">
        <span className="text-xs uppercase tracking-widest text-zinc-500 mb-1">正気度</span>
        <div className={`text-2xl md:text-3xl font-bold pixel-font ${sanityColor}`}>
          {state.sanity}<span className="text-sm font-normal text-zinc-400">%</span>
        </div>
        <div className="w-full bg-zinc-800 h-1.5 mt-2 rounded-full overflow-hidden">
          <div 
            className={`${sanityColor.replace('text', 'bg')} h-full transition-all duration-500 ease-out`}
            style={{ width: `${state.sanity}%` }}
          />
        </div>
      </div>
      </div>
    </div>
  );
};

export default StatsPanel;
