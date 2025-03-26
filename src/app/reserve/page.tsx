"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabaseClient";

// `react-calendar` をクライアント側でのみ動作させる
const Calendar = dynamic(() => import("react-calendar"), { ssr: false });

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const ALL_SLOTS = [
  { label: "9-17", start: "09:00:00", end: "17:00:00" },
  { label: "18-22", start: "18:00:00", end: "22:00:00" },
  { label: "9-22", start: "09:00:00", end: "22:00:00" }
];
// const { data, error } = await supabase
//   .rpc('register_customer_and_reservation', {
//     name: 'shinopan', //text
//     phone: '09012345678', //phone　ハイフンなし
//     email: 'yamada@example.com', //email
//     company_name: '株式会社ABC', //text
//     studio_name: '渋谷スタジオ', //text
//     reservation_date: '2025-03-22', //カレンダーの日付選択で自動入力
//     start_time: '18:00:00', //カレンダーの日付の中の時間帯選択で自動入力
//     end_time: '22:00:00', //カレンダーの日付の中の時間帯選択で自動入力
//     usage_type: '商業利用', //text
//     notes: '撮影後に簡単な打ち合わせ希望', //text
//     participants: 5, //number
//     parking_required: true, //boolean
//     shooting_details: 'CM撮影', //text
//     receipt_required: false, //boolean
//     option_details: 'プロカメラマン手配' //text
//   });

// if (error) {
//   console.error('予約登録エラー:', error);
// } else {
//   console.log('予約成功:', data);
// }

export default function ReservePage() {
  const [date, setDate] = useState<Value>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // const [loading, setLoading] = useState(false);
  // const [message, setMessage] = useState("");

  useEffect(() => {
    fetchReservations();
  }, []);

  // 予約データを取得して、空き枠を計算
  const [reservations, setReservations] = useState<{ [key: string]: { start: string; end: string }[] }>({});
  const fetchReservations = async () => {
    const { data, error } = await supabase.from("reservations").select("reservation_date, start_time,end_time");
    if (error) {
      console.error("予約取得エラー:", error);
      return;
    }

    const mappedReservations: { [key: string]: { start: string; end: string }[] } = {};
    data.forEach((entry) => {
      if (!mappedReservations[entry.reservation_date]) {
        mappedReservations[entry.reservation_date] = [];
      }
      mappedReservations[entry.reservation_date].push({ start: entry.start_time, end: entry.end_time });
    });
    setReservations(mappedReservations);
  };

  // 日付クリック時に、その日の空き時間帯を計算
  const handleDateSelect = (value: Value) => {
    setDate(value);
    setSelectedSlot(null);
    setName("");
    setEmail("");

    if (!value || !(value instanceof Date)) return;
    const jstDate = new Date(value.getTime() + 9 * 60 * 60 * 1000); // 9時間（ミリ秒換算）を加算
    const dateString = jstDate.toISOString().split("T")[0];

    // すでに予約された枠を除外
    const reservedSlots = reservations[dateString] || [];
    const available = ALL_SLOTS.filter((slot) => {
      // slot.start と slot.end を比較して、予約された時間帯と完全に一致するか部分的に一致する場合、非表示にする
      const isFullyBooked = reservedSlots.some(
        (reservation) =>
          (reservation.start <= slot.start && reservation.end >= slot.end)
      );

      // 予約済み時間帯が slot.start と slot.end を部分的に覆い隠す場合も考慮
      const isPartiallyBooked = reservedSlots.some(
        (reservation) =>
          (reservation.start < slot.end && reservation.end > slot.start)
      );

      return !(isFullyBooked || isPartiallyBooked);
    });

    setAvailableSlots(available.map((slot) => slot.label));
  };

  // 仮予約を登録
  // const handleReservation = async () => {
  //   if (!date || !(date instanceof Date) || !selectedSlot || !name || !email) {
  //     setMessage("すべての項目を入力してください");
  //     return;
  //   }

  //   setLoading(true);
  //   setMessage("");

  //   const dateString = date.toISOString().split("T")[0];

  //   const { error } = await supabase.from("reservations").insert([
  //     { date: dateString, time_slot: selectedSlot, name, email, status: "pending" }
  //   ]);

  //   setLoading(false);
  //   if (error) {
  //     console.error(error);
  //     setMessage("予約に失敗しました");
  //   } else {
  //     setMessage(`仮予約を登録しました（${dateString} - ${selectedSlot}）`);
  //     fetchReservations(); // 予約データを再取得
  //     setSelectedSlot(null);
  //     setName("");
  //     setEmail("");
  //   }
  // };

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-2xl font-bold mb-4">カレンダー予約</h1>
      <Calendar
        onClickDay={handleDateSelect}
        value={date}
        tileContent={({ date }) => {
          const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // 9時間（ミリ秒換算）を加算
          const dateString = jstDate.toISOString().split("T")[0];
          const reservedSlots = reservations[dateString] || [];
          const available = ALL_SLOTS.filter((slot) => {
            const isFullyBooked = reservedSlots.some(
              (reservation) =>
                reservation.start <= slot.start && reservation.end >= slot.end
            );
            const isPartiallyBooked = reservedSlots.some(
              (reservation) =>
                reservation.start < slot.end && reservation.end > slot.start
            );
            return !(isFullyBooked || isPartiallyBooked);
          });

          return (
            <div className="flex flex-wrap justify-center mt-1">
              {available.length === 0 ? (
                <span className="px-1 text-xs bg-gray-400 rounded">満席</span>
              ) : (
                available.map((slot) => (
                  <span key={slot.label} className="px-1 text-xs bg-green-200 rounded">
                    {slot.label}
                  </span>
                ))
              )}
            </div>
          );
        }}
      />
      {date && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">予約枠を選択</h2>
          <div className="flex gap-2">
            {availableSlots.map((slot) => (
              <button
                key={slot}
                className={`px-4 py-2 border rounded ${selectedSlot === slot ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                onClick={() => setSelectedSlot(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* 追加の予約選択 UI があればここに記載 */}
    </div>
  );
}
