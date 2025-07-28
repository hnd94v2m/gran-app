'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

// 超放大終端機翻頁動畫大數字
function TerminalFlipDigit({ digit }: { digit: string }) {
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
    }, 60);
    return () => clearInterval(interval);
  }, [digit]);
  return (
    <span className="terminal-digit select-none bg-black text-green-400 font-mono font-extrabold px-16 py-14 rounded shadow-2xl text-[18rem] leading-none drop-shadow-xl">
      {current}
    </span>
  );
}
function TerminalFlipScore({ num }: { num: number }) {
  const padded = num.toString().padStart(3, '0');
  return (
    <div className="flex space-x-12 justify-center items-center">
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

  // 回合及投鏢狀態
  const [round, setRound] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [currThrows, setCurrThrows] = useState<number[]>([]);
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const historyBox = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(false);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");

  // 滾到底
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
      setCurrThrows(prev => {
        // ▸ 若已投滿三鏢，這一標直接刷新進下個回合
        if (prev.length >= 3) {
          endRoundWithThrows(prev); // 先結束本回合
          setTimeout(() => {
            // 第四鏢成新回合的第一鏢
            setCurrThrows([getAdjustedScore(segment.Value)]);
            setScore(s => s - getAdjustedScore(segment.Value));
            setRound(r => r + 1);
            setLastRoundThrows([]); // 清掉暫存，立刻刷新
          }, 0);
          return prev; // 本次不加進來
        }

        const adjustedValue = getAdjustedScore(segment.Value);
        const newThrows = [...prev, adjustedValue];
        setScore(prevScore => prevScore - adjustedValue);

        // 如達三鏢自動結束回合
        if (newThrows.length === 3) {
          endRoundWithThrows(newThrows);
        }
        return newThrows;
      });
    };
    // eslint-disable-next-line
  }, [granboard, currThrows, lastRoundThrows, fatBullEnabled]);

  // 結束回合
  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
  };

  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows);
    setRound(r => r + 1);
  };
  const retryCurrentRound = () => {
    const currSum = currThrows.reduce((a, b) => a + b, 0);
    setScore(prevScore => prevScore + currSum);
    setCurrThrows([]);
    setMenuOpen(false);
  };
  const resetGame = () => {
    setScore(START_SCORE); setRound(1); setHistory([]); setCurrThrows([]); setLastRoundThrows([]); setMenuOpen(false);
  };
  const goHome = () => { router.push('/'); setMenuOpen(false); };
  const toggleFatBull = () => setFatBullEnabled(enabled => !enabled);

  // ready-to-show
  const displayedCurrThrows = lastRoundThrows.length > 0 && currThrows.length === 0 ? lastRoundThrows : currThrows;
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);

  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return '#f8f8f8';
    const minGray = 32, maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: '16/9', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角選單 */}
        <div className="absolute top-6 right-8 z-50">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="w-28 h-28 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 shadow-lg text-white text-4xl"
            style={{ borderRadius: 0 }}
            aria-label="選單切換">
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
          {/* 歷史回合分數 */}
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
          {/* 中間放大2倍的終端機動畫分數區（2/3寬） */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[480px]">
            <TerminalFlipScore num={score >= 0 ? score : 0} />
          </div>
          {/* 右側本回合分數區，數字改斜體無斜切、水平 */}
          <div className="flex flex-col justify-center items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div className="flex flex-row items-center justify-center mb-16 w-full gap-x-6">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="flex flex-col items-center w-40">
                    <div style={{width: '110px', height: '110px', borderRadius: 0}}
                      className={`
                        flex items-center justify-center border-2 text-6xl font-extrabold italic
                        ${displayedCurrThrows[i] !== undefined
                          ? 'border-yellow-400 text-yellow-300 bg-zinc-900'
                          : highlight
                          ? 'border-green-400 text-white bg-green-800 animate-pulse'
                          : 'border-zinc-600 text-zinc-500 bg-zinc-900'
                        }
                        transition-all select-none`}>
                      {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
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
            font-feature-settings: "tnum";
            border-radius: 0.25rem;
            box-shadow: 0 0 24px #27ff46a0, 0 2px 60px #021;
          }
        `}</style>
      </main>
    </div>
  );
}
