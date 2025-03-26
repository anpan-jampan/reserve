"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabaseClient";

// `react-calendar` をクライアント側でのみ動作させる
const Calendar = dynamic(() => import("react-calendar"), { ssr: false });

type Value = Date | null;
const { data, error } = await supabase
  .rpc('register_customer_and_reservation', {
    name: 'shinopan', //text
    phone: '09012345678', //phone　ハイフンなし
    email: 'yamada@example.com', //email
    company_name: '株式会社ABC', //text
    studio_name: '渋谷スタジオ', //text
    reservation_date: '2025-03-29', //カレンダーの日付選択で自動入力
    start_time: '9:00:00', //カレンダーの日付の中の時間帯選択で自動入力
    end_time: '17:00:00', //カレンダーの日付の中の時間帯選択で自動入力
    usage_type: '商業利用', //text
    notes: '撮影後に簡単な打ち合わせ希望', //text
    participants: 5, //number
    parking_required: true, //boolean
    shooting_details: 'CM撮影', //text
    receipt_required: false, //boolean
    option_details: 'プロカメラマン手配' //text
  });

if (error) {
  console.error('予約登録エラー:', error);
} else {
  console.log('予約成功:', data);
}


export default function ReservePage() {
  const [date, setDate] = useState<Date | null>(null);
  const [name, setName] = useState(""); // 名前を管理
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(""); // メールアドレスを管理
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");


  // 遅延レンダリング対策（CSR専用コンポーネントを確実にクライアント側で描画）
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 日付選択時
  const handleDateSelect = async (value: Value) => {
    if (!value || !(value instanceof Date)) return;
    // 日本時間に変換（UTC +9）してセット
    const jstDate = new Date(value.getTime() + 9 * 60 * 60 * 1000); // 9時間（ミリ秒換算）を加算
    setDate(jstDate);
  };
  

  // 仮予約押下時
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <h1 className="text-2xl font-bold mb-4">スタジオ予約</h1>
      <h2>Studio M</h2>{/* これをstudio_nameとして送信したい */}

      {/* カレンダー表示 */}
      {mounted ? <Calendar onClickDay={handleDateSelect} value={date} /> : <p>Loading...</p>}

      {/* 選択された日付の表示 */}
      {date && <p className="mt-4">選択日: {date.toISOString().split("T")[0]}</p>}

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
        <div className="flex">
      <label htmlFor="">お名前</label>
        <input
          type="text"
          placeholder="名前を入力"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded p-2 w-64"
        /></div>
                <div className="flex">
          <label htmlFor="">電話番号</label>
        <input
          type="phone"
          placeholder="09012345678"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border rounded p-2 w-64"
        /></div>
        <div className="flex">
          <label htmlFor="">メール</label>
        <input
          type="email"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded p-2 w-64"
        /></div>
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
