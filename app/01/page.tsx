'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

// ===== 動畫翻頁時鐘數字元件 =====
// 只做單位數字翻頁（簡單動畫、無第三方套件）
function FlipDigit({ digit, prevDigit }: { digit: string; prevDigit: string }) {
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (digit !== prevDigit) {
      setFlipping(true);
      const t = setTimeout(() => setFlipping(false), 500);
      return () => clearTimeout(t);
    }
  }, [digit, prevDigit]);

  return (
    <div className="flip-digit-container w-56 h-[190px] mx-2 relative text-[11rem] font-black select-none 
        bg-zinc-900 border-4 border-zinc-700 overflow-hidden"
      style={{ perspective: 900 }}
    >
      {/* 靜態下只顯示新數字，上半部 */}
      <div className="flip-digit-top absolute inset-0 flex items-start justify-center h-1/2 z-10 overflow-hidden">
        <span className="flip-digit-number text-gradient-metal drop-shadow-lg">
          {digit}
        </span>
      </div>
      {/* 動畫翻面（上面） */}
      <div className={`flip-anim-top absolute inset-0 flex items-start justify-center h-1/2 z-20 overflow-hidden`}
        style={{
          transform: flipping ? "rotateX(-90deg)" : "rotateX(0deg)",
          transformOrigin: "bottom",
          transition: 'transform 0.25s cubic-bezier(0.6,0,0.4,1)',
          backfaceVisibility: 'hidden',
        }}>
        <span className="flip-digit-number text-gradient-metal drop-shadow-lg">
          {prevDigit}
        </span>
      </div>
      {/* 下半部 */}
      <div className="flip-digit-bottom absolute top-1/2 left-0 right-0 bottom-0 flex items-end justify-center z-10 overflow-hidden">
        <span className="flip-digit-number text-gradient-metal drop-shadow-lg">
          {digit}
        </span>
      </div>
      {/* 動畫翻面（下面） */}
      <div className={`flip-anim-bottom absolute top-1/2 left-0 right-0 bottom-0 flex items-end justify-center z-20 overflow-hidden`}
        style={{
          transform: flipping ? "rotateX(0deg)" : "rotateX(90deg)",
          transformOrigin: "top",
          transition: 'transform 0.25s cubic-bezier(0.6,0,0.4,1)',
          backfaceVisibility: 'hidden',
        }}>
        <span className="flip-digit-number text-gradient-metal drop-shadow-lg">
          {digit}
        </span>
      </div>
      {/* 分割線 */}
      <div className="absolute left-4 right-4 top-1/2 h-1 bg-zinc-700/80 z-30" />
      {/* 中軸點 */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-10 bg-zinc-800 z-40" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-10 bg-zinc-800 z-40" />
    </div>
  );
}

// 多位數翻頁時鐘
function AnimatedFlipScore({ num }: { num: number }) {
  const padded = num.toString().padStart(3, '0');
  // 前一數字，用於動畫
  const [prev, setPrev] = useState(padded);

  useEffect(() => {
    setPrev(padded);
  }, [num]);

  return (
    <div className="flex items-center justify-center">
      {[0, 1, 2].map(i => (
        <FlipDigit
          key={i}
          digit={padded[i]}
          prevDigit={prev[i]}
        />
      ))}
    </div>
  );
}

export default function Page01() {
  const router = useRouter();

  const [granboard, setGranboard] = useState<Granboard>();
  const [score, setScore] = useState(501);
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [currThrows, setCurrThrows] = useState<number[]>([]);
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(false);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");
  const historyBox = useRef<HTMLDivElement>(null);

  useEffect(() => { if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight; }, [history]);
  useEffect(() => { handleConnect(); }, []);

  function getAdjustedScore(segmentValue: number): number {
    if (!fatBullEnabled) return segmentValue;
    if (segmentValue === 25 || segmentValue === 50) return 50;
    return segmentValue;
  }

  const handleConnect = async () => {
    try {
      const gb = await Granboard.ConnectToBoard();
      setGranboard(gb);
    } catch {}
  };

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      if (currThrows.length === 0 && lastRoundThrows.length > 0) setLastRoundThrows([]);
      if (currThrows.length >= 3) return;
      setCurrThrows(prev => {
        const adjustedValue = getAdjustedScore(segment.Value);
        const newThrows = [...prev, adjustedValue];
        setScore(prevScore => prevScore - adjustedValue);
        if (prev.length === 0 && lastRoundThrows.length > 0) setLastRoundThrows([]);
        if (newThrows.length === 3) endRoundWithThrows(newThrows);
        return newThrows;
      });
    };
  }, [granboard, currThrows, lastRoundThrows, fatBullEnabled]);

  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
    setRound(r => r + 1);
  };
  const endRound = () => { if (currThrows.length === 0) return; endRoundWithThrows(currThrows); };
  const retryCurrentRound = () => {
    const currSum = currThrows.reduce((a, b) => a + b, 0);
    setScore(prevScore => prevScore + currSum);
    setCurrThrows([]);
    setMenuOpen(false);
  };
  const resetGame = () => {
    setScore(501); setRound(1); setHistory([]); setCurrThrows([]); setLastRoundThrows([]); setMenuOpen(false);
  };
  const goHome = () => { router.push('/'); setMenuOpen(false); };
  const toggleFatBull = () => setFatBullEnabled(enabled => !enabled);

  const displayedCurrThrows = lastRoundThrows.length > 0 ? lastRoundThrows : currThrows;
  const currentTotal = 501 - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);
  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return '#f8f8f8';
    const minGray = 32, maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  // 正方形無圓角按鈕
  const squareBtnClass = "w-28 h-28 flex items-center justify-center bg-green-700 hover:bg-green-600 shadow-lg text-white text-5xl p-0";
  const menuBtnClass = "w-28 h-28 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 shadow-lg text-white text-4xl p-0";

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: '16/9', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角選單按鈕：無圓角 */}
        <div className="absolute top-6 right-8 z-50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={menuBtnClass}
            style={{ borderRadius: 0 }}
            aria-label="選單切換"
          >
            <svg width="36" height="36" viewBox="0 0 20 20" fill="none" className="w-14 h-14 inline-block">
              <rect y="3" width="20" height="2.8" rx="1" fill="currentColor" />
              <rect y="8.5" width="20" height="2.8" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2.8" rx="1" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-700 rounded shadow-lg flex flex-col select-none z-[999]">
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { handleConnect(); setMenuOpen(false); }}>重新連接</button>
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { resetGame(); }}>重新開始</button>
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { retryCurrentRound(); }}>重投</button>
              <button className="flex justify-between items-center px-8 py-5 text-2xl hover:bg-zinc-700 focus:bg-zinc-700 cursor-pointer" onClick={toggleFatBull}>
                <span>Fat Bull</span>
                <span className={`ml-3 w-7 h-7 rounded-full border-2 border-yellow-400 flex items-center justify-center`}>
                  {fatBullEnabled ? <span className="w-5 h-5 bg-yellow-400 rounded-full block" /> : ''}
                </span>
              </button>
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700 border-t border-zinc-700" onClick={() => { goHome(); }}>返回首頁</button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-row items-stretch w-full h-full">
          {/* 歷史回合分數區塊：窄，間距縮小 */}
          <div className="flex flex-col justify-center items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div ref={historyBox} className="rounded-2xl shadow-inner flex flex-col h-[32rem] max-h-[87vh] w-full overflow-y-scroll custom-scrollbar py-7">
              <div className="w-full">
                <div className="grid grid-cols-2 gap-x-2 text-center">
                  {history.map((sum, idx) => (
                    <React.Fragment key={idx}>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-4xl font-bold text-gray-900 py-3 border border-black select-none">R{idx + 1}</div>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-6xl font-extrabold py-3 border border-black select-none">{sum}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* 中間翻頁動畫大分數區 */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[480px]">
            <AnimatedFlipScore num={score >= 0 ? score : 0} />
          </div>
          {/* 本回合分數區與回合切換，格子去圓角，間距縮小 */}
          <div className="flex flex-col justify-center items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div className="flex flex-col items-center justify-center mb-16 w-full scale-[1.25] gap-y-3">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="my-1 flex flex-col items-center w-full">
                    <div style={{
                      width: "160px", height: "100px", // 8:5比例
                      borderRadius: 0,
                      transform: "skew(-20deg, -10deg) translateY(0px)",
                      fontStyle: "italic",
                    }}
                      className={`
                        flex items-center justify-center border-2 text-5xl font-extrabold
                        ${displayedCurrThrows[i] !== undefined
                          ? 'border-yellow-400 text-yellow-300 bg-zinc-900'
                          : highlight
                          ? 'border-green-400 text-white bg-green-800 animate-pulse'
                          : 'border-zinc-600 text-zinc-500 bg-zinc-900'
                        }
                        transition-all select-none`}>
                      <span style={{
                        display: "block",
                        fontStyle: "italic",
                        transform: "skew(20deg, 10deg) translate(16px,-12px)", // 字回正但往右上偏移
                        fontWeight: 900
                      }}>
                        {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ROUND CHANGE：無圓角正方形 */}
            <button
              className={squareBtnClass}
              style={{ borderRadius: 0 }}
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="ROUND CHANGE"
            >
              <svg viewBox="0 0 48 48" fill="none" className="w-14 h-14">
                <circle cx="24" cy="24" r="22" stroke="#fff" strokeWidth="3" fill="none" />
                <path d="M34 24a10 10 0 1 0-10 10" stroke="#fff" strokeWidth="3" fill="none" />
                <polygon points="33,28 41,28 41,36" fill="#fff" />
              </svg>
            </button>
          </div>
        </div>
        {/* 下方玩家條 */}
        <div className="flex items-center justify-center gap-10 w-full py-8 bg-gradient-to-t from-black via-zinc-950/80">
          <span className="inline-block w-28 h-28 rounded-full bg-zinc-700 text-[5rem] flex items-center justify-center select-none">{avatar}</span>
          <span className="text-4xl font-bold select-none">{playerName}</span>
          <span className="ml-10 px-8 py-4 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-5xl font-black select-none">
            {currentTotal >= 0 ? currentTotal : 0}
          </span>
        </div>
        <style jsx>{`
          .text-gradient-metal {
            background: linear-gradient(135deg, #f7f7f7, #a9a9a9 20%, #fff 50%, #c9ac36 70%, #8a6d1b 85%, #f7f7f7 95%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            filter: drop-shadow(0 0 8px #fffbe9a9);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 18px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 215, 0, 0.45);
            border-radius: 6px;
            border: 6px solid transparent;
            background-clip: content-box;
          }
        `}</style>
      </main>
    </div>
  );
}
