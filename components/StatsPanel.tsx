
import React from 'react';
import { GameState } from '../types';
import { GAME_CONFIG } from '../config';

interface StatsPanelProps {
  state: GameState;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ state }) => {
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-2xl backdrop-blur-sm">
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
  );
};

export default StatsPanel;
