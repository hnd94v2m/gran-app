'use client';
import React from 'react';
import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { Granboard } from "@/services/granboard";
import { Segment } from "@/services/boardinfo";

const START_SCORE = 501;

function FlipClockNumber({ value }: { value: string }) {
  // 放大1.5倍: w-48 h-72 text-[12rem]
  return (
    <div className="relative flex items-center justify-center w-48 h-72 bg-zinc-900 rounded-xl mx-2 shadow-[0_8px_24px_rgba(0,0,0,0.6)] border-[4px] border-zinc-700 overflow-hidden">
      <div className="absolute left-3 right-3 top-1/2 h-0.5 bg-zinc-700/80 z-10" />
      <span className="font-mono text-[12rem] font-extrabold select-none tracking-wider text-gradient-metal z-20" style={{ letterSpacing: '0.08em' }}>{value}</span>
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-12 bg-zinc-800 rounded-lg shadow-xl" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-12 bg-zinc-800 rounded-lg shadow-xl" />
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

// ...其餘程式碼維持不變...

export default function Page01() {
  const router = useRouter();
  // ...原有 useState、函式略...
  //（所有狀態與方法維持不變，下面只顯示 render 部分重點片段）

  // ...省略前略...

  return (
    <div className="bg-black text-white w-full min-h-screen flex items-center justify-center"
      style={{ aspectRatio: '16/9', minHeight: '100vh', minWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
      <main className="flex flex-col w-full h-[100svh] max-w-full flex-1 relative">

        {/* ...右上角選單維持不動... */}

        <div className="flex-1 flex flex-row items-stretch w-full h-full">

          {/* 歷史回合區塊同之前 */}

          {/* === 這裡是放大後的大分數 === */}
          <div className="flex flex-col items-center justify-center flex-1 min-w-0 min-h-[380px]">
            <FlipClockScore num={score >= 0 ? score : 0} />
          </div>

          {/* 右側本回合區與圓形正方形 round change 按鈕同之前 */}
        </div>

        {/* 下方玩家條同之前 */}

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
            width: 12px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: rgba(255, 215, 0, 0.45);
            border-radius: 4px;
            border: 4px solid transparent;
            background-clip: content-box;
          }
        `}</style>
      </main>
    </div>
  );
}
