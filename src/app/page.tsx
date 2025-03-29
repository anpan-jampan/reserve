"use client"; // クライアントサイドで実行するためのディレクティブ

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Home() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // useRouterをクライアントサイドで呼び出す

  // useEffect(() => {
  //   // 非同期でデータをフェッチ
  //   const fetchData = async () => {
  //     const { data, error } = await supabase.from("reservations").select("*");
  //     if (error) {
  //       setError("エラーが発生しました");
  //     } else {
  //       setData(data);
  //     }
  //   };

  //   fetchData(); // データのフェッチを呼び出す
  // }, []); // 初回レンダリング時に実行される

  const handleNavigate = () => {
    router.push("/reserve"); // /reserve に遷移
  };

  return (
    <div className="inner">
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h1 className="text-9xl text-center">Gurista</h1>
        <button
          onClick={handleNavigate}
          className="text-blue-500 mx-auto block hover:underline"
        >
          スタジオ予約する
        </button>
      </div>
    </div>
  );
}
