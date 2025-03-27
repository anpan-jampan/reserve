"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabaseClient";

const Calendar = dynamic(() => import("react-calendar"), { ssr: false });

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const ALL_SLOTS = [
  { label: "9時～17時", start: "09:00:00", end: "17:00:00" },
  { label: "18時～22時", start: "18:00:00", end: "22:00:00" },
  { label: "9時～22時", start: "09:00:00", end: "22:00:00" }
];

export default function ReservePage() {
  const [date, setDate] = useState<Value>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    nameKana: "",
    phone: "",
    email: "",
    company: "",
    xId: "",
    xHandle: "",
    usageType: "",
    notes: "",
    participants: "",
    parkingRequired: false,
    shootingDetails: "",
    receiptRequired: false,
    termsAgreed: false,
  });

  useEffect(() => {
    fetchReservations();
  }, []);

  const [reservations, setReservations] = useState<{ [key: string]: { start: string; end: string; status: string }[] }>({});

  const fetchReservations = async () => {
    const { data, error } = await supabase.from("reservations").select("reservation_date, start_time, end_time, status");
    if (error) {
      console.error("予約取得エラー:", error);
      return;
    }

    const mappedReservations: { [key: string]: { start: string; end: string; status: string }[] } = {};
    data.forEach((entry) => {
      if (!mappedReservations[entry.reservation_date]) {
        mappedReservations[entry.reservation_date] = [];
      }
      mappedReservations[entry.reservation_date].push({
        start: entry.start_time,
        end: entry.end_time,
        status: entry.status
      });
    });
    setReservations(mappedReservations);
  };

  
  const handleDateSelect = (value: Value) => {
    setDate(value);
    setSelectedSlot(null);

    if (!value || !(value instanceof Date)) return;
    const jstDate = new Date(value.getTime() + 9 * 60 * 60 * 1000);
    const dateString = jstDate.toISOString().split("T")[0];

    const reservedSlots = reservations[dateString] || [];
    const available = ALL_SLOTS.filter((slot) => {
      const isFullyBooked = reservedSlots.some(
        (reservation) => reservation.start <= slot.start && reservation.end >= slot.end
      );
      const isPartiallyBooked = reservedSlots.some(
        (reservation) => reservation.start < slot.end && reservation.end > slot.start
      );
      return !(isFullyBooked || isPartiallyBooked);
    });

    setAvailableSlots(available.map((slot) => slot.label));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleReservation = async () => {
    if (!formData.name || !formData.nameKana || !formData.email || !date || !selectedSlot || !formData.termsAgreed) {
      alert("必須項目をすべて入力してください。");
      return;
    }
    setLoading(true);
    setMessage("処理中....");

    const jstDate = new Date((date as Date).getTime() + 9 * 60 * 60 * 1000);
    const reservationDate = jstDate.toISOString().split("T")[0];
    const selectedSlotInfo = ALL_SLOTS.find(slot => slot.label === selectedSlot);
    const price = formData.usageType === "個人利用" ? 20000 : 40000;
    if (!selectedSlotInfo) {
      alert("予約枠が正しく選択されていません。");
      return;
    }

    const { error } = await supabase.rpc('register_customer_and_reservation',
      {
        _reservation_date: reservationDate,
        _start_time: selectedSlotInfo.start,
        _end_time: selectedSlotInfo.end,
        _name: formData.name,
        _name_kana: formData.nameKana,
        _phone: formData.phone,
        _email: formData.email,
        _company_name: formData.company,
        _x_id: formData.xId,
        _x_handle: formData.xHandle,
        _studio_name: 'Grista', //TODO 固定？
        _usage_type: formData.usageType,
        _price: price,
        _notes: formData.notes,
        _participants: formData.participants ? parseInt(formData.participants, 10) || null : null,
        _parking_required: formData.parkingRequired,
        _shooting_details: formData.shootingDetails,
        _receipt_required: formData.receiptRequired,
        _terms_agreed: true,
        _status: "pending" //固定
      }
    );

    if (error) {
      console.error("予約登録エラー:", error);
      alert("予約の登録に失敗しました。");
    } else {
      

    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: formData.name }),
    });

    setLoading(false);
    setMessage("");

    if (res.ok) {
      setFormData({
        name: "",
        nameKana: "",
        phone: "",
        email: "",
        company: "",
        xId: "",
        xHandle: "",
        usageType: "",
        notes: "",
        participants: "",
        parkingRequired: false,
        shootingDetails: "",
        receiptRequired: false,
        termsAgreed: false,
      });
  
      fetchReservations();
    }

    alert("予約が完了しました。");
  }
  };


  return (
    <div>
      <div className="inner flex flex-col items-center pb-10 ">
        <h1 className="text-2xl font-bold mb-4">カレンダー予約</h1>
        <Calendar
          onClickDay={handleDateSelect}
          value={date}
          className="my-calendar"
          tileContent={({ date }) => {
            const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // 9時間（ミリ秒換算）を加算
            const dateString = jstDate.toISOString().split("T")[0];
            const reservedSlots = reservations[dateString] || [];

            return (
              <div className="flex flex-wrap justify-center mt-1">
                {reservedSlots.length > 0 ? (
                  reservedSlots.map((slot, index) => (
                    <span
                      key={index}
                      className={`block text-xs rounded mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]
                        ${slot.status === "pending" ? "bg-yellow-300" : "bg-red-300"}`}
                      title={`${slot.start}～${slot.end} ${slot.status === "pending" ? "仮予約" : "予約済"}`}
                    >
                      {slot.start}～{slot.end} {slot.status === "pending" ? "仮予約" : "予約済"}
                  </span>
                  ))
                ) : (
                  <span className="px-1 text-xs rounded">-</span>
                )}
              </div>
            );
          }}
        />
        {date && (
  <div className="mt-4">
    <h2 className="text-lg text-center font-semibold mb-2">予約枠を選択</h2>
    {availableSlots.length > 0 ? (
      <div className="flex gap-2">
        {availableSlots.map((slot) => (
          <button
            key={slot}
            className={`px-2 py-2 border rounded ${
              selectedSlot === slot ? "bg-blue-500 text-white" : "bg-gray-200"
            }`}
            onClick={() => setSelectedSlot(slot)}
          >
            {slot}
          </button>
        ))}
      </div>
        ) : (
          <p className="text-center text-red-500">キャンセル待ち</p>
        )}
      </div>
    )}
      </div>
      <div className="inner pb-5">
        <h2 className="text-lg text-center font-semibold mb-2">予約情報入力</h2>
        <div className="mt-6 w-full p-4 border rounded">
          {/* 顧客情報 */}
          <label className="block mt-2">顧客名 <span className="text-red-500">*</span></label>
          <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border rounded" />

          <label className="block mt-2">フリガナ <span className="text-red-500">*</span></label>
          <input type="text" name="nameKana" value={formData.nameKana} onChange={handleInputChange} className="w-full p-2 border rounded" />

          <label className="block mt-2">電話番号</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full p-2 border rounded" />

          <label className="block mt-2">メール <span className="text-red-500">*</span></label>
          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full p-2 border rounded" />

          <label className="block mt-2">会社名</label>
          <input type="text" name="company" value={formData.company} onChange={handleInputChange} className="w-full p-2 border rounded" />

          <label className="block mt-2">XのID</label>
          <input type="text" name="xId" value={formData.xId} onChange={handleInputChange} className="w-full p-2 border rounded" />

          <label className="block mt-2">Xのハンドル名</label>
          <input type="text" name="xHandle" value={formData.xHandle} onChange={handleInputChange} className="w-full p-2 border rounded" />

          {/* 予約情報 */}
          <label className="block mt-4">利用用途</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="usageType"
                value="個人利用"
                checked={formData.usageType === "個人利用"}
                onChange={() => setFormData({ ...formData, usageType: "個人利用" })}
                className="mr-2"
              />
              個人利用
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="usageType"
                value="商用利用"
                checked={formData.usageType === "商用利用"}
                onChange={() => setFormData({ ...formData, usageType: "商用利用" })}
                className="mr-2"
              />
              商用利用
            </label>
          </div>

          <label className="block mt-2">備考</label>
          <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full p-2 border rounded" rows={3} />

          <label className="block mt-2">参加人数</label>
          <input
            type="number"
            name="participants"
            value={formData.participants}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setFormData((prev) => ({ ...prev, participants: value < 0 ? "0" : e.target.value }));
            }}
            className="w-full p-2 border rounded"
          />

          <label className="block mt-2">撮影内容</label>
          <textarea name="shootingDetails" value={formData.shootingDetails} onChange={handleInputChange} className="w-full p-2 border rounded" rows={3} />

          {/* チェックボックス */}
          <div className="mt-4 flex items-center">
            <input type="checkbox" name="parkingRequired" checked={formData.parkingRequired} onChange={handleCheckboxChange} />
            <label className="ml-2">駐車場を利用する</label>
          </div>

          <div className="mt-4 flex items-center">
            <input type="checkbox" name="receiptRequired" checked={formData.receiptRequired} onChange={handleCheckboxChange} />
            <label className="ml-2">領収書が必要</label>
          </div>

          <div className="mt-4 flex items-center">
            <input type="checkbox" name="termsAgreed" checked={formData.termsAgreed} onChange={handleCheckboxChange} />
            <label className="ml-2">利用規約に同意する <span className="text-red-500">*</span></label>
          </div>

          {/* 送信ボタン */}
          <button
            className="w-full mt-6 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            onClick={handleReservation}
          >
            仮予約する
          </button>
        <div className="loading-area text-center">
          {message && <div className="mt-4 text-center text-red-500">{message}</div>}
          {loading && <div>ローディング...</div>}
        </div>
        </div>
      </div>
    </div>
  );
}
