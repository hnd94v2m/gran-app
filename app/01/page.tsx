'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment, SegmentType } from "@/services/boardinfo";

const START_SCORE = 501;
const MAX_HISTORY_ROWS = 8;
const MENU_BTN_HEIGHT = 64;
const RED_BUTTON_SEGMENT_ID: number = 84; // 你的紅色按鈕ID

function TerminalFlipDigit({ digit }: { digit: string }) {
  const [current, setCurrent] = useState("0");
  useEffect(() => {
    let count = 0, running = true;
    const interval = setInterval(() => {
      if (!running) return;
      count++;
      if (count > 4) { running = false; setCurrent(digit); clearInterval(interval); }
      else setCurrent(Math.floor(Math.random() * 10).toString());
    }, 48);
    return () => clearInterval(interval);
  }, [digit]);
  return (
    <span className="terminal-digit select-none bg-black text-green-400 font-mono font-extrabold flex items-end justify-center"
      style={{
        fontStretch: "expanded", fontSize: "clamp(5rem, 12vw, 13rem)", lineHeight: 1.05,
        height: "clamp(7rem, 13vw, 15rem)", minWidth: "2.05em", padding: "0.13em 0.1em", letterSpacing: "-0.21em"
      }}>{current}</span>
  );
}
function TerminalFlipScore({ num, showBust }: { num: number; showBust: boolean }) {
  if (showBust) {
    return (
      <div className="flex flex-row items-end justify-center w-full h-full">
        <span className="terminal-digit font-mono text-red-500 bg-black font-black flex items-center justify-center"
          style={{
            fontSize: "clamp(5rem,12vw,13rem)", lineHeight: 1.05,
            height: "clamp(7rem,13vw,15rem)", minWidth: "7.2em", letterSpacing: "-0.12em", padding: "0.16em 0.1em"
          }}>BUST</span>
      </div>
    );
  }
  const padded = num.toString().padStart(3, "0");
  return (
    <div className="flex flex-row justify-center items-end w-full h-full" style={{ gap: "0.005em" }}>
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
        {enabled && <span style={{ width: 18, height: 18, borderRadius: "999px", background: "#fde047", display: "inline-block" }} />}
      </span>
    </div>
  );
}
function SwitchBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div role="button" tabIndex={0}
      onClick={onChange}
      className="relative flex items-center w-14 h-7 bg-zinc-700 rounded-full cursor-pointer select-none transition"
      style={{ borderRadius: 9999, minWidth: 56, minHeight: 28 }} aria-label="MO/OO 切換">
      <div className="absolute inset-0 rounded-full transition"
        style={{ background: checked ? "rgba(93,156,236,0.23)" : "rgba(32,34,42,0.25)" }} />
      <div className="absolute top-1 left-1 transition-transform duration-200"
        style={{ transform: checked ? "translateX(0)" : "translateX(1.65rem)" }}>
        <div className="w-6 h-5 bg-white rounded-md flex items-center shadow ring-2 ring-zinc-400 justify-center">
          <div className="flex flex-row h-3/4 gap-1">
            <div className="w-[2px] h-4 bg-zinc-700 rounded" />
            <div className="w-[2px] h-4 bg-zinc-700 rounded" />
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
  const [history, setHistory] = useState<number[]>([]);
  const [currThrows, setCurrThrows] = useState<number[]>([]);
  const scoreRef = useRef(score);
  const currThrowsRef = useRef(currThrows);
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const [lastValidScore, setLastValidScore] = useState(START_SCORE);
  const [bust, setBust] = useState(false);
  const [bustRoundNum, setBustRoundNum] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(true);
  const [moMode, setMoMode] = useState(true);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { currThrowsRef.current = currThrows; }, [currThrows]);

  const hitLock = useRef(false);
  const roundEnded = useRef(false);
  const hitTimer = useRef<NodeJS.Timeout | null>(null);
  const historyBox = useRef<HTMLDivElement>(null);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");

  useEffect(() => {
    console.log("畫面分數即時顯示：", score);
  }, [score]);

  function isLegalFinish(segment: Segment, fatBull: boolean, mo: boolean) {
    if (!mo) return true;
    if (segment.Type === SegmentType.Double) return true;
    if (segment.Type === SegmentType.Triple) return false;
    if (segment.Value === 25 || segment.Value === 50) return fatBull;
    return false;
  }
  function getAdjustedScore(val: number) {
    if (fatBullEnabled && (val === 25 || val === 50)) return 50;
    return val;
  }

  const visibleHistory = history.slice(-MAX_HISTORY_ROWS);

  const justEndedRound = lastRoundThrows.length > 0 && currThrows.length === 0 && !bust;
  const showThrows = justEndedRound ? lastRoundThrows : currThrows;
  let currentTotal: number;
  if (bust) {
    currentTotal = scoreRef.current;
  } else if (justEndedRound) {
    currentTotal = score;
  } else {
    currentTotal = score - showThrows.reduce((a, b) => a + b, 0);
    if (currentTotal < 0) currentTotal = 0;
  }

  // 關鍵修正：每當回合結束/紅按鈕，**確保所有狀態和鎖ref都正確重設**
  function fullyReleaseAllLocks() {
    roundEnded.current = false;
    hitLock.current = false;
    if (hitTimer.current) clearTimeout(hitTimer.current);
  }

  function endRoundWithThrows(throwsToAdd: number[]) {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
    setScore(prevScore => prevScore - sum);
    // 這裡鎖起來，避免連擊多判一次，但 150ms 立即解開（比紅按鈕流程還快），
    // 下回合第一鏢能進正確流程
    roundEnded.current = true;
    hitLock.current = true;
    if (hitTimer.current) clearTimeout(hitTimer.current);
    setTimeout(() => {
      fullyReleaseAllLocks();
    }, 150);
  }

  useEffect(() => { if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight; }, [history]);
  useEffect(() => { handleConnect(); }, []);
  const handleConnect = async () => {
    try { const gb = await Granboard.ConnectToBoard(); setGranboard(gb); }
    catch { }
  };

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      // ==== 處理紅色結算按鈕 ====
      if (Number(segment.ID) === RED_BUTTON_SEGMENT_ID) {
        if (currThrowsRef.current.length > 0) {
          endRoundWithThrows([...currThrowsRef.current]);
        } else {
          setCurrThrows([]);
          setLastRoundThrows([]);
          fullyReleaseAllLocks();
        }
        return;
      }
      if (roundEnded.current || hitLock.current) return;

      hitLock.current = true;
      if (hitTimer.current) clearTimeout(hitTimer.current);
      hitTimer.current = setTimeout(() => { hitLock.current = false; }, 600);

      const hitVal = getAdjustedScore(segment.Value);

      setCurrThrows(prev => {
        let nowThrows = currThrowsRef.current;
        if (nowThrows.length >= 3) return nowThrows;
        const newThrows = [...nowThrows, hitVal];
        if (nowThrows.length === 0) setLastValidScore(scoreRef.current);

        const throwsSum = newThrows.reduce((a, b) => a + b, 0);

        const bustNow =
          hitVal > (scoreRef.current - nowThrows.reduce((a, b) => a + b, 0)) ||
          (scoreRef.current - nowThrows.reduce((a, b) => a + b, 0)) - hitVal === 1 ||
          ((scoreRef.current - throwsSum) === 0 && !isLegalFinish(segment, fatBullEnabled, moMode));

        if (bustNow) {
          setBust(true);
          setTimeout(() => setBust(false), 1200);
          setScore(lastValidScore);
          setCurrThrows([]);
          setLastRoundThrows([]);
          setBustRoundNum(history.length + 1);
          fullyReleaseAllLocks();
          return [];
        }
        if (newThrows.length === 3) {
          endRoundWithThrows(newThrows);
          return [];
        }
        return newThrows;
      });
    };
    return () => {
      granboard.segmentHitCallback = undefined;
      if (hitTimer.current) clearTimeout(hitTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granboard, fatBullEnabled, moMode, lastValidScore, history]);

  const retryCurrentRound = () => {
    setCurrThrows([]); setMenuOpen(false);
    fullyReleaseAllLocks();
  };
  const resetGame = () => {
    setScore(START_SCORE); setHistory([]); setCurrThrows([]); setLastRoundThrows([]);
    setMenuOpen(false); setBust(false); setLastValidScore(START_SCORE); setBustRoundNum(null);
    fullyReleaseAllLocks();
  };
  const goHome = () => { router.push("/"); setMenuOpen(false); };
  const endRound = () => {
    if (currThrowsRef.current.length === 0) return;
    endRoundWithThrows(currThrowsRef.current);
  };

  function bgColorByIndex(idx: number, len: number): string {
    const min = 32, max = 228;
    const ratio = len <= 1 ? 0 : idx / (len - 1);
    const gray = Math.round(min + (max - min) * ratio);
    return idx % 2 === 0 ? `rgb(${gray},${gray},${gray})` : `rgb(${Math.max(gray - 10, min)},${Math.max(gray - 10, min)},${Math.max(gray - 10, min)})`;
  }

  const col1Width = "100px";
  const col2Width = "137px";
  const rowHeight = "52px";
  const threeMarkBoxWidth = "135px";
  const threeMarkBoxHeight = "80px";
  const btnClass = "w-16 h-16 flex items-center justify-center shadow-lg p-0";

  return (
    <div className="bg-black text-white w-full min-h-screen flex flex-col"
      style={{ aspectRatio: "16/9", minHeight: "100vh", minWidth: "100vw", overflow: "hidden", position: "relative" }}>
      <main className="flex flex-col h-full w-full flex-1 relative">
        <div className="absolute top-4 right-4 z-50">
          <button onClick={() => setMenuOpen(!menuOpen)}
            className={`${btnClass} bg-zinc-800 hover:bg-zinc-700 text-white`}
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
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={resetGame}>重新開始</button>
              <button className="px-8 py-4 text-2xl text-left hover:bg-zinc-700 focus:bg-zinc-700" onClick={retryCurrentRound}>重投</button>
              <div className="flex justify-between items-center px-8 py-6 text-2xl hover:bg-zinc-700"><span>Fat Bull</span>
                <FatBullSwitch enabled={fatBullEnabled} onChange={() => setFatBullEnabled(!fatBullEnabled)} />
              </div>
              <div className="flex justify-between items-center px-8 py-6 text-2xl hover:bg-zinc-700"><span>MO/OO</span>
                <SwitchBox checked={moMode} onChange={() => setMoMode(!moMode)} />
              </div>
              <button className="px-8 py-4 text-2xl text-left border-t border-zinc-700 hover:bg-zinc-700" onClick={goHome}>返回首頁</button>
            </div>
          )}
        </div>
        <div className="absolute bottom-[7.5rem] right-4 z-50">
          <button className={`${btnClass} bg-green-700 hover:bg-green-600 text-white`}
            style={{ borderRadius: 0 }} onClick={endRound} disabled={currThrows.length === 0}>
            <svg className="w-9 h-9" viewBox="0 0 40 40" fill="none">
              <polyline points="12,10 12,28 28,28" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
              <polygon points="28,28 21,23 21,33" fill="#fff" />
            </svg>
          </button>
        </div>
        <div className="flex flex-row w-full flex-1 items-start" style={{ paddingTop: `${MENU_BTN_HEIGHT}px` }}>
          <div className="flex flex-col flex-[1_1_0%] min-w-[130px] max-w-[300px] px-2 pt-0" style={{ height: "100%" }}>
            <div className="w-full h-[440px] overflow-y-scroll custom-scrollbar" ref={historyBox}>
              <div className="overflow-hidden border border-black rounded-none">
                {visibleHistory.map((scoreVal, idx) => {
                  const color = bgColorByIndex(idx, visibleHistory.length);
                  return (
                    <div className="flex" key={`row_${idx}`} style={{ height: rowHeight }}>
                      <div style={{
                        width: col1Width, height: rowHeight, background: color, borderLeft: "none", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderRight: "1px solid #222"
                      }}
                        className="text-[2rem] font-bold text-gray-900 border-b border-black flex items-center justify-center">
                        R{history.length - visibleHistory.length + idx + 1}
                      </div>
                      <div
                        style={{ width: col2Width, height: rowHeight, background: color, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                        className="text-[2.8rem] font-extrabold border-b border-black flex items-center justify-end pr-4">
                        {scoreVal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-col flex-[2_2_0%] max-w-[66vw] w-full items-center justify-between h-full pt-0">
            <div className="flex flex-1 items-center justify-center w-full h-full" style={{ maxWidth: '66vw', minHeight: '12rem' }}>
              <div style={{
                width: "100%", display: "flex", justifyContent: "center",
                alignItems: "center", minWidth: "min(100vw,1200px)"
              }}>
                <TerminalFlipScore num={currentTotal} showBust={bust} />
              </div>
            </div>
            <div className="flex items-center justify-center gap-10 w-full py-8 bg-gradient-to-t from-black via-zinc-950/80">
              <span className="inline-block w-24 h-24 rounded-full bg-zinc-700 text-[4.5rem] flex items-center justify-center select-none">{avatar}</span>
              <span className="text-3xl font-bold select-none">{playerName}</span>
              {/* 玩家名稱旁顯示 score（上個回合結束之分數） */}
              <span className="ml-8 px-6 py-3 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-4xl font-black select-none">
                {score}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end justify-start flex-[1_1_0%] min-w-[150px] max-w-[330px] px-3 pb-16" style={{ marginTop: MENU_BTN_HEIGHT }}>
            <div className="flex flex-col items-end w-full gap-y-6 mb-5 mt-0">
              {[0, 1, 2].map(i => {
                const highlight = showThrows[i] === undefined && showThrows.findIndex(v => v === undefined) === i;
                return (
                  <div key={i} className="flex flex-col items-end w-full">
                    <div style={{
                      width: threeMarkBoxWidth, height: threeMarkBoxHeight, borderRadius: 0
                    }}
                      className={`flex items-center justify-center border-2 text-5xl font-extrabold italic ${
                        showThrows[i] !== undefined
                          ? "border-yellow-400 text-yellow-300 bg-zinc-900"
                          : highlight
                            ? "border-green-400 text-white bg-green-800 animate-pulse"
                            : "border-zinc-600 text-zinc-500 bg-zinc-900"
                      } select-none mx-0`}>
                      <span className="w-full text-center">{showThrows[i] !== undefined ? showThrows[i] : "--"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-col w-full"><div className="w-full h-3 bg-gradient-to-t from-yellow-600/80 to黑色/0" /></div>
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar { width: 15px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,215,0,0.45); border-radius: 7px; border: 5px solid transparent; background-clip: content-box; }
          .terminal-digit { font-feature-settings:"tnum"; border-radius:0.17em; box-shadow:0 0 24px #27ff46a0,0 2px 60px #021; }
        `}</style>
      </main>
    </div>
  );
}
