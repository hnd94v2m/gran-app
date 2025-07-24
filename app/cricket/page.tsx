'use client';
import { useEffect, useState } from "react";
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const CRICKET_SECTIONS = [15, 16, 17, 18, 19, 20, 25]; // 25 為 Bullseye
const SECTION_LABELS: Record<number, string> = {
  25: "BULL",
  20: "20",
  19: "19",
  18: "18",
  17: "17",
  16: "16",
  15: "15",
};

function newPlayerState() {
  return {
    opened: Object.fromEntries(CRICKET_SECTIONS.map((num) => [num, 0])), // 命中次數，最多3
    score: 0,
  };
}

export default function CricketPage() {
  // 雙人對打（Player1 / Player2）
  const [granboard, setGranboard] = useState<Granboard>();
  const [players, setPlayers] = useState([newPlayerState(), newPlayerState()]);
  const [current, setCurrent] = useState(0); // 0為玩家1
  const [message, setMessage] = useState("請連接藍牙靶開始比賽");

  useEffect(() => {
    if (!granboard) return;

    granboard.segmentHitCallback = (segment: Segment) => {
      // 取得命中分區，Bullseye特別用25，其他用 Section
      let value = segment.Section === 25 ? 25 : segment.Section;

      if (!CRICKET_SECTIONS.includes(value)) {
        setMessage(`本玩法僅統計 15~20 及 Bullseye`);
        return;
      }

      setPlayers((prevPlayers) => {
        const ps = prevPlayers.map((p) => ({
          ...p,
          opened: { ...p.opened },
          score: p.score,
        }));
        const opponent = (current + 1) % 2;

        // 計算本次命中點數，Triple=3，Double=2，Single=1
        let hitScore = segment.Type === 3 ? 3 : segment.Type === 2 ? 2 : 1;

        let selfOpened = ps[current].opened;
        let oppOpened = ps[opponent].opened;

        // 更新自己該分區命中數，最多3次算開
        let newSelfHits = Math.min(selfOpened[value] + hitScore, 3);
        // 超過3的部分視為得分
        let overflow = Math.max(0, selfOpened[value] + hitScore - 3);

        selfOpened[value] = newSelfHits;

        // 如果自己已開分區且對手未開，剩下的分數把握得分加給玩家
        if (newSelfHits === 3 && oppOpened[value] < 3 && overflow > 0) {
          ps[current].score += overflow * value;
        }

        setMessage(
          `玩家${current + 1} 命中 ${SECTION_LABELS[value]} x${hitScore}，累積：${newSelfHits}/3`
        );

        return ps;
      });
    };
  }, [granboard, current]);

  // 連接藍芽靶
  const handleConnect = async () => {
    setMessage("連線中...");
    try {
      const gb = await Granboard.ConnectToBoard();
      setGranboard(gb);
      setMessage("連線成功，請開始投鏢！");
    } catch {
      setMessage("連線失敗，請重試");
    }
  };

  // 下一位玩家
  const nextPlayer = () => {
    setCurrent((i) => (i + 1) % 2);
    setMessage(`輪到玩家${(current + 2) % 2 + 1}出鏢`);
  };

  // 重設遊戲
  const resetGame = () => {
    setPlayers([newPlayerState(), newPlayerState()]);
    setCurrent(0);
    setMessage("已重設，請開始新遊戲");
  };

  // 判斷勝利條件：當7個分區皆雙方都開且分數判定誰高
  const winner = (() => {
    const allClosed = CRICKET_SECTIONS.every(
      (num) => players[0].opened[num] === 3 && players[1].opened[num] === 3
    );
    if (allClosed) {
      if (players[0].score > players[1].score) return "玩家1勝利！";
      if (players[0].score < players[1].score) return "玩家2勝利！";
      return "雙方平手";
    }
    return null;
  })();

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">飛鏢 Cricket 規則</h1>
      <div className="mb-2">
        <span className={current === 0 ? "font-bold underline" : ""}>
          玩家1
        </span>{" "}
        &nbsp;VS&nbsp;{" "}
        <span className={current === 1 ? "font-bold underline" : ""}>
          玩家2
        </span>
      </div>

      <table className="w-full mb-1 border border-collapse border-gray-400">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-gray-400 p-1">分區</th>
            {CRICKET_SECTIONS.map((s) => (
              <th key={s} className="border border-gray-400 p-1">
                {SECTION_LABELS[s]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => (
            <tr key={idx}>
              <td className="border border-gray-400 p-1">
                玩家{idx + 1} （分數：{p.score}）
              </td>
              {CRICKET_SECTIONS.map((s) => (
                <td key={s} className="border border-gray-400 text-center p-1">
                  {p.opened[s] >= 3
                    ? "●"
                    : p.opened[s] > 0
                    ? p.opened[s]
                    : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {winner && (
        <div className="font-bold text-green-600 text-center my-4">{winner}</div>
      )}

      <div className="mb-4 text-center text-lg">{message}</div>

      <div className="flex justify-center gap-3">
        <button
          className="btn px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleConnect}
        >
          連接飛鏢靶
        </button>
        <button
          className="btn px-4 py-2 bg-gray-600 text-white rounded"
          onClick={nextPlayer}
        >
          換玩家
        </button>
        <button
          className="btn px-4 py-2 bg-red-500 text-white rounded"
          onClick={resetGame}
        >
          重設遊戲
        </button>
      </div>
    </main>
  );
}
