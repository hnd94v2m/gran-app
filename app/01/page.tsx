'use client';
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment, SegmentType } from "@/services/boardinfo";

const START_SCORE = 501;
const MAX_HISTORY_ROWS = 5;

// ...（TerminalFlipDigit、TerminalFlipScore、FatBullSwitch、SwitchBox 不變，與過去一樣）

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

  // 必定在 useEffect 前宣告
  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(pv => [...pv, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
  };

  useEffect(() => {
    if (historyBox.current) historyBox.current.scrollTop = historyBox.current.scrollHeight;
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
          setCurrThrows([]); setLastRoundThrows([]);
          setBustRoundNum(round);
          setRound(r => r + 1);
          return [];
        }
        // 三鏢自動下一回合
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
    return idx % 2 === 0 ? `rgb(${gray},${gray},${gray})` : `rgb(${Math.max(gray-10, min)},${Math.max(gray-10, min)},${Math.max(gray-10, min)})`;
  }
  const col1Width = "64px";
  const col2Width = "110px";
  const btnClass = "w-16 h-16 flex items-center justify-center shadow-lg p-0";

  const retryCurrentRound = () => {
    const currSum = currThrows.reduce((a, b) => a + b, 0);
    setScore(prev => prev + currSum); setCurrThrows([]); setMenuOpen(false);
  };
  const resetGame = () => {
    setScore(START_SCORE); setRound(1); setHistory([]); setCurrThrows([]); setLastRoundThrows([]); setMenuOpen(false); setBust(false); setLastValidScore(START_SCORE); setBustRoundNum(null);
  };
  const goHome = () => { router.push("/"); setMenuOpen(false); };
  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows); setRound(r => r + 1);
  };

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: "16/9", minHeight: "100vh", minWidth: "100vw", overflow: "hidden", position: "relative" }}>
      {/* ... 其餘內容與之前版本完全一致 ... */}
      {/* 回合分數區、終端機大分數區、右側三格/切換按鈕、玩家條等...放回你上一版內容即可 */}
    </div>
  );
}
