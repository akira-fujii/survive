
export interface GameState {
  remainingTime: bigint; // Years
  remainingMoney: number; // Yen
  sanity: number; // 0-100 (正気度)
  history: GameHistoryItem[];
  isGameOver: boolean;
  isVictory: boolean;
  gameStatus: 'START' | 'PLAYING' | 'LOST_SANITY' | 'BANKRUPT' | 'COMPLETED';
  ending?: EndingResult;
  difficulty?: 'CHICKEN' | 'EASY' | 'NORMAL';
}

export interface GameHistoryItem {
  id: string;
  itemName: string;
  cost: number;
  timeKilled: bigint;
  sanityChange: number;
  story: string;
  imageUrl: string;
  synergyAnalysis: string;
}

export interface AIResult {
  cost: number;
  timeKilledYears: string;
  sanityChange: number;
  story: string;
  synergyAnalysis: string;
}

export interface EndingResult {
  title: string;
  story: string;
  evaluation: string;
  scoreGrade: string; // S, A, B, C, D
  imageUrl: string;
}
