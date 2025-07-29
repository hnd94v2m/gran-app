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

  // 💡function宣告於最前面，不要const/arrow且不可在useEffect之後
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
          setScore(lastValidScore);
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
      {/* ...其餘內容完全不變（回合表格、大分數區、右側分數格欄、玩家條等全部）... */}
      {/* 若你仍遇到錯誤，請將這個 function block 放在你的 Page01 內，並確定沒有多個同名的 const/function endRoundWithThrows */}
    </div>
  );
}
