'use client';
import React, { useEffect } from "react";

export default function Page01() {
  function endRoundWithThrows(arr: number[]) {
    // 只為驗證作用域與 TS 無誤
    console.log("function ok", arr.join(","));
  }

  useEffect(() => {
    endRoundWithThrows([1,2,3]);
  }, []);

  return (
    <div style={{color:"limegreen",fontSize:"2rem"}}>
      測試：如有看到這畫面，function沒問題，請打開 console 檢查日誌。
    </div>
  );
}
