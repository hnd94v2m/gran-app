'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment, SegmentType } from "@/services/boardinfo";

const START_SCORE = 501;
const MAX_HISTORY_ROWS = 5;

function TerminalFlipDigit({ digit }: { digit: string }) {
  const [current, setCurrent] = useState("0");
  useEffect(() => {
    let count = 0, running = true;
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
    <span className="terminal-digit select-none bg-black text-green-400 font-mono font-extrabold px-7 py-9 rounded shadow-2xl text-[20rem] leading-none drop-shadow-xl flex items-end"
      style={{ height: "24rem", letterSpacing: "-0.08em" }}>
      {current}
    </span>
  );
}

function TerminalFlipScore({ num, showBust }: { num: number; showBust: boolean }) {
  if (showBust) {
    return (
      <div className="flex flex-row items-end justify-center">
        <span className="terminal-digit font-mono text-red-500 bg-black font-black text-[20rem] px-7 py-9 rounded shadow-2xl flex items-center"
          style={{ height: "24rem", letterSpacing: "-0.03em" }}>
          BUST
        </span>
      </div>
    );
  }
  const padded = num.toString().padStart(3, "0");
  return (
    <div className="flex flex-row justify-center items-end" style={{ gap: "0.04em" }}>
      {padded.split("").map((d, i) => (
        <TerminalFlipDigit digit={d} key={i} />
      ))}
    </div>
  );
}
function FatBullSwitch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange} className="w-10 h-10 flex items-center justify-center cursor-pointer" tabIndex={0}>
      <span className="inline-block w-8 h-8 rounded-full border-2 border-yellow-400 bg-transparent relative flex items-center justify-center">
        {enabled && <span style={{
          width: 18, height: 18, borderRadius: "999px", background: "#fde047", display: "inline-block"
        }} />}
      </span>
    </div>
  );
}
function SwitchBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div role="button" tabIndex={0}
      onClick={onChange}
      className="relative flex items-center w-14 h-7 bg-zinc-700 rounded-full cursor-pointer select-none transition"
      style={{ borderRadius: 9999, minWidth: 56, minHeight: 28 }}
      aria-label="MO/OO 切換"
    >
      <div className="absolute inset-0 rounded-full transition"
        style={{
          background: checked ?
            "rgba(93,156,236,0.23)" : "rgba(32,34,42,0.25)",
        }}
      />
      <div
        className="absolute top-1 left-1 transition-transform duration-200"
        style={{
          transform: checked ? "translateX(0)" : "translateX(1.65rem)"
        }}
      >
        <div className="w-6 h-5 bg-white rounded-md flex items-center shadow ring-2 ring-zinc-400 justify-center">
          <div className="flex flex-row h-3/4 gap-1">
            <div className="w-[2px] h-4 bg-zinc-700 rounded"/>
            <div className="w-[2px] h-4 bg-zinc-700 rounded"/>
          </div>
        </div>
      </div>
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
  const [lastValidScore, setLastValidScore] = useState(START_SCORE);

  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const [bust, setBust] = useState(false);
  const [bustRoundNum, setBustRoundNum] = useState<number | null>(null);

  const historyBox = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(true);
  const [moMode, setMoMode] = useState(true);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");

  // 1. function宣告，一定在Page01最前面，不可用const
  function endRoundWithThrows(throwsToAdd: number[]) {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(pv => [...pv, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
  }

  useEffect(() => {
    if (historyBox.current)
      historyBox.current.scrollTop = historyBox.current.scrollHeight;
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
    try { const gb = await Granboard.ConnectToBoard(); setGranboard(gb); }
    catch {}
  };

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      setCurrThrows(prev => {
        const throwCount = prev.length;
        const left = score - prev.reduce((a, b) => a + b, 0);
        const hitVal = getAdjustedScore(segment.Value);

        if (throwCount === 0) setLastValidScore(score);

        const bustNow =
          hitVal > left ||
          (left - hitVal === 0 && !canFinish(segment, fatBullEnabled, moMode));

        if (bustNow) {
          setBust(true);
          setTimeout(() => { setBust(false); }, 2000);
          setScore(lastValidScore); // rollback
          setCurrThrows([]);
          setLastRoundThrows([]);
          setBustRoundNum(round);
          setRound(r => r + 1);
          return [];
        }
        if (throwCount >= 3) {
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
        if (bustRoundNum && prev.length === 0) setBustRoundNum(null);
        return newThrows;
      });
    };
    // eslint-disable-next-line
  }, [granboard, currThrows, lastRoundThrows, fatBullEnabled, moMode, history, score, lastValidScore, round, bustRoundNum]);

  const visibleHistory = history.slice(-MAX_HISTORY_ROWS);

  let displayedCurrThrows = lastRoundThrows.length > 0 && currThrows.length === 0 ? lastRoundThrows : currThrows;
  if (bustRoundNum && round === bustRoundNum + 1 && currThrows.length === 0) {
    displayedCurrThrows = [];
  }

  const currentTotal = score - displayedCurrThrows.reduce((a, b) => a + b, 0);

  function bgColorByIndex(idx: number, len: number): string {
    const min = 32, max = 228;
    const ratio = len <= 1 ? 0 : idx / (len - 1);
    const gray = Math.round(min + (max - min) * ratio);
    return idx % 2 === 0
      ? `rgb(${gray},${gray},${gray})`
      : `rgb(${Math.max(gray - 10, min)},${Math.max(gray - 10, min)},${Math.max(gray - 10, min)})`;
  }

  const col1Width = "64px";
  const col2Width = "110px";
  const btnClass = "w-16 h-16 flex items-center justify-center shadow-lg p-0";

  const retryCurrentRound = () => {
    const currSum = currThrows.reduce((a, b) => a + b, 0);
    setScore(prev => prev + currSum);
    setCurrThrows([]);
    setMenuOpen(false);
  };
  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setHistory([]);
    setCurrThrows([]);
    setLastRoundThrows([]);
    setMenuOpen(false);
    setBust(false);
    setLastValidScore(START_SCORE);
    setBustRoundNum(null);
  };
  const goHome = () => {
    router.push("/");
    setMenuOpen(false);
  };
  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows);
    setRound(r => r + 1);
  };

  return (
    <div
      className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{
        aspectRatio: "16/9",
        minHeight: "100vh",
        minWidth: "100vw",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">
        {/* 右上角選單 */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`${btnClass} bg-zinc-800 hover:bg-zinc-700 text-white`}
            style={{ borderRadius: 0 }}
            aria-label="選單切換"
          >
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="w-10 h-10">
              <rect y="3" width="20" height="2.6" rx="1" fill="currentColor" />
              <rect y="8.5" width="20" height="2.6" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2.6" rx="1" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded shadow-lg flex flex-col select-none z-[999]">
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={() => { handleConnect(); setMenuOpen(false); }}>重新連接</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={resetGame}>重新開始</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={retryCurrentRound}>重投</button>
              <div className="flex justify-between items-center px-8 py-6 text-2xl hover:bg-zinc-700 select-none">
                <span>Fat Bull</span>
                <FatBullSwitch enabled={fatBullEnabled} onChange={() => setFatBullEnabled(!fatBullEnabled)} />
              </div>
              <div className="flex justify-between items-center px-8 py-6 text-2xl hover:bg-zinc-700 select-none">
                <span>MO/OO</span>
                <SwitchBox checked={moMode} onChange={() => setMoMode(!moMode)} />
              </div>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700 border-t border-zinc-700"
                onClick={goHome}>返回首頁</button>
            </div>
          )}
        </div>
        {/* 右下角回合按鈕 */}
        <div className="absolute bottom-[7.5rem] right-4 z-50">
          <button className={`${btnClass} bg-green-700 hover:bg-green-600 text-white`} style={{ borderRadius: 0 }} onClick={endRound} disabled={currThrows.length === 0} title="ROUND CHANGE">
            <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none">
              <polyline points="12,10 12,28 28,28" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
              <polygon points="28,28 21,23 21,33" fill="#fff" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex flex-row w-full h-full items-stretch">
          {/* 左側回合分數 */}
          <div className="flex flex-col flex-[1_1_0%] min-w-[140px] max-w-[240px] px-2 select-none">
            <div className="flex flex-col w-full h-full justify-start items-center pt-24">
              <div ref={historyBox} className="w-full max-w-full h-[450px] overflow-y-scroll rounded-none shadow-inner custom-scrollbar" style={{ margin: 0 }}>
                <div className="overflow-hidden border border-black rounded-none" style={{ margin: 0 }}>
                  {visibleHistory.map((scoreVal, idx) => {
                    const color = bgColorByIndex(idx, visibleHistory.length);
                    return (
                      <div className="flex" key={`row_${idx}`}>
                        <div style={{
                          width: col1Width,
                          background: color,
                          borderLeft: "none",
                          borderTopLeftRadius: 0,
                          borderBottomLeftRadius: 0,
                          borderRight: "1px solid #222"
                        }}
                          className="text-[2.3rem] font-bold text-gray-900 py-4 border-b border-black flex items-center justify-center"
                        >R{history.length - visibleHistory.length + idx + 1}</div>
                        <div
                          style={{
                            width: col2Width,
                            background: color,
                            borderTopRightRadius: 0,
                            borderBottomRightRadius: 0,
                          }}
                          className="text-[3.2rem] font-extrabold py-4 border-b border-black flex items-center justify-center"
                        >{scoreVal}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* 中間大分數 */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[520px]">
            <TerminalFlipScore num={score >= 0 ? score : 0} showBust={bust} />
          </div>
          {/* 右側分數格與UI區 */}
          <div className="flex flex-col justify-end items-center flex-[1_1_0%] min-w-[180px] max-w-[320px] px-3 pb-16 pt-8">
            <div className="flex flex-col items-center w-full gap-y-3 mb-7 mt-14">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined && displayedCurrThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="flex flex-col items-center w-40">
                    <div style={{ width: "120px", height: "108px", borderRadius: 0 }}
                      className={
                        `flex items-center justify-center border-2 text-6xl font-extrabold italic ${
                          displayedCurrThrows[i] !== undefined
                            ? "border-yellow-400 text-yellow-300 bg-zinc-900"
                            : highlight
                              ? "border-green-400 text-white bg-green-800 animate-pulse"
                              : "border-zinc-600 text-zinc-500 bg-zinc-900"
                        } transition-all select-none`
                      }>
                      {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : "--"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* 下方玩家條＋分隔色塊 */}
        <div className="flex flex-col w-full">
          <div className="w-full h-3 bg-gradient-to-t from-yellow-600/80 to-black/0" />
          <div className="flex items-center justify-center gap-10 w-full py-8 bg-gradient-to-t from-black via-zinc-950/80">
            <span className="inline-block w-28 h-28 rounded-full bg-zinc-700 text-[5rem] flex items-center justify-center select-none">
              {avatar}
            </span>
            <span className="text-4xl font-bold select-none">{playerName}</span>
            <span className="ml-10 px-8 py-4 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-5xl font-black select-none">
              {currentTotal >= 0 ? currentTotal : 0}
            </span>
          </div>
        </div>
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar { width: 18px; }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255,215,0,0.45);
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
