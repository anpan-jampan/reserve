"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabaseClient";

// `react-calendar` をクライアント側でのみ動作させる
const Calendar = dynamic(() => import("react-calendar"), { ssr: false });

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function ReservePage() {
  const [date, setDate] = useState<Date | null>(null);
  const [name, setName] = useState(""); // 名前を管理
  const [email, setEmail] = useState(""); // メールアドレスを管理
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // 遅延レンダリング対策（CSR専用コンポーネントを確実にクライアント側で描画）
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDateSelect = (value: Value) => {
    if (Array.isArray(value)) {
      // 配列（範囲選択）の場合は、最初の日付を取得
      setDate(value[0] ?? null);
    } else {
      // 単一の日付の場合はそのままセット
      setDate(value);
    }
  };
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぐ
  
    if (!date || Array.isArray(date)) {
      setMessage("日付を選択してください");
      return;
    }
  
    if (!name || !email) {
      setMessage("名前とメールを入力してください");
      return;
    }
  
    setLoading(true);
    setMessage("");
  
    const formattedDate = date.toISOString().split("T")[0]; // Date 型であることを保証
  
    const { error } = await supabase.from("reservations").insert([
      {
        date: formattedDate,
        name,
        email,
        status: "pending"
      }
    ]);
  
    setLoading(false);
    if (error) {
      console.error(error);
      setMessage("予約に失敗しました");
    } else {
      setMessage("仮予約を登録しました");
      setName(""); // 入力リセット
      setEmail("");
      setDate(null);
    }

      // 通知を送信
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, date: date.toISOString().split("T")[0] }),
  });

  if (res.ok) {
    setMessage("仮予約を登録しました！管理者に通知しました");
  } else {
    setMessage("予約は成功しましたが、通知に失敗しました");
  }

  setLoading(false);
  setName("");
  setEmail("");
  setDate(null);
  };
  

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">カレンダー予約</h1>

      {/* カレンダー表示 */}
      {mounted ? <Calendar onClickDay={handleDateSelect} value={date} /> : <p>Loading...</p>}

      {/* 選択された日付の表示 */}
      {date && <p className="mt-4">選択日: {date.toISOString().split("T")[0]}</p>}

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
        <input
          type="text"
          placeholder="名前を入力"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded p-2 w-64"
        />
        <input
          type="email"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded p-2 w-64"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? "予約中..." : "仮予約する"}
        </button>
      </form>

      {/* メッセージ表示 */}
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
