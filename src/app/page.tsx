"use client"; // クライアントサイドで実行するためのディレクティブ

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter(); // useRouterをクライアントサイドで呼び出す

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
