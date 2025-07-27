'use client';
import { useEffect, useState } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

// Flip Clock 元件
function FlipClockNumber({ value }: { value: string }) {
  return (
    <div className="relative flex items-center justify-center w-32 h-48 bg-zinc-900 rounded-xl mx-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] border-[3px] border-zinc-700 overflow-hidden">
      {/* 翻頁分割線 */}
      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-zinc-700/80 z-10" />
      {/* 數字（帶金屬質感） */}
      <span className="font-mono text-[8rem] font-extrabold select-none tracking-wider text-gradient-metal z-20"
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

  // BLE 命中處理
  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      if (currThrows.length >= 3) return;
      setCurrThrows(prev => {
        const newThrows = [...prev, segment.Value];
        if (newThrows.length === 3) endRoundWithThrows(newThrows);
        return newThrows;
      });
      setScore(prevScore => prevScore - segment.Value);
    };
  }, [granboard]);

  // 結束回合
  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setCurrThrows([]);
    setRound(r => r + 1);
  };
  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows);
  };

  // 重設
  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setHistory([]);
    setCurrThrows([]);
    setMessage("已重設，請連接飛鏢靶");
  };

  const displayedHistory = history.slice(-8);
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - currThrows.reduce((a, b) => a + b, 0);

  return (
    <main className="flex flex-col min-h-screen bg-black text-white">
      {/* 頂部主區塊 */}
      <div className="flex flex-1 w-full max-w-5xl mx-auto">
        {/* 左側：回合/分數總和 */}
        <div className="flex flex-col justify-between w-1/5 pl-3 py-4">
          <div>
            <div className="text-2xl font-bold">01</div>
            <div className="mt-6 text-lg">第 <b>{round}</b> 回合</div>
            <div className="mt-8">
              <div className="text-xl underline mb-2">歷史回合分數（最近8回合）</div>
              <ul className="text-xl space-y-1 max-h-56 overflow-y-auto scroll-smooth pr-2 font-bold">
                {displayedHistory.map((sum, idx) => (
                  <li key={idx}>
                    R{history.length - displayedHistory.length + idx + 1}: {sum} 分
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 中間翻頁時鐘分數 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[370px]">
          <FlipClockScore num={score >= 0 ? score : 0} />
        </div>

        {/* 右側：本回合鏢/按鈕 */}
        <div className="flex flex-col justify-between items-end w-1/5 pr-3 py-4">
          {/* 選單 */}
          <div>
            <button className="p-2 mb-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xl shadow">
              ☰
            </button>
          </div>
          {/* 每鏢分數放大 */}
          <div>
            <div className="mb-2 text-xl text-right font-semibold">本回合分數</div>
            <ul className="space-y-3 text-2xl min-w-[70px] text-right pr-1 font-bold">
              {[0, 1, 2].map(i => (
                <li key={i}
                    className={`py-2 px-4 rounded border ${
                      currThrows[i] !== undefined
                        ? 'border-yellow-400 text-yellow-300'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                >
                  {currThrows[i] !== undefined ? currThrows[i] : '--'}
                </li>
              ))}
            </ul>
            <button
              className="block mt-6 w-full px-2 py-2 rounded-lg bg-green-600 hover:bg-green-400 text-lg font-semibold transition-colors disabled:opacity-50"
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="射完三鏢後自動進入下一回合，箭靶無反應時可手動點擊"
            >
              結束本回合
            </button>
            <button
              className="mt-3 w-full px-2 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-xs"
              onClick={resetGame}
            >
              重設比賽
            </button>
            <button
              className="mt-3 w-full px-2 py-1 rounded-lg bg-blue-700 hover:bg-blue-500 text-xs"
              onClick={handleConnect}
            >
              連接飛鏢靶
            </button>
          </div>
        </div>
      </div>

      {/* 下方玩家條 */}
      <div className="flex items-center justify-center gap-4 w-full py-4 bg-gradient-to-t from-black via-zinc-950/80">
        {/* 玩家頭像 */}
        <span className="inline-block w-14 h-14 rounded-full bg-zinc-700 text-4xl flex items-center justify-center select-none">
          {avatar}
        </span>
        {/* 玩家名與分數 */}
        <span className="text-xl font-bold select-none">{playerName}</span>
        <span className="ml-4 px-4 py-1 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-2xl font-black select-none">
          {currentTotal >= 0 ? currentTotal : 0}
        </span>
      </div>

      <style jsx>{`
        /* 金屬質感文字漸層 */
        .text-gradient-metal {
          background: linear-gradient(135deg, #f7f7f7, #a9a9a9 20%, #fff 50%, #c9ac36 70%, #8a6d1b 85%, #f7f7f7 95%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
          filter: drop-shadow(0 0 8px #fffbe9a9);
        }
        ul::-webkit-scrollbar {
          width: 8px;
        }
        ul::-webkit-scrollbar-track {
          background: transparent;
        }
        ul::-webkit-scrollbar-thumb {
          background-color: rgba(255, 215, 0, 0.5);
          border-radius: 4px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
      `}</style>
    </main>
  );
}
