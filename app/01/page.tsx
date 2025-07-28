'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment, SegmentType } from "@/services/boardinfo";

const START_SCORE = 501;

function TerminalFlipDigit({ digit }: { digit: string }) {
  const [current, setCurrent] = useState("0");
  useEffect(() => {
    let count = 0, running = true;
    const interval = setInterval(() => {
      if (!running) return;
      count++;
      if (count > 9) { running = false; setCurrent(digit); clearInterval(interval); }
      else { setCurrent(Math.floor(Math.random() * 10).toString()); }
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

// MO/OO短軌道兩條防滑
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
      {/* 短滑塊，永遠不超出邊界 */}
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
  // bust時暫存爆鏢前的剩餘分數
  const [lastValidScore, setLastValidScore] = useState(START_SCORE);

  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const [bust, setBust] = useState(false);

  const historyBox = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(true);
  const [moMode, setMoMode] = useState(true);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");

  // 用於「BUST回合」不刷新格子
  const [bustRoundNum, setBustRoundNum] = useState<number | null>(null);

  useEffect(() => { if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight; }, [history]);
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
        // 只有不是BUST狀態時，記錄剩餘分數
        const throwCount = prev.length;
        // 處理BUST情境的三鏢
        const bustNow = (() => {
          // 回合中真實剩餘分數（這一標前）
          const left = score - prev.reduce((a, b) => a + b, 0);
          const hitVal = getAdjustedScore(segment.Value);

          // 爆鏢：分三狀況，第N標爆則全回復
          if (hitVal > left) return true;
          if (left - hitVal === 0 && !canFinish(segment, fatBullEnabled, moMode)) return true;
          return false;
        })();

        if (!bustNow) {
          // 一般流程：如非BUST回合剛開始，記錄本回剩餘分數，用於bust退回
          if (prev.length === 0) setLastValidScore(score); // 新一回合的第一鏢
        }

        if (bustNow) {
          // BUST-出現2秒，所有本回合標都不算
          setBust(true);
          setTimeout(() => { setBust(false); }, 2000);
          setScore(lastValidScore); // 直接退回上回合剩餘分數
          setCurrThrows([]); // 不要立即刷新本回合右邊三格、而是等下個回合重投才刷新
          setLastRoundThrows([]);
          setBustRoundNum(round); // 記住這回合是Bust，下回合第一鏢才重新計
          setRound(r => r + 1);
          return [];
        }

        // 非BUST
        // 三標後進新回合
        if (prev.length >= 3) {
          endRoundWithThrows(prev);
          setTimeout(() => {
            setCurrThrows([getAdjustedScore(segment.Value)]);
            setScore(s => s - getAdjustedScore(segment.Value));
            setRound(r => r + 1);
            setLastRoundThrows([]);
          }, 0);
          return prev;
        }
        const hitValue = getAdjustedScore(segment.Value);
        const newThrows = [...prev, hitValue];
        setScore(s => s - hitValue);
        if (newThrows.length === 3) endRoundWithThrows(newThrows);
        // 若剛好補進（新回合第一標），則移除BUST標記
        if (bustRoundNum && prev.length === 0) setBustRoundNum(null);
        return newThrows;
      });
    };
    // eslint-disable-next-line
  }, [granboard, currThrows, lastRoundThrows, fatBullEnabled, moMode, history, score, lastValidScore, round, bustRoundNum]);

  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(pv => [...pv, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
  };
  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows); setRound(r => r + 1);
  };
  const retryCurrentRound = () => {
    const currSum = currThrows.reduce((a, b) => a + b, 0);
    setScore(prev => prev + currSum); setCurrThrows([]); setMenuOpen(false);
  };
  const resetGame = () => {
    setScore(START_SCORE); setRound(1); setHistory([]); setCurrThrows([]); setLastRoundThrows([]); setMenuOpen(false); setBust(false); setLastValidScore(START_SCORE); setBustRoundNum(null);
  };
  const goHome = () => { router.push("/"); setMenuOpen(false); };

  // 右側三格的刷新規則（BUST剛發生＆還沒進下回合第一鏢，不刷新，仍顯示舊資料/空白）
  let displayedCurrThrows = lastRoundThrows.length > 0 && currThrows.length === 0 ? lastRoundThrows : currThrows;
  if (bustRoundNum && round === bustRoundNum + 1 && currThrows.length === 0) {
    // BUST剛結束，等新一標才刷新，既不顯示舊也不自動顯示新
    displayedCurrThrows = [];
  }

  const currentTotal = score - displayedCurrThrows.reduce((a, b) => a + b, 0);

  function bgColorByIndex(index: number, length: number): string {
    if (length === 1) return "#f8f8f8";
    const minGray = 32, maxGray = 248;
    const ratio = index / (length - 1);
    const grayValue = Math.round(minGray + (maxGray - minGray) * ratio);
    return `rgb(${grayValue},${grayValue},${grayValue})`;
  }

  const btnClass = "w-16 h-16 flex items-center justify-center shadow-lg p-0";

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: "16/9", minHeight: "100vh", minWidth: "100vw", overflow: "hidden", position: "relative" }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* 右上角選單 */}
        <div className="absolute top-4 right-4 z-50">
          <button onClick={() => setMenuOpen(!menuOpen)} className={`${btnClass} bg-zinc-800 hover:bg-zinc-700 text-white`}
            style={{ borderRadius: 0 }}
            aria-label="選單切換">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none" className="w-10 h-10">
              <rect y="3" width="20" height="2.6" rx="1" fill="currentColor" />
              <rect y="8.5" width="20" height="2.6" rx="1" fill="currentColor" />
              <rect y="14" width="20" height="2.6" rx="1" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded shadow-lg flex flex-col select-none z-[999]">
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700"
                onClick={() => { handleConnect(); setMenuOpen(false); }}>重新連接</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700"
                onClick={resetGame}>重新開始</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700"
                onClick={retryCurrentRound}>重投</button>
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

        {/* 右下角回合切換按鈕，比玩家區高 */}
        <div className="absolute bottom-[7.5rem] right-4 z-50">
          <button className={`${btnClass} bg-green-700 hover:bg-green-600 text-white`}
            style={{ borderRadius: 0 }}
            onClick={endRound}
            disabled={currThrows.length === 0}
            title="ROUND CHANGE">
            <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none">
              <polyline points="12,10 12,28 28,28" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
              <polygon points="28,28 21,23 21,33" fill="#fff" />
            </svg>
          </button>
        </div>

        <div className="flex-1 flex flex-row items-stretch w-full h-full">
          {/* 左側回合分數區（底不超過玩家資訊條） */}
          <div className="flex flex-col justify-start items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3">
            <div ref={historyBox}
              className="rounded-2xl shadow-inner flex flex-col w-full max-h-[calc(100vh-120px)] overflow-y-scroll custom-scrollbar py-8 transition-all">
              <div className="w-full">
                <div className="grid grid-cols-2 gap-x-2 text-center">
                  {history.map((sum, idx) => (
                    <React.Fragment key={idx}>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-4xl font-bold text-gray-900 py-4 border border-black select-none">R{idx + 1}</div>
                      <div style={{ backgroundColor: bgColorByIndex(idx, history.length) }}
                        className="text-6xl font-extrabold py-4 border border-black select-none">{sum}</div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* 中間極大分數區，數字間距窄 */}
          <div className="flex flex-col items-center justify-center flex-[2_2_0%] max-w-[66vw] min-w-0 min-h-[520px]">
            <TerminalFlipScore num={score >= 0 ? score : 0} showBust={bust} />
          </div>
          {/* 右側分數格，上移，間距窄 */}
          <div className="flex flex-col justify-end items-center flex-[1_1_0%] min-w-[220px] max-w-[340px] px-3 pb-16 pt-8">
            <div className="flex flex-col items-center w-full gap-y-3 mb-7 mt-14">
              {[0, 1, 2].map(i => {
                const highlight = displayedCurrThrows[i] === undefined &&
                  displayedCurrThrows.findIndex(v => v === undefined) === i;
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
