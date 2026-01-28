import React, { useState, useEffect, useRef } from 'react';
import { GameState, GameHistoryItem } from './types';
import { evaluateItem, generateItemImage, generateEnding, generateEndingImage, getApiKey, setApiKey, hasApiKey } from './services/geminiService';
import StatsPanel from './components/StatsPanel';
import { GAME_CONFIG } from './config';


const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    remainingTime: GAME_CONFIG.INITIAL_TIME,
    remainingMoney: 0,
    sanity: GAME_CONFIG.INITIAL_SANITY,
    history: [],
    isGameOver: false,
    isVictory: false,
    gameStatus: 'START',
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEndingLoading, setIsEndingLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasSelectedKey, setHasSelectedKey] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasSelectedKey(hasApiKey());
    setApiKeyInput(getApiKey());

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.history]);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      setApiKey(trimmed);
      setHasSelectedKey(true);
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setApiKeyInput('');
    setHasSelectedKey(false);
  };

  const startGame = (difficultyKey: keyof typeof GAME_CONFIG.DIFFICULTY) => {
    const diff = GAME_CONFIG.DIFFICULTY[difficultyKey];
    setState({
      remainingTime: GAME_CONFIG.INITIAL_TIME,
      remainingMoney: diff.money,
      sanity: GAME_CONFIG.INITIAL_SANITY,
      history: [],
      isGameOver: false,
      isVictory: false,
      gameStatus: 'PLAYING',
      difficulty: diff.label as any
    });
  };

  const triggerEnding = async (updatedState: GameState) => {
    setIsEndingLoading(true);
    setLoadingText("運命を確定しています...");
    try {
      const result = await generateEnding(
        updatedState.history, 
        updatedState.gameStatus, 
        updatedState.remainingTime,
        updatedState.remainingMoney,
        updatedState.sanity
      );
      const imageUrl = await generateEndingImage(result.title, updatedState.gameStatus);
      
      setState(prev => ({
        ...prev,
        ending: { ...result, imageUrl }
      }));
    } catch (error: any) {
      console.error("Ending Generation Error:", error);
      if (error?.message?.includes("Requested entity was not found")) {
        setHasSelectedKey(false);
      }
      setState(prev => ({
        ...prev,
        ending: {
          title: "因果の消失",
          story: "あなたの辿った道は、もはや既存の理では説明できない領域に達しました。",
          evaluation: "測定不能",
          scoreGrade: "D",
          imageUrl: "https://picsum.photos/800/450?grayscale"
        }
      }));
    } finally {
      setIsEndingLoading(false);
      setLoadingText("");
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isEndingLoading || state.isGameOver) return;

    const itemName = input.trim();
    setInput('');
    setIsLoading(true);
    
    let msgIdx = 0;
    const interval = setInterval(() => {
      const msgs = ["虚空でアイテムを探しています...", "コストを算出中...", "時間を歪めています...", "シナジーを計算中...", "運命のダイスを振っています..."];
      setLoadingText(msgs[msgIdx % msgs.length]);
      msgIdx++;
    }, 1500);

    try {
      const [aiResult, imageUrl] = await Promise.all([
        evaluateItem(itemName, state.history, state.remainingMoney),
        generateItemImage(itemName)
      ]);

      const numericString = aiResult.timeKilledYears.replace(/\D/g, '') || "0";
      const timeKilled = BigInt(numericString);

      const newHistoryItem: GameHistoryItem = {
        id: crypto.randomUUID(),
        itemName,
        cost: aiResult.cost,
        timeKilled,
        sanityChange: aiResult.sanityChange,
        story: aiResult.story,
        imageUrl,
        synergyAnalysis: aiResult.synergyAnalysis,
      };

      setState(prev => {
        const nextTime = prev.remainingTime - timeKilled;
        const nextMoney = prev.remainingMoney - aiResult.cost;
        const nextSanity = Math.min(100, Math.max(0, prev.sanity + aiResult.sanityChange));
        
        let status: GameState['gameStatus'] = 'PLAYING';
        let isGameOver = false;
        let isVictory = false;

        if (nextTime <= 0n) {
          status = 'COMPLETED';
          isGameOver = true;
          isVictory = true;
        } else if (nextSanity <= 0) {
          status = 'LOST_SANITY';
          isGameOver = true;
        } else if (nextMoney <= 0) {
          status = 'BANKRUPT';
          isGameOver = true;
        }

        const newState: GameState = {
          ...prev,
          remainingTime: nextTime < 0n ? 0n : nextTime,
          remainingMoney: nextMoney,
          sanity: nextSanity,
          history: [...prev.history, newHistoryItem],
          gameStatus: status,
          isGameOver,
          isVictory,
        };

        if (isGameOver) {
          setTimeout(() => triggerEnding(newState), 2000);
        }

        return newState;
      });

    } catch (error: any) {
      console.error("API Error:", error);
      if (error?.message?.includes("Requested entity was not found")) {
        setHasSelectedKey(false);
      }
      alert("虚空との通信に失敗しました。もう一度試してください。");
    } finally {
      clearInterval(interval);
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const resetGame = () => {
    setState({
      remainingTime: GAME_CONFIG.INITIAL_TIME,
      remainingMoney: 0,
      sanity: GAME_CONFIG.INITIAL_SANITY,
      history: [],
      isGameOver: false,
      isVictory: false,
      gameStatus: 'START',
    });
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-yellow-400 border-yellow-400';
      case 'A': return 'text-orange-400 border-orange-400';
      case 'B': return 'text-green-400 border-green-400';
      case 'C': return 'text-blue-400 border-blue-400';
      default: return 'text-zinc-500 border-zinc-500';
    }
  };

  if (state.gameStatus === 'START') {
    return (
      <div className="min-h-screen void-bg flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <h1 className="text-5xl md:text-8xl font-black pixel-font glow-text tracking-tighter mb-4 italic animate-pulse">
          ５億年ボタン
        </h1>
        <p className="text-zinc-500 uppercase tracking-[0.5em] text-sm mb-12">Survival Economy Simulator</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mb-12">
          {(Object.keys(GAME_CONFIG.DIFFICULTY) as Array<keyof typeof GAME_CONFIG.DIFFICULTY>).map((key) => {
            const diff = GAME_CONFIG.DIFFICULTY[key];
            const colors = { CHICKEN: 'hover:border-yellow-500', EASY: 'hover:border-indigo-500', NORMAL: 'hover:border-red-600' };
            const textColors = { CHICKEN: 'text-yellow-500', EASY: 'text-indigo-400', NORMAL: 'text-red-600' };
            return (
              <button 
                key={key}
                onClick={() => startGame(key)}
                className={`group bg-zinc-900 border-2 border-zinc-800 p-8 rounded-3xl transition-all transform hover:-translate-y-2 ${colors[key]}`}
              >
                <div className={`${textColors[key]} pixel-font text-3xl mb-2`}>{diff.label}</div>
                <div className="text-white font-bold mb-4">{diff.money.toLocaleString()}円</div>
                <p className="text-xs text-zinc-500 leading-relaxed">{diff.description}</p>
              </button>
            );
          })}
        </div>

        {/* APIキー設定セクション */}
        <div className="p-6 border border-zinc-800 rounded-3xl bg-zinc-900/30 max-w-lg w-full mb-8">
          <h3 className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-4">Gemini API Key Configuration</h3>
          <div className="flex flex-col items-center gap-4">
            {hasSelectedKey ? (
              <div className="w-full space-y-3">
                <div className="flex items-center gap-2 py-3 px-4 rounded-2xl bg-green-600/20 border border-green-600/50">
                  <span className="text-green-400 font-black">API Key Set</span>
                  <span className="text-green-600 text-xs flex-1 truncate font-mono">
                    {apiKeyInput.slice(0, 8)}...{apiKeyInput.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={handleClearApiKey}
                  className="w-full py-2 px-4 rounded-xl text-red-400 border border-red-600/30 hover:bg-red-600/10 text-xs uppercase tracking-widest transition-all"
                >
                  Clear API Key
                </button>
              </div>
            ) : (
              <div className="w-full space-y-3">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Gemini API Key"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="w-full py-3 px-6 rounded-2xl font-black uppercase tracking-widest transition-all bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save API Key
                </button>
              </div>
            )}
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              APIキーはブラウザのlocalStorageに保存されます。<br />
              <a href="https://aistudio.google.com/apikey" target="_blank" className="underline hover:text-indigo-400">Google AI Studio</a> でAPIキーを取得できます。
            </p>
          </div>
        </div>
        
        <p className="text-zinc-700 text-[10px] tracking-widest uppercase">Select your budget to enter the void</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen void-bg flex flex-col p-4 md:p-8 pt-28 md:pt-24 max-w-5xl mx-auto overflow-hidden relative">
      <StatsPanel state={state} />
      <header className="mb-8 text-center flex justify-between items-center">
        <div className="text-left">
          <h1 className="text-2xl md:text-4xl font-black pixel-font glow-text tracking-tighter italic">
            ５億年ボタン
          </h1>
          <p className="text-zinc-600 uppercase tracking-widest text-[8px]">{state.difficulty} MODE ACTIVE</p>
        </div>
        <button onClick={resetGame} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 text-[10px] uppercase tracking-widest border border-red-500/50 px-3 py-1 rounded-full transition-all">Give Up</button>
      </header>

      {showDebug && (
        <div className="fixed top-4 left-4 z-[200] bg-black/95 border-2 border-green-500 p-4 rounded-lg font-mono text-[10px] text-green-400 max-w-sm shadow-[0_0_30px_rgba(0,255,0,0.2)] max-h-[80vh] overflow-auto">
          <div className="flex justify-between items-center mb-2 border-b border-green-900 pb-1">
            <span className="font-bold tracking-widest text-green-500 uppercase">System Monitor</span>
            <button onClick={() => setShowDebug(false)} className="text-red-500 font-bold hover:bg-red-500 hover:text-white px-1">X</button>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-2 gap-x-2 text-[8px]">
              <p>STATUS:</p><p className="font-bold">{state.gameStatus}</p>
              <p>TIME:</p><p>{state.remainingTime.toString()}</p>
              <p>MONEY:</p><p>{state.remainingMoney}</p>
              <p>SANITY:</p><p>{state.sanity}%</p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden flex flex-col gap-6">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar scroll-smooth">
          {state.history.length === 0 && !isLoading && !isEndingLoading && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-100 animate-pulse">
              <div className="w-16 h-16 border-2 border-zinc-500 rounded-full flex items-center justify-center mb-4 text-2xl text-white glow-text">?</div>
              <p className="font-bold text-lg text-center">虚無が広がっています。何かを購入して時間を潰してください。</p>
              <p className="text-[10px] mt-8 text-zinc-600 uppercase tracking-widest">Shift + D to Toggle Debug Panel</p>
            </div>
          )}

          {state.history.map((item) => (
            <div key={item.id} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-48 h-48 bg-zinc-800 shrink-0 cursor-zoom-in overflow-hidden group/img" onClick={() => setSelectedImage(item.imageUrl)}>
                  <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-white px-3 py-1 bg-zinc-800 rounded-lg">{item.itemName}</h3>
                      <div className="text-right">
                        <div className="text-sm text-zinc-500 uppercase font-bold tracking-tighter">Cost</div>
                        <div className="text-lg font-black text-yellow-500">-{item.cost.toLocaleString()}円</div>
                      </div>
                    </div>
                    <p className="text-zinc-300 leading-relaxed mb-4 italic font-medium">「{item.story}」</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                    <div>
                      <span className="text-xs text-zinc-500 uppercase block mb-1 font-bold">Time Killed</span>
                      <span className="text-blue-400 font-black pixel-font">{item.timeKilled.toLocaleString()} 年</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 uppercase block mb-1 font-bold">正気度変化</span>
                      <span className={`font-black pixel-font ${item.sanityChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {item.sanityChange > 0 ? '+' : ''}{item.sanityChange}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {(isLoading || isEndingLoading) && (
            <div className="flex items-center gap-4 p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed animate-pulse">
              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-indigo-400 font-black pixel-font tracking-widest uppercase text-sm">{loadingText || "判定中..."}</div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-black/80 backdrop-blur-md pt-4 pb-2">
          {!state.isGameOver && !isEndingLoading && (
            <form onSubmit={handlePurchase} className="flex gap-3">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="何を購入しますか？" disabled={isLoading} className="flex-1 bg-zinc-900 border border-zinc-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
              <button type="submit" disabled={isLoading || !input.trim()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase hover:bg-indigo-500 disabled:opacity-50 transition-all shrink-0">Purchase</button>
            </form>
          )}
        </div>
      </main>

      {selectedImage && (
        <div className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in zoom-in duration-300" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Expanded" className="max-w-full max-h-full rounded-xl shadow-2xl border-2 border-zinc-800" />
        </div>
      )}

      {(state.isGameOver && state.ending) && (
        <div className={`fixed inset-0 z-[300] overflow-y-auto flex flex-col items-center animate-in fade-in duration-[2000ms] ${state.isVictory ? 'bg-zinc-50 text-zinc-900' : 'bg-black text-zinc-100'}`}>
          <div className="w-full max-w-4xl p-6 md:p-12 space-y-10 relative z-10">
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 group">
              <img src={state.ending.imageUrl} alt="Ending" className="w-full h-full object-cover transition-transform duration-[30s] scale-100 group-hover:scale-110" />
              <div className={`absolute inset-0 ${state.isVictory ? 'bg-gradient-to-t from-white/60' : 'bg-gradient-to-t from-black via-black/20'}`}></div>
              <div className="absolute top-6 right-6 px-6 py-2 rounded-full font-black pixel-font tracking-widest text-lg border-4 shadow-2xl bg-white animate-bounce">RANK {state.ending.scoreGrade}</div>
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <h2 className={`text-5xl md:text-7xl font-black pixel-font mb-4 italic uppercase ${state.isVictory ? 'text-zinc-900' : 'text-white glow-text'}`}>{state.ending.title}</h2>
              </div>
            </div>
            <div className="space-y-12 text-lg md:text-2xl leading-relaxed font-serif animate-in fade-in slide-in-from-bottom-12 delay-1000 duration-[1500ms] fill-mode-both">
              <div className="whitespace-pre-wrap italic drop-shadow-sm first-letter:text-6xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-indigo-600">{state.ending.story}</div>
              <div className={`p-6 rounded-3xl border ${state.isVictory ? 'bg-white/80 border-indigo-100' : 'bg-zinc-900/50 border-zinc-800'}`}>
                <h4 className="text-xs uppercase tracking-[0.3em] mb-4 font-black">Archived Possessions</h4>
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                  {state.history.map((item) => (
                    <div key={item.id} className="shrink-0 w-32">
                      <div className="aspect-square rounded-xl overflow-hidden mb-2 border-2 border-transparent hover:border-indigo-500 transition-all">
                        <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] font-bold truncate text-center opacity-70">{item.itemName}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={`p-10 rounded-[2.5rem] border-2 shadow-2xl relative overflow-hidden group ${state.isVictory ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-900/80 border-zinc-800'}`}>
                <h4 className="text-sm uppercase tracking-[0.4em] mb-6 font-black border-b pb-2 inline-block">SESSION EVALUATION</h4>
                <p className="font-bold pixel-font text-3xl md:text-5xl italic leading-tight">「{state.ending.evaluation}」</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-xs font-bold opacity-70">RANK:</span>
                  <span className="text-5xl font-black italic underline decoration-wavy decoration-indigo-300">{state.ending.scoreGrade}</span>
                </div>
              </div>
              <div className="text-center pt-10 pb-32">
                <button onClick={resetGame} className={`group px-20 py-8 font-black rounded-full overflow-hidden transition-all shadow-2xl ${state.isVictory ? 'bg-zinc-900 text-white' : 'bg-indigo-700 text-white'}`}>RESTART</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
