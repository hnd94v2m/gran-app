'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

// 中間大分數：終端機翻頁動畫數字組件
function TerminalFlipDigit({ digit }: { digit: string }) {
  // 用狀態輪播 0~9 快速變，最後停在 digit
  const [current, setCurrent] = useState('0');
  useEffect(() => {
    let count = 0;
    let running = true;
    const interval = setInterval(() => {
      if (!running) return;
      count++;
      if (count > 10) {
        running = false;
        setCurrent(digit);
        clearInterval(interval);
      } else {
        setCurrent((Math.floor(Math.random() * 10)).toString());
      }
    }, 50);
    return () => clearInterval(interval);
  }, [digit]);

  return (
    <span className="terminal-digit select-none bg-black text-green-400 font-mono font-bold px-4 py-6 rounded-sm shadow-md">
      {current}
    </span>
  );
}

// 整組三位數動畫分數
function TerminalFlipScore({ num }: { num: number }) {
  const padded = num.toString().padStart(3, '0');
  return (
    <div className="flex space-x-3 justify-center">
      {padded.split('').map((d, i) => (
        <TerminalFlipDigit digit={d} key={i} />
      ))}
    </div>
  );
}

export default function Page01() {
  const router = useRouter();

  const [granboard, setGranboard] = useState<Granboard>();
  const [score, setScore] = useState(START_SCORE);
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [currThrows, setCurrThrows] = useState<number[]>([]);
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(false);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");
  const historyBox = useRef<HTMLDivElement>(null);

  // 歷史分數自動滾到底
  useEffect(() => {
    if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight;
  }, [history]);
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
    setScore(START_SCORE); setRound(1); setHistory([]); setCurrThrows([]); setLastRoundThrows([]);
    setMenuOpen(false);
  };
  const goHome = () => { router.push('/'); setMenuOpen(false); };
  const toggleFatBull = () => setFatBullEnabled(enabled => !enabled);

  const displayedCurrThrows = lastRoundThrows.length > 0 ? lastRoundThrows : currThrows;
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);

  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return '#f8f8f8';
    const minGray = 32, maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  // 按鈕樣式
  const squareBtnClass =
    "w-28 h-28 flex items-center justify-center bg-green-700 hover:bg-green-600 shadow-lg text-white text-5xl p-0";
  const menuBtnClass =
    "w-28 h-28 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 shadow-lg text-white text-4xl p-0";

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: '16/9', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角選單按鈕 */}
        <div className="absolute top-6 right-8 z-50">
          <button onClick={() => setMenuOpen(!menuOpen)} className={menuBtnClass} aria-label="選單切換">
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

          {/* 歷史回合分數區塊 */}
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

          {/* 中間大分數區，用終端機風格翻頁動畫 */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[480px]">
            <TerminalFlipScore num={score >= 0 ? score : 0} />
          </div>

          {/* 本回合分數區 (上下排列)，格子不斜切，文字斜切 */}
          <div className="flex flex-col justify-center items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div className="flex flex-col items-center justify-center mb-16 w-full scale-[1.25] gap-y-3">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="my-1 flex flex-col items-center w-full">
                    <div style={{width: '160px', height: '100px', borderRadius: 0}}
                      className={`
                        flex items-center justify-center border-2 text-5xl font-extrabold
                        ${displayedCurrThrows[i] !== undefined
                          ? 'border-yellow-400 text-yellow-300 bg-zinc-900'
                          : highlight
                          ? 'border-green-400 text-white bg-green-800 animate-pulse'
                          : 'border-zinc-600 text-zinc-500 bg-zinc-900'
                        }
                        transition-all select-none`}
                    >
                      <span style={{
                        display: "block",
                        fontStyle: "italic",
                        transform: "skew(20deg, 10deg)", // 文字斜切
                        fontWeight: 900,
                        paddingTop: '12px',
                        paddingRight: '10px',
                      }}>
                        {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* ROUND CHANGE 按鈕（無圓角） */}
            <button
              className="w-28 h-28 flex items-center justify-center bg-green-700 hover:bg-green-600 shadow-lg text-white text-5xl p-0"
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
          .custom-scrollbar::-webkit-scrollbar {
            width: 18px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 215, 0, 0.45);
            border-radius: 6px;
            border: 6px solid transparent;
            background-clip: content-box;
          }
          .terminal-digit {
            font-feature-settings: "tnum"; /* 等寬數字 */
          }
          .text-gradient-metal {
            background: linear-gradient(135deg, #f7f7f7, #a9a9a9 20%, #fff 50%, #c9ac36 70%, #8a6d1b 85%, #f7f7f7 95%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            filter: drop-shadow(0 0 8px #fffbe9a9);
          }
        `}</style>
      </main>
    </div>
  );
}

