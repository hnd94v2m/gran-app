'use client';
import React from 'react';  // 這行必須加！解決 React 未定義錯誤
import { useEffect, useState, useRef } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

function FlipClockNumber({ value }: { value: string }) {
  return (
    <div className="relative flex items-center justify-center w-32 h-48 bg-zinc-900 rounded-xl mx-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] border-[3px] border-zinc-700 overflow-hidden">
      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-zinc-700/80 z-10" />
      <span
        className="font-mono text-[8rem] font-extrabold select-none tracking-wider text-gradient-metal z-20"
        style={{ letterSpacing: '0.08em' }}
      >
        {value}
      </span>
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

  // 自動滾動到底
  useEffect(() => {
    if (historyBox.current) {
      historyBox.current.scrollTop = historyBox.current.scrollHeight;
    }
  }, [history]);

  // 連接 Granboard
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
      if (currThrows.length === 0 && lastRoundThrows.length > 0) {
        setLastRoundThrows([]);
      }
      if (currThrows.length >= 3) return;
      setCurrThrows(prev => {
        const newThrows = [...prev, segment.Value];
        setScore(prevScore => prevScore - segment.Value);
        if (prev.length === 0 && lastRoundThrows.length > 0) setLastRoundThrows([]);
        if (newThrows.length === 3) endRoundWithThrows(newThrows);
        return newThrows;
      });
    };
    // eslint-disable-next-line
  }, [granboard, currThrows, lastRoundThrows]);

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

  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setHistory([]);
    setCurrThrows([]);
    setLastRoundThrows([]);
    setMessage("已重設，請連接飛鏢靶");
  };

  const displayedCurrThrows = lastRoundThrows.length > 0 ? lastRoundThrows : currThrows;
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);

  // 計算歷史回合每格背景色，從舊到新由暗至淺灰
  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return '#f8f8f8';
    const minGray = 32;
    const maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  return (
    <div
      className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{
        aspectRatio: '16/9',
        minHeight: '100vh',
        minWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1">
        <div className="flex-1 flex flex-row items-stretch w-full h-full">

          {/* 歷史回合分數區塊，無外框，兩欄表格無標題 */}
          <div className="flex flex-col justify-center items-center w-[330px] min-w-[300px] px-4">
            <div
              ref={historyBox}
              className="rounded-2xl shadow-inner flex flex-col h-[22rem] max-h-[78vh] w-full overflow-y-scroll custom-scrollbar py-4"
            >
              <div className="w-full">
                <div className="grid grid-cols-2 gap-x-2 text-center">
                  {history.map((sum, idx) => (
                    <React.Fragment key={idx}>
                      <div
                        style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-2xl font-bold text-gray-900 py-2 border border-black select-none"
                      >
                        R{idx + 1}
                      </div>
                      <div
                        style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-4xl font-extrabold py-2 border border-black select-none"
                      >
                        {sum}
                      </div>
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

          {/* 本回合分數（上下排列）與按鈕 */}
          <div className="flex flex-col justify-center items-center w-[330px] min-w-[300px] px-4">
            <div className="flex flex-col items-center justify-center mb-8 w-full">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div
                    key={i}
                    className="my-2 flex flex-col items-center w-full"
                  >
                    <div
                      className={`
                        w-28 h-24 flex items-center justify-center rounded-2xl border-2 
                        text-4xl font-extrabold
                        ${
                          displayedCurrThrows[i] !== undefined
                            ? 'border-yellow-400 text-yellow-300 bg-zinc-900'
                            : highlight
                              ? 'border-green-400 text-white bg-green-800 animate-pulse'
                              : 'border-zinc-600 text-zinc-500 bg-zinc-900'
                        }
                        transition-all
                      `}
                    >
                      {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="block mt-1 w-full px-3 py-3 rounded-lg bg-green-600 hover:bg-green-400 text-xl font-semibold transition-colors disabled:opacity-50"
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="射完三鏢後自動進入下一回合，如需手動可點"
            >
              結束本回合
            </button>
            <button
              className="mt-4 w-full px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-xs"
              onClick={resetGame}
            >
              重設比賽
            </button>
            <button
              className="mt-4 w-full px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-500 text-xs"
              onClick={handleConnect}
            >
              連接飛鏢靶
            </button>
          </div>
        </div>

        {/* 下方玩家條 */}
        <div className="flex items-center justify-center gap-6 w-full py-5 bg-gradient-to-t from-black via-zinc-950/80">
          <span className="inline-block w-16 h-16 rounded-full bg-zinc-700 text-5xl flex items-center justify-center select-none">
            {avatar}
          </span>
          <span className="text-2xl font-bold select-none">{playerName}</span>
          <span className="ml-6 px-5 py-2 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-3xl font-black select-none">
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
            width: 11px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 215, 0, 0.45);
            border-radius: 4px;
            border: 3px solid transparent;
            background-clip: content-box;
          }
        `}</style>
      </main>
    </div>
  );
}
