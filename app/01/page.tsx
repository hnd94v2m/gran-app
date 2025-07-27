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
  const [playerName] = useState("Ken");            // 可以自訂
  const [avatar] = useState("🎯");                  // 可以換成照片url

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
      setCurrThrows(prev => [...prev, segment.Value]);
      setScore(prevScore => prevScore - segment.Value);
    };
  }, [granboard, currThrows]);

  // 結束本回合
  const endRound = () => {
    const sum = currThrows.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setCurrThrows([]);
    setRound(r => r + 1);
  };

  // 重設
  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setHistory([]);
    setCurrThrows([]);
    setMessage("已重設，請連接飛鏢靶");
  };

  // 取出玩家最終目前分數（選擇下方條）
  const currentTotal = START_SCORE - history.reduce((a, b) => a+b, 0) - currThrows.reduce((a,b)=>a+b,0);

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
              <div className="text-base underline mb-1">歷史回合分數</div>
              <ul className="text-sm space-y-1 max-h-44 overflow-y-auto">
                {history.map((sum, idx) => (
                  <li key={idx}>
                    R{idx + 1}: <span className="font-semibold">{sum} 分</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 中間：目前大分數 */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-7xl font-extrabold mb-2 tracking-wider drop-shadow-lg">
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
            <div className="mb-2 text-base text-right">本回合分數</div>
            <ul className="space-y-2 text-base min-w-[48px] text-right pr-1">
              {[0, 1, 2].map(i => (
                <li key={i}
                  className={`py-1 px-3 rounded border ${currThrows[i] !== undefined ? 'border-green-400 text-green-300' : 'border-zinc-700 text-zinc-500'}`}>
                  {currThrows[i] !== undefined ? currThrows[i] : '--'}
                </li>
              ))}
            </ul>
            <button
              className="block mt-6 w-full px-2 py-2 rounded-lg bg-green-600 hover:bg-green-400"
              onClick={endRound}
              disabled={currThrows.length === 0}
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
        <span className="inline-block w-12 h-12 rounded-full bg-zinc-700 text-3xl flex items-center justify-center">
          {avatar}
        </span>
        {/* 玩家名與分數 */}
        <span className="text-lg font-bold">{playerName}</span>
        <span className="ml-4 px-4 py-1 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-xl font-black">
          {currentTotal >= 0 ? currentTotal : 0}
        </span>
      </div>
    </main>
  );
}
