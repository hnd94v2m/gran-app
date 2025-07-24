'use client';
import { useEffect, useState, useCallback } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

export default function Page01() {
  const [granboard, setGranboard] = useState<Granboard>();
  const [score, setScore] = useState(START_SCORE);
  const [round, setRound] = useState(1);
  const [throws, setThrows] = useState<Segment[]>([]);
  const [message, setMessage] = useState("準備中，請連接飛鏢靶後開始比賽");

  // 註冊 Granboard 命中回調
  useEffect(() => {
    if (!granboard) return;
    granboard.segmentHitCallback = (segment) => {
      setThrows(prev => [...prev, segment]);
      setScore(prev => {
        const next = prev - segment.Value;
        // 判斷贏/爆鏢/正常
        if (next === 0 && segment.Type === 2) { // Double check
          setMessage('恭喜你剛好 Double 歸零，勝利！');
          return 0;
        }
        if (next < 0 || (next === 0 && segment.Type !== 2)) {
          setMessage('爆鏢（BUST），本回合分數不變！');
          setThrows([]); // 本回合作廢
          return prev;   // 分數不變
        }
        setMessage(`命中：${segment.LongName}，剩餘：${next}`);
        return next;
      });

      // 三鏢後進入下一回合
      setThrows(prev => {
        if (prev.length === 2) {
          setRound(r => r+1);
          setThrows([]);
        }
        return prev;
      });
    };
  }, [granboard]);

  // 連接藍牙
  const handleConnect = async () => {
    setMessage('正在連接...');
    try {
      const gb = await Granboard.ConnectToBoard();
      setGranboard(gb);
      setMessage('連接成功，請開始投鏢！');
    } catch {
      setMessage('連線失敗，請重試');
    }
  };

  // 重設比賽
  const resetGame = () => {
    setScore(START_SCORE);
    setRound(1);
    setThrows([]);
    setMessage('已重設，請開始新遊戲');
  };

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">「01」玩法 - 501 減分賽</h1>
      <div className="mb-2">第 <b>{round}</b> 局 　分數：  <b>{score}</b></div>
      <div className="mb-2">這回合投鏢紀錄：{throws.map((seg, i) => (
        <span key={i} className="mr-2">{seg.ShortName}({seg.Value})</span>
      ))}</div>
      <div className="mb-4 text-lg">{message}</div>
      <button className="btn px-4 py-2 bg-blue-500 rounded-lg text-white mr-2" onClick={handleConnect}>連接飛鏢靶</button>
      <button className="btn px-4 py-2 bg-red-500 rounded-lg text-white" onClick={resetGame}>重設遊戲</button>
    </main>
  );
}
