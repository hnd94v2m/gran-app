'use client';
import { useEffect, useState } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const CRICKET_SECTIONS = [15, 16, 17, 18, 19, 20, 25]; // 25 為 Bullseye
const SECTION_LABELS = {25: "BULL", 20: "20", 19: "19", 18: "18", 17: "17", 16: "16", 15: "15"};

function newPlayerState() {
  return {
    opened: Object.fromEntries(CRICKET_SECTIONS.map(num => [num, 0])), // count命中次數
    score: 0,
  };
}

export default function CricketPage() {
  // 雙人對打（Player1 / Player2）
  const [granboard, setGranboard] = useState<Granboard>();
  const [players, setPlayers] = useState([newPlayerState(), newPlayerState()]);
  const [current, setCurrent] = useState(0); // 0為P1
  const [message, setMessage] = useState("請連接藍牙靶開始比賽");

  useEffect(() => {
    if (!granboard) return;

    granboard.segmentHitCallback = (segment: Segment) => {
      let value = segment.Section === 25 ? 25 : segment.Section; // Bullseye特殊處理

      if (!CRICKET_SECTIONS.includes(value)) {
        setMessage(`本玩法僅統計 15~20 及 Bullseye`);
        return;
      }

      setPlayers(prevPlayers => {
        const ps = prevPlayers.map(p => ({...p, opened: {...p.opened}}));
        const opponent = (current + 1) % 2;
        let hitScore = segment.Type === 3 ? 3 : segment.Type === 2 ? 2 : 1;
        let selfOpened = ps[current].opened, oppOpened = ps[opponent].opened;

        let newSelfHits = Math.min(selfOpened[value] + hitScore, 3);
        let overflow = Math.max(0, (selfOpened[value] + hitScore) - 3);

        selfOpened[value] = newSelfHits;

        // 若自己已開且對方未開，超過的得分
        if (selfOpened[value] === 3 && oppOpened[value] < 3 && overflow > 0) {
          // Bullseye算25分
          ps[current].score += overflow * value;
        }
        setMessage(
          `玩家${current+1} 命中 ${SECTION_LABELS[value]} x${hitScore}，累積：${newSelfHits}/3`
        );
        return ps;
      });
    };
  }, [granboard, current]);

  const handleConnect = async () => {
    setMessage("連線中...");
    try {
      const gb = await Granboard.ConnectToBoard();
      setGranboard(gb);
      setMessage('連線成功，請開始投鏢！');
    } catch {
      setMessage('連線失敗，請重試');
    }
  };

  const nextPlayer = () => setCurrent(i => (i + 1) % 2);

  const resetGame = () => {
    setPlayers([newPlayerState(), newPlayerState()]);
    setCurrent(0);
    setMessage("已重設，請開始新遊戲");
  };

  // 判斷勝負
  const winner = (() => {
    if (CRICKET_SECTIONS.every(num => players[0].opened[num] === 3 && players[1].opened[num] === 3)) {
      if (players[0].score > players[1].score) return "玩家1勝";
      if (players[0].score < players[1].score) return "玩家2勝";
      return "雙方平手";
    }
    return null;
  })();

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">飛鏢 Cricket 規則</h1>
      <div className="mb-2">
        <span className={current
