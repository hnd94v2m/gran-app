'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

function TerminalFlipDigit({ digit }: { digit: string }) {
  const [current, setCurrent] = useState('0');
  useEffect(() => {
    let count = 0;
    let running = true;
    const interval = setInterval(() => {
      if (!running) return;
      count++;
      if (count > 9) {
        running = false;
        setCurrent(digit);
        clearInterval(interval);
      } else {
        setCurrent((Math.floor(Math.random() * 10)).toString());
      }
    }, 48);
    return () => clearInterval(interval);
  }, [digit]);
  return (
    <span className="terminal-digit select-none bg-black text-green-400 font-mono font-extrabold px-8 py-9 rounded shadow-2xl text-[19rem] leading-none drop-shadow-xl flex items-end"
      style={{ height: '23rem' }}>
      {current}
    </span>
  );
}
function TerminalFlipScore({ num, showBust }: { num: number, showBust: boolean }) {
  // showBust 為 true 時，顯示 BUST
  if (showBust) {
    return (
      <div className="flex flex-row items-end justify-center">
        <span className="terminal-digit font-mono text-red-500 bg-black font-black text-[12rem] px-10 py-16 rounded shadow-2xl flex items-center"
          style={{ height: '23rem', letterSpacing: '-0.03em' }}>
          BUST
        </span>
      </div>
    );
  }
  const padded = num.toString().padStart(3, '0');
  return (
    <div className="flex flex-row justify-center items-end" style={{ gap: '0.6rem' }}>
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
  const [fatBullEnabled, setFatBullEnabled] = useState(true);           // Fat Bull 預設開啟
  const [moMode, setMoMode] = useState(true);                           // MO/OO。左=MO=需要倍區或紅心
  const [showBust, setShowBust] = useState(false);

  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");
  const historyBox = useRef<HTMLDivElement>(null);

  // 歷史區自動滾動到底
  useEffect(() => {
    if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight;
  }, [history]);
  useEffect(() => { handleConnect(); }, []);

  function getAdjustedScore(val: number, seg?: Segment) {
    // Fat Bull 模式
    if (fatBullEnabled && (val === 25 || val === 50)) return 50;
    return val;
  }

  // 判斷某鏢是否為"允許結標"
  function canFinish(scoreLeft: number, hitVal: number, seg: Segment) {
    // 如果不是最後一鏢或分數未達標，只要 false
    if (!moMode) return true;
    // MO: 必須「雙倍、三倍區或紅心」
    // 假設 seg.Multiplier==2|3(倍區)、seg.Value==50(紅心)
    return seg.Multiplier === 2 || seg.Multiplier === 3 || seg.Value === 50;
  }

  const handleConnect = async () => {
    try {
      const gb = await Granboard.ConnectToBoard();
      setGranboard(gb);
    } catch {}
  };

  // 核心：大於剩餘時 BUST
  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      setCurrThrows(prev => {
        const left = START_SCORE - history.reduce((a, b) => a + b, 0) - prev.reduce((a, b) => a + b, 0);
        const hitVal = getAdjustedScore(segment.Value, segment);
        // 是否爆掉
        if (hitVal > left) {
          // BUST 動畫，1秒
          setShowBust(true);
          setTimeout(() => {
            setShowBust(false);
            setCurrThrows([]);
            setLastRoundThrows([]);
            setRound(r => r + 1);
            // 本回合 BUST 不累加分數，score 回復到本回合前
            // 這裡不需 setHistory
          }, 1000);
          return [];
        }

        // 判斷本鏢是否為結標時的 MO/OO 檢查
        if (left - hitVal === 0) {
          const finishOk = canFinish(left, hitVal, segment);
          if (!finishOk) {
            // 不允許，做BUST
            setShowBust(true);
            setTimeout(() => {
              setShowBust(false);
              setCurrThrows([]);
              setLastRoundThrows([]);
              setRound(r => r + 1);
            }, 1000);
            return [];
          }
        }

        // 三鏢後啟動下回合，刷格
        if (prev.length >= 3) {
          endRoundWithThrows(prev);
          setTimeout(() => {
            setCurrThrows([hitVal]);
            setScore(s => s - hitVal);
            setRound(r => r + 1);
            setLastRoundThrows([]);
          }, 0);
          return prev;
        }
        const newThrows = [...prev, hitVal];
        setScore(s => s - hitVal);
        if (newThrows.length === 3) endRoundWithThrows(newThrows);
        return newThrows;
      });
    };
  }, [granboard, currThrows, lastRoundThrows, fatBullEnabled, moMode, history, score]);

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
    setScore(START_SCORE); setRound(1); setHistory([]); setCurrThrows([]); setLastRoundThrows([]); setMenuOpen(false); setShowBust(false);
  };
  const goHome = () => { router.push('/'); setMenuOpen(false); };
  const toggleFatBull = () => setFatBullEnabled(enabled => !enabled);
  const toggleMoMode = () => setMoMode(x => !x);

  const displayedCurrThrows = lastRoundThrows.length > 0 && currThrows.length === 0 ? lastRoundThrows : currThrows;
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);

  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return '#f8f8f8';
    const minGray = 32, maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  // 按鈕尺寸 (縮小到 3.5rem)
  const btnClass =
    "w-14 h-14 flex items-center justify-center shadow-lg p-0";
  // 圓形按鈕icon的svg不要超過 btnClass 設定的尺寸！

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: '16/9', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角選單（縮小尺寸） */}
        <div className="absolute top-6 right-8 z-50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={btnClass + " bg-zinc-800 hover:bg-zinc-700 text-white"}
            style={{ borderRadius: 0 }}
            aria-label="選單切換"
          >
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="w-9 h-9">
              <rect y="3" width="20" height="2.4" rx="1" fill="currentColor" />
              <rect y="8.5" width="20" height="2.4" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2.4" rx="1" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-zinc-900 border border-zinc-700 rounded shadow-lg flex flex-col select-none z-[999]">
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { handleConnect(); setMenuOpen(false); }}>重新連接</button>
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { resetGame(); }}>重新開始</button>
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { retryCurrentRound(); }}>重投</button>
              <div className="flex justify-between items-center px-8 py-5 text-2xl hover:bg-zinc-700 focus:bg-zinc-700 select-none">
                <span>Fat Bull</span>
                <span onClick={toggleFatBull}
                  className={`relative w-14 h-7 rounded-full border-2 border-yellow-400 flex items-center cursor-pointer ml-4 bg-black transition`}>
                  <span className={`absolute left-1 top-1 bg-yellow-400 rounded-full w-5 h-5 transition-all duration-200 ease-in-out ${fatBullEnabled ? "translate-x-7" : ""}`}></span>
                  <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-7 h-5`}></span>
                </span>
                <span className="ml-2 text-sm text-yellow-400">{fatBullEnabled ? 'ON' : 'OFF'}</span>
              </div>
              <div className="flex justify-between items-center px-8 py-5 text-2xl hover:bg-zinc-700 focus:bg-zinc-700 select-none">
                <span>MO/OO</span>
                <span onClick={toggleMoMode}
                  className={`relative w-14 h-7 rounded-full border-2 border-blue-400 flex items-center cursor-pointer ml-4 bg-black transition`}>
                  <span className={`absolute ${moMode ? 'left-1' : 'right-1'} top-1 bg-blue-400 rounded-full w-5 h-5 transition-all duration-200 ease-in-out`} />
                </span>
                <span className="ml-3 font-mono text-base text-blue-400">{moMode ? 'MO' : 'OO'}</span>
              </div>
              <button className="px-8 py-5 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700 border-t border-zinc-700" onClick={() => { goHome(); }}>返回首頁</button>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-row items-stretch w-full h-full">
          {/* 歷史回合分數：左側欄高度填滿，超出可滾動 */}
          <div className="flex flex-col justify-start items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div ref={historyBox}
                className="rounded-2xl shadow-inner flex flex-col w-full h-full max-h-full overflow-y-scroll custom-scrollbar py-8 transition-all">
              <div className="w-full">
                <div className="grid grid-cols-2 gap-x-2 text-center">
                  {history.map((sum, idx) => (
                    <React.Fragment key={idx}>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-4xl font-bold text-gray-900 py-5 border border-black select-none">R{idx + 1}</div>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-6xl font-extrabold py-5 border border-black select-none">{sum}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* 中間極大分數區且間距較窄 */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[480px]">
            <TerminalFlipScore num={score >= 0 ? score : 0} showBust={showBust} />
          </div>
          {/* 右側本回合分數，格子直向排列且字體斜體，下移避免和選單重疊 */}
          <div className="flex flex-col justify-end items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3 pb-10">
            <div className="flex flex-col items-center w-full gap-y-7 mb-7 mt-12">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="flex flex-col items-center w-40">
                    <div style={{width: '120px', height: '110px', borderRadius: 0 }}
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
            {/* ROUND CHANGE 按鈕（縮小） */}
            <button
              className={btnClass + " bg-green-700 hover:bg-green-600 text-white"}
              style={{ borderRadius: 0 }}
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="ROUND CHANGE"
            >
              {/* 換行箭頭（向下再向右彎，代表「進到下一行/回合」） */}
              <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
                {/* 下+右彎大箭頭 */}
                <polyline points="12,10 12,28 28,28" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
                <polygon points="28,28 21,23 21,33" fill="#fff" />
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
