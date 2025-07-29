'use client';
import React from "react";

export default function Page01() {
  function endRoundWithThrows(arr: number[]) {
    console.log("function ok", arr.join(","));
  }

  React.useEffect(() => {
    endRoundWithThrows([100, 200]);
  }, []);

  return (
    <div style={{color:"green", fontSize:"2rem"}}>
      編譯ok，function已被呼叫，請檢查console log
    </div>
  );
}
