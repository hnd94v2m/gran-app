'use client';
import React from 'react';
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

function FlipClockNumber({ value }: { value: string }) {
  return (
    <div className="relative flex items-center justify-center w-32 h-48 bg-zinc-900 rounded-xl mx-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] border-[3px] border-zinc-700 overflow-hidden">
      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-zinc-700/80 z-10" />
      <span className="font-mono text-[8rem] font-extrabold select-none tracking-wider text-gradient-metal z-20" style={{ letterSpacing: '0.08em' }}>{value}</span>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-8 bg-zinc-800 rounded-lg shadow-xl" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-8 bg-zinc-800 rounded-lg shadow-xl" />
    </div>
  );
}

function FlipClockScore({ num }: { num: number }) {
  const padded = num.toString().padStart(3, '0');
  return (
    <div className="flex items-center justify-center">
      {padded.split('').map((d, i) => (
        <FlipClockNumber value={d} key={i} />
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
  const [message, setMessage] = useState("請連接飛鏢靶");
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const historyBox = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(false);

  useEffect(() => { if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight; }, [history]);
  useEffect(() => { handleConnect(); }, []);

  function getAdjustedScore(segmentValue: number): number {
    // 紅心(25)或黑心(50)都以50計分, 可根據實際API調整
    if (!fatBullEnabled) return segmentValue;
    if (segmentValue === 25 || segmentValue === 50) return 50;
    return segmentValue;
  }

  const handleConnect = async () => {
    setMessage("連線中...");
    try {
      const gb = await Granboard.ConnectToBoard();
      setGranboard(gb);
      setMessage("連線成功，開始比賽！");
    } catch {
      setMessage("連線失敗，請重試！");
    }
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

  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows);
  };

  const retryCurrentRound = () => {
    const currSum = currThrows.reduce((a, b) => a + b, 0);
    setScore(prevScore => prevScore + currSum);
    setCurrThrows([]);
    setMenuOpen(false);
  };

  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setHistory([]);
    setCurrThrows([]);
    setLastRoundThrows([]);
    setMessage("已重設，請連接飛鏢靶");
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

  // 正方形按鈕的尺寸（Tailwind/自定）兩者共用
  const squareBtnClass =
    "w-20 h-20 flex items-center justify-center rounded-xl bg-green-700 hover:bg-green-600 transition shadow-lg text-white text-4xl p-0";

  const menuBtnClass =
    "w-20 h-20 flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 transition shadow-lg text-white text-4xl p-0";

  return (
    <div
      className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{
        aspectRatio: '16/9',
        minHeight: '100vh',
        minWidth: '100vw',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角選單按鈕 */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={menuBtnClass}
            aria-label="選單切換"
          >
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="w-10 h-10 inline-block"><rect y="3" width="20" height="2.6" rx="1" fill="currentColor"/><rect y="8.5" width="20" height="2.6" rx="1" fill="currentColor"/><rect y="14" width="20" height="2.6" rx="1" fill="currentColor"/></svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded shadow-lg flex flex-col select-none">
              <button className="px-4 py-3 text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { handleConnect(); setMenuOpen(false); }}>重新連接</button>
              <button className="px-4 py-3 text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { resetGame(); }}>重新開始</button>
              <button className="px-4 py-3 text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { retryCurrentRound(); }}>重投</button>
              <button className="flex justify-between items-center px-4 py-3 hover:bg-zinc-700 focus:bg-zinc-700 cursor-pointer" onClick={toggleFatBull}>
                <span>Fat Bull</span>
                <span className={`ml-2 w-6 h-6 rounded-full border-2 border-yellow-400 flex items-center justify-center`}>
                  {fatBullEnabled
                    ? <span className="w-4 h-4 bg-yellow-400 rounded-full block" />
                    : ''}
                </span>
              </button>
              <button className="px-4 py-3 text-left hover:bg-zinc-700 focus:bg-zinc-700 border-t border-zinc-700" onClick={() => { goHome(); }}>返回首頁</button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-row items-stretch w-full h-full">

          {/* 歷史回合分數區塊 */}
          <div className="flex flex-col justify-center items-center w-[330px] min-w-[300px] px-4">
            <div ref={historyBox} className="rounded-2xl shadow-inner flex flex-col h-[22rem] max-h-[78vh] w-full overflow-y-scroll custom-scrollbar py-4">
              <div className="w-full">
                <div className="grid grid-cols-2 gap-x-2 text-center">
                  {history.map((sum, idx) => (
                    <React.Fragment key={idx}>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }} className="text-2xl font-bold text-gray-900 py-2 border border-black select-none">R{idx + 1}</div>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }} className="text-4xl font-extrabold py-2 border border-black select-none">{sum}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 中間大分數 */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 min-h-[380px]">
            <FlipClockScore num={score >= 0 ? score : 0} />
          </div>

          {/* 本回合分數區與圓形按鈕 */}
          <div className="flex flex-col justify-center items-center w-[330px] min-w-[300px] px-4">
            <div className="flex flex-col items-center justify-center mb-10 w-full scale-110">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="my-2 flex flex-col items-center w-full">
                    <div className={`w-28 h-24 flex items-center justify-center rounded-2xl border-2 text-4xl font-extrabold
                        ${displayedCurrThrows[i] !== undefined
                          ? 'border-yellow-400 text-yellow-300 bg-zinc-900'
                          : highlight
                          ? 'border-green-400 text-white bg-green-800 animate-pulse'
                          : 'border-zinc-600 text-zinc-500 bg-zinc-900'
                        }
                        transition-all`}>
                      {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* 圓形正方形 Round Change 按鈕，只一個icon，示意"回合切換" */}
            <button
              className={squareBtnClass}
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="ROUND CHANGE"
            >
              {/* 建議用象徵 round/交換的圖示 SVG，這裡用 Material-icons風格的換圓箭頭 */}
              <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
                <circle cx="24" cy="24" r="22" stroke="#fff" strokeWidth="3" fill="none" />
                <path d="M34 24a10 10 0 1 0-10 10" stroke="#fff" strokeWidth="3" fill="none" />
                <polygon points="33,28 41,28 41,36" fill="#fff" />
              </svg>
            </button>
          </div>
        </div>

        {/* 下方玩家條 */}
        <div className="flex items-center justify-center gap-6 w-full py-7 bg-gradient-to-t from-black via-zinc-950/80">
          <span className="inline-block w-20 h-20 rounded-full bg-zinc-700 text-6xl flex items-center justify-center select-none">{avatar}</span>
          <span className="text-3xl font-bold select-none">{playerName}</span>
          <span className="ml-6 px-7 py-3 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-4xl font-black select-none">
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
            width: 12px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 215, 0, 0.45);
            border-radius: 4px;
            border: 4px solid transparent;
            background-clip: content-box;
          }
        `}</style>
      </main>
    </div>
  );
}
