'use client';
import { useEffect, useState } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

export default function Page01() {
  const [granboard, setGranboard] = useState<Granboard>();
  const [score, setScore] = useState(START_SCORE); // 目前剩餘分數
  const [round, setRound] = useState(1);           // 目前回合數
  const [history, setHistory] = useState<number[]>([]); // 每回合三鏢總分
  const [currThrows, setCurrThrows] = useState<number[]>([]); // 當前回合已丟鏢分
  const [message, setMessage] = useState("請連接飛鏢靶");
  const [playerName] = useState("Player 1");        // 玩家名稱
  const [avatar] = useState("👨‍💻");                  // 玩家頭像

  // 連接 Granboard + callback
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
      if (currThrows.length >= 3) return; // 一回合最多3鏢
      setCurrThrows(prev => {
        const newThrows = [...prev, segment.Value];
        // 射完三鏢自動結束回合
        if (newThrows.length === 3) {
          endRoundWithThrows(newThrows);
        }
        return newThrows;
      });
      setScore(prevScore => prevScore - segment.Value);
    };
  }, [granboard]); // 移除 currThrows 依賴避免重複監聽

  // 用於結束回合並加入當前鏢數
  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setCurrThrows([]);
    setRound(r => r + 1);
  };

  // 手動結束回合（按鈕觸發）
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

  // 只顯示最新8回合歷史分數
  const displayedHistory = history.slice(-8);

  // 取出玩家最終目前分數（選擇下方條）
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
              <ul className="text-lg space-y-1 max-h-56 overflow-y-auto scroll-smooth pr-2">
                {displayedHistory.map((sum, idx) => (
                  <li key={idx} className="font-semibold">
                    R{history.length - displayedHistory.length + idx + 1}: {sum} 分
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 中間：目前大分數 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div
            className="
              text-[14rem] leading-none font-extrabold mb-2 tracking-widest select-none text-center
              text-gradient-metal
              drop-shadow-[0_6px_16px_rgba(255,215,0,0.9)]
            "
            style={{
              textShadow: `
                0 0 20px #FFD700,
                2px 2px 4px #997a00,
                4px 4px 15px #664d00,
                -2px -2px 8px #fffde7
              `
            }}
          >
            {score >= 0 ? score : 0}
          </div>
        </div>

        {/* 右側：本回合鏢/按鈕 */}
        <div className="flex flex-col justify-between items-end w-1/5 pr-3 py-4">
          {/* 選單 */}
          <div>
            <button className="p-2 mb-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xl shadow">
              ☰
            </button>
          </div>
          {/* 每鏢分數 */}
          <div>
            <div className="mb-2 text-xl text-right font-semibold">本回合分數</div>
            <ul className="space-y-3 text-xl min-w-[60px] text-right pr-1">
              {[0, 1, 2].map(i => (
                <li key={i}
                  className={`py-2 px-4 rounded border ${
                    currThrows[i] !== undefined
                      ? 'border-yellow-400 text-yellow-300 font-bold'
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
          background: linear-gradient(135deg, #f7f7f7, #c6c6c6 20%, #a3a3a3 40%, #fff 60%, #d2aa18 80%, #a77b00 90%, #f0e68c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-fill-color: transparent;
        }
        /* 自訂 scrollbar 樣式 */
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

