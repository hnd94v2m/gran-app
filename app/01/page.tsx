'use client';
import { useEffect, useState, useRef } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

// Flip Clock 數字元件
function FlipClockNumber({ value }: { value: string }) {
  return (
    <div className="relative flex items-center justify-center w-32 h-48 bg-zinc-900 rounded-xl mx-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] border-[3px] border-zinc-700 overflow-hidden">
      <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-zinc-700/80 z-10" />
      <span
        className="font-mono text-[8rem] font-extrabold select-none tracking-wider text-gradient-metal z-20"
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

  // 這裡用一個 state 來暫存上一回合分數 (上回合保留，直到新回合第一鏢)
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);

  // history 列表區塊 ref，滾動用
  const historyListRef = useRef<HTMLUListElement>(null);

  // 著地：滑動到底部，且只在 history 新增回合時觸發
  useEffect(() => {
    if (historyListRef.current) {
      const ul = historyListRef.current;
      ul.scrollTop = ul.scrollHeight;
    }
  }, [history]);

  // 連接 Granboard + 命中回調
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

  useEffect(() => {
    if (!granboard) return;

    granboard.segmentHitCallback = (segment: Segment) => {
      // 如果當前鏢數長度是0但lastRoundThrows還有，代表新一回合已開始要清空上回合分數
      if (currThrows.length === 0 && lastRoundThrows.length > 0) {
        setLastRoundThrows([]); // 清空上回合鏢數
      }

      if (currThrows.length >= 3) return; // 一回合最多三鏢

      setCurrThrows(prev => {
        const newThrows = [...prev, segment.Value];
        // 將分數扣除
        setScore(prevScore => prevScore - segment.Value);
        // 如果是新回合第一鏢，清空上一回合分數
        if (prev.length === 0 && lastRoundThrows.length > 0) {
          setLastRoundThrows([]);
        }
        // 射完三鏢自動結束回合
        if (newThrows.length === 3) {
          endRoundWithThrows(newThrows);
        }
        return newThrows;
      });
    };
  }, [granboard, currThrows, lastRoundThrows]);

  // 結束回合並將鏢數加入歷史，暫存本回合分數於 lastRoundThrows (等待下一回合第一鏢觸發清空)
  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
    setRound(r => r + 1);
  };

  // 手動結束回合（按鈕）
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
    setLastRoundThrows([]);
    setMessage("已重設，請連接飛鏢靶");
  };

  // 計算本回合分數顯示：如果 lastRoundThrows 有 (還沒清空)，即顯示上回合分數，否則顯示 currThrows
  const displayedCurrThrows = lastRoundThrows.length > 0 ? lastRoundThrows : currThrows;

  // 調整用，可以看到最多七個，歷史全部，但可滾動觀看早期
  const maxVisibleRounds = 7;

  // 當前的歷史回合都顯示，但UL最多高限制顯示7重回合高度，內含滾動
  const displayedHistory = history;

  // 計算目前得分（初始 - 歷史回合 - 本回合）
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);

  return (
    <main
      className="flex flex-col bg-black text-white"
      style={{
        minHeight: '100vh',
        aspectRatio: '16 / 9',
        maxHeight: '100vh',
      }}
    >
      {/* 頂部主區塊 */}
      <div className="flex flex-1 w-full max-w-7xl mx-auto">
        {/* 左側：回合/分數總和 歷史回合 */}
        <div className="flex flex-col justify-between w-1/5 p-4">
          <div>
            <div className="text-3xl font-bold">01</div>
            <div className="mt-8 text-2xl">第 <b>{round}</b> 回合</div>
            <div className="mt-10">
              <div className="text-2xl underline mb-4">歷史回合分數（共 {history.length} 回合）</div>
              <ul
                ref={historyListRef}
                className="text-2xl space-y-1 max-h-[33rem] overflow-y-auto scroll-smooth pr-3"
                style={{scrollBehavior: 'smooth'}}
                // scrollTop=scrollHeight 由 useEffect達成
              >
                {displayedHistory.map((sum, idx) => (
                  <li key={idx}>
                    R{idx + 1}: <span className="font-semibold">{sum} 分</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 中間：大分數翻頁時鐘 */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[380px]">
          <FlipClockScore num={score >= 0 ? score : 0} />
        </div>

        {/* 右側：本回合鏢數與按鈕 */}
        <div className="flex flex-col justify-between items-end w-1/5 p-4">
          <div>
            <button className="p-2 mb-6 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xl shadow">
              ☰
            </button>
          </div>
          <div>
            <div className="mb-3 text-3xl text-right font-semibold">本回合分數</div>
            <ul className="space-y-4 text-3xl min-w-[70px] text-right pr-2 font-bold">
              {[0, 1, 2].map(i => (
                <li
                  key={i}
                  className={`py-3 px-6 rounded border ${
                    displayedCurrThrows[i] !== undefined
                      ? 'border-yellow-400 text-yellow-300'
                      : 'border-zinc-700 text-zinc-500'
                  }`}
                >
                  {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
                </li>
              ))}
            </ul>
            <button
              className="block mt-8 w-full px-3 py-3 rounded-lg bg-green-600 hover:bg-green-400 text-xl font-semibold transition-colors disabled:opacity-50"
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="射完三鏢後自動進入下一回合，箭靶無反應時可手動點擊結束本回合"
            >
              結束本回合
            </button>
            <button
              className="mt-4 w-full px-3 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-xs"
              onClick={resetGame}
            >
              重設比賽
            </button>
            <button
              className="mt-4 w-full px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-500 text-xs"
              onClick={handleConnect}
            >
              連接飛鏢靶
            </button>
          </div>
        </div>
      </div>

      {/* 下方玩家條 */}
      <div className="flex items-center justify-center gap-6 w-full py-5 bg-gradient-to-t from-black via-zinc-950/80">
        <span className="inline-block w-16 h-16 rounded-full bg-zinc-700 text-5xl flex items-center justify-center select-none">
          {avatar}
        </span>
        <span className="text-2xl font-bold select-none">{playerName}</span>
        <span className="ml-6 px-5 py-2 rounded bg-zinc-800 text-green-400 tracking-widest font-mono text-3xl font-black select-none">
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

