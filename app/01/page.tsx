'use client';
import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment, SegmentType } from "@/services/boardinfo";

const START_SCORE = 501;
const MAX_HISTORY_ROWS = 8;
const MENU_BTN_HEIGHT = 64;
const RED_BUTTON_SEGMENT_ID: number = 84; // 由你的 LOG 得到的 Segment.ID

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
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);
  const [lastValidScore, setLastValidScore] = useState(START_SCORE);
  const [bust, setBust] = useState(false);
  const [bustRoundNum, setBustRoundNum] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fatBullEnabled, setFatBullEnabled] = useState(true);
  const [moMode, setMoMode] = useState(true);

  const hitLock = useRef(false);
  const roundEnded = useRef(false);
  const hitTimer = useRef<NodeJS.Timeout | null>(null);
  const historyBox = useRef<HTMLDivElement>(null);
  const [playerName] = useState("Player 1");
  const [avatar] = useState("👨‍💻");

  useEffect(() => { if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight; }, [history]);
  useEffect(() => { handleConnect(); }, []);
  const handleConnect = async () => {
    try { const gb = await Granboard.ConnectToBoard(); setGranboard(gb); }
    catch { }
  };

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
  function endRoundWithThrows(throwsToAdd: number[]) {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
    setScore(prevScore => prevScore - sum);
    roundEnded.current = true;
    setTimeout(() => { roundEnded.current = false; }, 500);
  }

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      if (hitLock.current) return;
      if (roundEnded.current) return;
      // 型別安全比對
      if (Number(segment.ID) === RED_BUTTON_SEGMENT_ID) {
        if (currThrows.length > 0) {
          roundEnded.current = true;
          endRoundWithThrows(currThrows);
        }
        return;
      }
      hitLock.current = true;
      if (hitTimer.current) clearTimeout(hitTimer.current);
      hitTimer.current = setTimeout(() => { hitLock.current = false; }, 600);
      const hitVal = getAdjustedScore(segment.Value);
      setCurrThrows(prev => {
        if (prev.length >= 3) return prev;
        const newThrows = [...prev, hitVal];
        if (prev.length === 0) setLastValidScore(score);
        const throwsSum = prev.reduce((a, b) => a + b, 0);
        const left = score - throwsSum;
        const isBust = (
          hitVal > left ||
          (left - hitVal === 1) ||
          (left - hitVal === 0 && !isLegalFinish(segment, fatBullEnabled, moMode))
        );
        if (isBust) {
          setBust(true);
          setTimeout(() => { setBust(false); }, 1200);
          setScore(lastValidScore);
          setCurrThrows([]); setLastRoundThrows([]);
          setBustRoundNum(history.length + 1);
          roundEnded.current = false;
          return [];
        }
        if (newThrows.length === 3) {
          roundEnded.current = true;
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
  }, [granboard, fatBullEnabled, moMode, score, lastValidScore, history, currThrows]);

  const retryCurrentRound = () => { setCurrThrows([]); setMenuOpen(false); roundEnded.current = false; };
  const resetGame = () => {
    setScore(START_SCORE); setHistory([]); setCurrThrows([]); setLastRoundThrows([]);
    setMenuOpen(false); setBust(false); setLastValidScore(START_SCORE); setBustRoundNum(null); roundEnded.current = false;
  };
  const goHome = () => { router.push("/"); setMenuOpen(false); };
  const endRound = () => {
    if (currThrows.length === 0) return;
    roundEnded.current = true;
    endRoundWithThrows(currThrows);
  };

  const visibleHistory = history.slice(-MAX_HISTORY_ROWS);
  let displayedCurrThrows = lastRoundThrows.length > 0 && currThrows.length === 0 ? lastRoundThrows : currThrows;
  if (bustRoundNum && (history.length + 1) === bustRoundNum + 1 && currThrows.length === 0)
    displayedCurrThrows = [];
  const currentTotal = score - displayedCurrThrows.reduce((a, b) => a + b, 0);

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
        {/* ... 省略 UI，內容直接維持你原本完整版本 ... */}
      </main>
    </div>
  );
}
