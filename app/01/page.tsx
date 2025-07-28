'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment, SegmentType } from "@/services/boardinfo";
const START_SCORE = 501;

// 終端機動畫大數字
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
        setCurrent(Math.floor(Math.random() * 10).toString());
      }
    }, 50);
    return () => clearInterval(interval);
  }, [digit]);
  return (
    <span className="terminal-digit select-none bg-black text-green-400 font-mono font-extrabold px-8 py-10 rounded shadow-2xl text-[20rem] leading-none drop-shadow-xl flex items-end"
      style={{ height: '24rem', letterSpacing: '-0.08em' }}>
      {current}
    </span>
  );
}

function TerminalFlipScore({ num, showBust }: { num: number, showBust: boolean }) {
  if (showBust) {
    // Bust 字和大分數寬高完全一致
    return (
      <div className="flex flex-row items-end justify-center">
        <span className="terminal-digit font-mono text-red-500 bg-black font-black text-[20rem] px-8 py-10 rounded shadow-2xl flex items-center"
          style={{ height: '24rem', letterSpacing: '-0.03em' }}>
          BUST
        </span>
      </div>
    );
  }
  const padded = num.toString().padStart(3, '0');
  return (
    <div className="flex flex-row justify-center items-end"
      style={{ gap: '0.10em' }}>
      {padded.split('').map((d, i) => (
        <TerminalFlipDigit digit={d} key={i} />
      ))}
    </div>
  );
}

// MO/OO 切換圖示（如附圖，左右切換，方形滑塊、三條防滑槓）
function SwitchBox({ checked, onChange }: { checked: boolean, onChange: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onChange}
      className="relative flex items-center w-20 h-11 bg-zinc-700 rounded-lg cursor-pointer select-none transition"
      style={{ borderRadius: 8 }}
    >
      {/* 滑桿軌道 */}
      {/* 滑塊 */}
      <div
        className={`absolute top-1 left-1 transition-transform duration-200`}
        style={{
          transform: checked ? "translateX(3.8rem)" : "translateX(0)",
        }}
      >
        <div className="switch-square w-9 h-9 bg-white rounded-md flex flex-col items-center justify-center shadow ring-2 ring-zinc-400">
          {/* 三條槓 */}
          <div className="w-6 h-1 bg-zinc-700 rounded mb-1" />
          <div className="w-6 h-1 bg-zinc-700 rounded mb-1" />
          <div className="w-6 h-1 bg-zinc-700 rounded" />
        </div>
      </div>
      {/* 背景會隨 checked 顏色淡淡浮動 */}
      <div className={`absolute inset-0 rounded-lg transition ${checked ? "bg-blue-200/40" : "bg-zinc-200/20"}`}></div>
      {/* 滑塊標記 */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 font-black font-mono text-base text-gray-900">MO</div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 font-black font-mono text-base text-blue-800">OO</div>
    </div>
  );
}

// Fat Bull 選項：空心/實心圓
function FatBullSwitch({ enabled, onChange }: { enabled: boolean, onChange: () => void }) {
  return (
    <div onClick={onChange} className="w-10 h-10 flex items-center justify-center cursor-pointer" tabIndex={0}>
      {enabled
        ? (
          <span className="inline-block w-8 h-8 rounded-full border-2 border-yellow-400 bg-yellow-400" />
        )
        : (
          <span className="inline-block w-8 h-8 rounded-full border-2 border-yellow-400 bg-transparent" />
        )
      }
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
  const HistoryBox = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(true);
  const [moMode, setMoMode] = useState(true);
  const [showBust, setShowBust] = useState(false);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");

  useEffect(() => {
    if (HistoryBox.current) HistoryBox.current.scrollTop = HistoryBox.current.scrollHeight;
  }, [history]);
  useEffect(() => { handleConnect(); }, []);

  function getAdjustedScore(val: number) {
    if (fatBullEnabled && (val === 25 || val === 50)) return 50;
    return val;
  }

  function canFinish(segment: Segment, fatBull: boolean, mo: boolean) {
    if (!mo) return true;
    if (segment.Type === SegmentType.Double || segment.Type === SegmentType.Triple) return true;
    if (fatBull && (segment.Value === 25 || segment.Value === 50)) return true;
    if (!fatBull && segment.Value === 50) return true;
    return false;
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
        // 「剩餘分數」用目前 score 扣去尚未history加總即可
        const left = score - prev.reduce((a, b) => a + b, 0);
        const hitVal = getAdjustedScore(segment.Value);

        // 正確爆鏢只在 投擲==left+1 以上才觸發
        if (hitVal > left) {
          setShowBust(true);
          setTimeout(() => {
            setShowBust(false);
            setCurrThrows([]);
            setLastRoundThrows([]);
            setRound(r => r + 1);
          }, 1000);
          return [];
        }
        // 若結標，MO 必須倍區/紅心
        if (left - hitVal === 0) {
          const finishOk = canFinish(segment, fatBullEnabled, moMode);
          if (!finishOk) {
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

        // 已三鏢，下一標直接為新回合
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
        // 正常流程
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
  const displayedCurrThrows = lastRoundThrows.length > 0 && currThrows.length === 0 ? lastRoundThrows : currThrows;
  const currentTotal = score - displayedCurrThrows.reduce((a, b) => a + b, 0);
  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return '#f8f8f8';
    const minGray = 32, maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  // 按鈕尺寸 now: 3rem=48px，格子=120px，不會比格子大
  const btnClass =
    "w-16 h-16 flex items-center justify-center shadow-lg p-0";

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: '16/9', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角加大選單 */}
        <div className="absolute top-6 right-11 z-50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={btnClass + " bg-zinc-800 hover:bg-zinc-700 text-white"}
            style={{ borderRadius: 0 }}
            aria-label="選單切換"
          >
            <svg width="30" height="30" viewBox="0 0 20 20" fill="none" className="w-12 h-12">
              <rect y="3" width="20" height="2.6" rx="1" fill="currentColor" />
              <rect y="8.5" width="20" height="2.6" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2.6" rx="1" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded shadow-lg flex flex-col select-none z-[999]">
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { handleConnect(); setMenuOpen(false); }}>重新連接</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { resetGame(); }}>重新開始</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={retryCurrentRound}>重投</button>
              <div className="flex justify-between items-center px-8 py-5 text-2xl hover:bg-zinc-700 focus:bg-zinc-700 select-none">
                <span>Fat Bull</span>
                <FatBullSwitch enabled={fatBullEnabled} onChange={setFatBullEnabled.bind(null, !fatBullEnabled)} />
              </div>
              <div className="flex justify-between items-center px-8 py-5 text-2xl hover:bg-zinc-700 focus:bg-zinc-700 select-none">
                <span>MO/OO</span>
                <SwitchBox checked={moMode} onChange={setMoMode.bind(null, !moMode)} />
                <span className={`ml-3 font-mono text-base ${moMode ? "text-blue-900" : "text-blue-400"}`}>{moMode ? 'MO' : 'OO'}</span>
              </div>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700 border-t border-zinc-700" onClick={goHome}>返回首頁</button>
            </div>
          )}
        </div>

        {/* 右下回合切換按鈕 */}
        <div className="absolute bottom-[7.5rem] right-11 z-50">
          <button
            className={btnClass + " bg-green-700 hover:bg-green-600 text-white"}
            style={{ borderRadius: 0 }}
            onClick={endRound}
            disabled={currThrows.length === 0}
            title="ROUND CHANGE"
          >
            {/* 換行箭頭icon */}
            <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
              <polyline points="12,10 12,28 28,28" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
              <polygon points="28,28 21,23 21,33" fill="#fff" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-row items-stretch w-full h-full">
          {/* 左側回合分數（填滿高度可滑動） */}
          <div className="flex flex-col justify-start items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div ref={HistoryBox}
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
          {/* 中間最大分數區，數字特大且極窄間距 */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[520px]">
            <TerminalFlipScore num={score >= 0 ? score : 0} showBust={showBust} />
          </div>
          {/* 右側本回合分數，垂直對齊、下移避免和右上·右下按鈕重疊 */}
          <div className="flex flex-col justify-end items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3 pb-12">
            <div className="flex flex-col items-center w-full gap-y-4 mb-8 mt-14">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined && displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="flex flex-col items-center w-40">
                    <div style={{width: '120px', height: '108px', borderRadius: 0 }}
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
