'use client';
import { useEffect, useState, useRef } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

// 翻頁時鐘數字元件
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
  const [lastRoundThrows, setLastRoundThrows] = useState<number[]>([]);

  // 回合分數顯示框專用 ref，方便自動滾動最底
  const historyBox = useRef<HTMLDivElement>(null);

  // 當歷史分數變動就滾動到最底
  useEffect(() => {
    if (historyBox.current) {
      historyBox.current.scrollTop = historyBox.current.scrollHeight;
    }
  }, [history]);

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

  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment: Segment) => {
      // 新回合第一鏢時清空上一回合暫存分數
      if (currThrows.length === 0 && lastRoundThrows.length > 0) {
        setLastRoundThrows([]);
      }

      if (currThrows.length >= 3) return;

      setCurrThrows(prev => {
        const newThrows = [...prev, segment.Value];
        setScore(prevScore => prevScore - segment.Value);
        // 若滿三鏢，自動進入下回合（但等待下回合首鏢才清除顯示 ‒ 交由上面邏輯）
        if (newThrows.length === 3) {
          endRoundWithThrows(newThrows);
        }
        return newThrows;
      });
    };
    // eslint-disable-next-line
  }, [granboard, currThrows, lastRoundThrows]);

  // 結束本回合並暫存本回合分數
  const endRoundWithThrows = (throwsToAdd: number[]) => {
    const sum = throwsToAdd.reduce((a, b) => a + b, 0);
    setHistory(prev => [...prev, sum]);
    setLastRoundThrows(throwsToAdd);
    setCurrThrows([]);
    setRound(r => r + 1);
  };

  const endRound = () => {
    if (currThrows.length === 0) return;
    endRoundWithThrows(currThrows);
  };

  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setHistory([]);
    setCurrThrows([]);
    setLastRoundThrows([]);
    setMessage("已重設，請連接飛鏢靶");
  };

  // 當前分數顯示（上一回合如果還沒被新回合覆蓋則顯示上一回合）
  const displayedCurrThrows = lastRoundThrows.length > 0 ? lastRoundThrows : currThrows;

  // 歷史回合分數顯示（全部回合皆顯示），只用於分頁框顯示
  // 最新7個index
  const maxShow = 7;
  const showStart = Math.max(history.length - maxShow, 0);
  const displayedHistory = history.slice(showStart);

  // 目前最終分數
  const currentTotal = START_SCORE - history.reduce((a, b) => a + b, 0) - displayedCurrThrows.reduce((a, b) => a + b, 0);

  // ===== 畫面結構 =====
  return (
    <div
      className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{
        aspectRatio: '16 / 9', // 固定16:9
        minHeight: '100vh',
        minWidth: '100vw',
        //maxWidth: '100vw',  // 保證寬度填滿，content用flex布滿
        overflow: 'hidden',
      }}
    >
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1">
        <div className="flex-1 flex flex-row items-stretch w-full h-full">

          {/* 歷史回合分數顯示框 */}
          <div className="flex flex-col justify-center items-center w-[330px] min-w-[300px] px-4">
            <div
              ref={historyBox}
              className="bg-[#151718] rounded-2xl border-2 border-zinc-700 shadow-inner flex flex-col justify-end items-center
                h-[18rem] max-h-[75vh] w-full overflow-y-scroll custom-scrollbar py-2 transition-all"
            >
              {/* 兩行表格：第一行R數，第二行分數 */}
              {/* 上方空間自動頂格，下方靠近 */}
              <div className="w-full">
                <div className="flex flex-row justify-center items-end w-full">
                  {displayedHistory.map((_, idx) => (
                    <div key={idx}
                      className="flex-1 px-1 text-center text-2xl text-gray-400 font-bold"
                    >
                      R{showStart + idx + 1}
                    </div>
                  ))}
                </div>
                <div className="flex flex-row justify-center items-start w-full mt-3">
                  {displayedHistory.map((sum, idx) => (
                    <div key={idx}
                      className="flex-1 px-1 text-center text-4xl text-yellow-300 font-extrabold"
                    >
                      {sum}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 中間大分數 */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 min-h-[380px]">
            <FlipClockScore num={score >= 0 ? score : 0} />
          </div>

          {/* 右側本回合分數和按鈕 */}
          <div className="flex flex-col justify-center items-center w-[330px] min-w-[300px] px-4">
            {/* 本回合分數三鏢（不顯示標題，依照目前狀態高亮未丟鏢 */}
            <div className="flex flex-row justify-center items-end mb-8 w-full">
              {[0, 1, 2].map(i => {
                // 決定高亮，還沒丟的第一鏢（目前準備要丟的）為高亮，其餘普通
                let highlight = false;
                if (
                  (displayedCurrThrows[i] === undefined)
                  && (i === displayedCurrThrows.findIndex(v => v === undefined) || (displayedCurrThrows.filter(v => v === undefined).length === 3 && i===0))
                ) {
                  highlight = true;
                } else if (displayedCurrThrows[i] === undefined && displayedCurrThrows.slice(0, i).length === displayedCurrThrows.length) {
                  highlight = true; //全未丟第一鏢高亮
                }

                return (
                  <div
                    key={i}
                    className={`mx-2 flex flex-col items-center`}
                  >
                    <div
                      className={`
                        w-20 h-24 flex items-center justify-center rounded-2xl border-2 
                        text-4xl font-extrabold
                        ${
                          displayedCurrThrows[i] !== undefined
                            ? 'border-yellow-400 text-yellow-300 bg-zinc-900'
                            : highlight
                            ? 'border-green-400 text-white bg-green-800 animate-pulse'
                            : 'border-zinc-600 text-zinc-500 bg-zinc-900'
                        }
                        transition-all
                      `}
                    >
                      {displayedCurrThrows[i] !== undefined ? displayedCurrThrows[i] : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="block mt-1 w-full px-3 py-3 rounded-lg bg-green-600 hover:bg-green-400 text-xl font-semibold transition-colors disabled:opacity-50"
              onClick={endRound}
              disabled={currThrows.length === 0}
              title="射完三鏢後自動進入下一回合，如需手動可點"
            >
              結束本回合
            </button>
            <button
              className="mt-4 w-full px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-xs"
              onClick={resetGame}
            >
              重設比賽
            </button>
            <button
              className="mt-4 w-full px-3 py-2 rounded-lg bg-blue-700 hover:bg-blue-500 text-xs"
              onClick={handleConnect}
            >
              連接飛鏢靶
            </button>
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

        {/* 金屬質感等自定樣式 */}
        <style jsx>{`
          .text-gradient-metal {
            background: linear-gradient(135deg, #f7f7f7, #a9a9a9 20%, #fff 50%, #c9ac36 70%, #8a6d1b 85%, #f7f7f7 95%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
            filter: drop-shadow(0 0 8px #fffbe9a9);
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 11px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 215, 0, 0.45);
            border-radius: 4px;
            border: 3px solid transparent;
            background-clip: content-box;
          }
        `}</style>
      </main>
    </div>
  );
}
