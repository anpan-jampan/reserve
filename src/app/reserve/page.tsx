"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-calendar/dist/Calendar.css";
import { supabase } from "@/lib/supabaseClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// type Value = Date | null;
const Calendar = dynamic(() => import("react-calendar"), { ssr: false });
const ALL_SLOTS = [
  { label: "9時～17時", start: "09:00:00", end: "17:00:00" },
  { label: "18時～22時", start: "18:00:00", end: "22:00:00" },
  { label: "9時～22時", start: "09:00:00", end: "22:00:00" },
];

const reservationSchema = z.object({
  name: z
    .string()
    .min(1, "名前は必須です")
    .max(50, "50文字以内で入力してください"),
  nameKana: z
    .string()
    .min(1, "フリガナは必須です")
    .max(100, "100文字以内で入力してください"),
  phone: z.string().regex(/^\d+$/, "半角数字のみで入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  company: z.string().max(100, "100文字以内で入力してください").optional(),
  xId: z.string().max(100, "100文字以内で入力してください").optional(),
  xHandle: z.string().max(100, "100文字以内で入力してください").optional(),
  notes: z.string().max(200, "200文字以内で入力してください").optional(),
  participants: z
    .string()
    .regex(/^\d+$/, "半角数字のみで入力してください") // 半角数字のみ
    .refine((val) => Number(val) >= 1, {
      message: "1以上の数値を入力してください",
    })
    .optional(),
  shootingDetails: z
    .string()
    .max(200, "200文字以内で入力してください")
    .optional(),
  termsAgreed: z.boolean().refine((val) => val, "利用規約に同意が必要です"),
});

export default function ReservePage() {
  const [date, setDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]); // 予約可能時間 9時～17時,18時～22時,9時～22時
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [reservations, setReservations] = useState<{
    [key: string]: { start: string; end: string; status: string }[];
  }>({}); // DBの予約情報（[日付]{開始時間、終了時間、ステータス}）
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
  // 表示は文字列に変換
  const formattedDate = date instanceof Date ? date.toLocaleDateString() : "";

  const {
    register,
    // trigger,
    setValue, // setValueを使用
    formState: { errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(reservationSchema),
  });
  // ロード時に予約情報取ってくる
  useEffect(() => {
    setLoading(true);
    fetchReservations();
  }, []);

  // データが増えると重くなりそう
  const fetchReservations = async () => {
    const mappedReservations: {
      // オブジェクトの[配列]でキーはstringだよ:値（プロパティ）は3つでstringだよ
      // "2025-03-29": [{ start: "09:00", end: "10:00", status: "confirmed" },{ start: "11:00", end: "12:00", status: "pending" }]
      [key: string]: { start: string; end: string; status: string }[];
    } = {};

    const { data, error } = await supabase
      .from("reservations")
      .select("reservation_date, start_time, end_time, status");
    if (error) {
      console.error("予約取得エラー:", error);
      return;
    }

    data.forEach((entry) => {
      // undefinedの回避、pushできないので
      if (!mappedReservations[entry.reservation_date]) {
        mappedReservations[entry.reservation_date] = [];
      }
      // 取得したDBの値を変数に詰め替え
      mappedReservations[entry.reservation_date].push({
        start: entry.start_time,
        end: entry.end_time,
        status: entry.status,
      });
    });
    // 詰め替えた予約情報をステート管理
    setReservations(mappedReservations);
    setLoading(false);
  };

  // ユーザー操作
  // 日付選択したら予約可能時間帯を表示
  const handleDateSelect = (value: Date | null) => {
    setDate(value);
    setSelectedSlot(null);

    if (!value || !(value instanceof Date)) return;
    const jstDate = new Date(value.getTime() + 9 * 60 * 60 * 1000);
    const dateString = jstDate.toISOString().split("T")[0];
    // 選択した日付のオブジェクトを取得
    const reservedSlots = reservations[dateString] || [];

    // 予約されていない時間の抽出
    const available = ALL_SLOTS.filter((slot) => {
      // 満室かどうか
      const isFullyBooked = reservedSlots.some(
        (reservation) =>
          reservation.start <= slot.start && reservation.end >= slot.end
      );
      // 部分的に予約があるか
      const isPartiallyBooked = reservedSlots.some(
        (reservation) =>
          reservation.start < slot.end && reservation.end > slot.start
      );
      // 予約なしならtrueで表示
      return !(isFullyBooked || isPartiallyBooked);
    });

    setAvailableSlots(available.map((slot) => slot.label));
  };

  // const doCheck = async (fieldName: keyof typeof reservationSchema._type) => {
  //   const result = await trigger(fieldName);
  //   console.log(`バリデーションチェック結果（${fieldName}）:`, result);
  // };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // react-hook-formの状態を同期
    setValue(name as keyof typeof reservationSchema.shape, value); // 型を明示的に指定
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleReservation = async () => {
    if (!date) {
      alert("カレンダーから日付を選択してください。");
      return;
    }
    const jstDate = new Date((date as Date).getTime() + 9 * 60 * 60 * 1000);
    const reservationDate = jstDate.toISOString().split("T")[0];
    const selectedSlotInfo = ALL_SLOTS.find(
      (slot) => slot.label === selectedSlot
    );
    const price = formData.usageType === "個人利用" ? 20000 : 40000;

    if (
      !formData.name ||
      !formData.nameKana ||
      !formData.email ||
      !date ||
      !selectedSlot ||
      !formData.termsAgreed ||
      !formData.usageType
    ) {
      alert("必須項目をすべて入力してください。");
      return;
    }
    setLoading(true);
    setMessage("処理中....");

    if (!selectedSlotInfo) {
      alert("予約枠が選択されていません。");
      return;
    }

    const { error } = await supabase.rpc("register_customer_and_reservation", {
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
      _studio_name: "Grista", //TODO 固定？
      _usage_type: formData.usageType,
      _price: price,
      _notes: formData.notes,
      _participants: formData.participants
        ? parseInt(formData.participants, 10) || null
        : null,
      _parking_required: formData.parkingRequired,
      _shooting_details: formData.shootingDetails,
      _receipt_required: formData.receiptRequired,
      _terms_agreed: true,
      _status: "pending", //固定
    });

    if (error) {
      console.error("予約登録エラー:", error);
      alert("予約の登録に失敗しました。");
    } else {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
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
        //今日の日付に戻す
        fetchReservations();
        handleDateSelect(new Date());
      }
      alert("予約が完了しました。");
    }
  };

  return (
    <div>
      <div className="inner flex flex-col items-center pb-10 ">
        <h1 className="text-2xl font-bold mb-4">スタジオ予約</h1>
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
                        ${
                          slot.status === "pending"
                            ? "bg-yellow-300"
                            : "bg-red-300"
                        }`}
                      title={`${slot.start}～${slot.end} ${
                        slot.status === "pending" ? "仮予約" : "予約済"
                      }`}
                    >
                      {slot.start}～{slot.end}{" "}
                      {slot.status === "pending" ? "仮予約" : "予約済"}
                    </span>
                  ))
                ) : (
                  <span className="px-1 text-xs rounded">-</span>
                )}
              </div>
            );
          }}
        />
        {loading && <div>ローディング...</div>}
        {date && (
          <div className="mt-4">
            <h3 className="text-lg text-center font-semibold mb-2">ご予約日</h3>
            <p className="text-center">{formattedDate}</p>
            <h3 className="text-lg text-center font-semibold my-5">
              予約時間を選択
            </h3>
            {availableSlots.length > 0 ? (
              <div className="flex gap-2">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    className={`px-2 py-2 border rounded ${
                      selectedSlot === slot
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200"
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
        <form>
          <div className="mt-6 w-full p-4 border rounded">
            {/* 顧客情報 */}
            <div>
              <label className="inline-flex items-center mt-2">
                {/* validata:50文字以内 */}
                顧客名　
                <span className="text-xs border border-red-500 px-1 text-red-500">
                  必須
                </span>
              </label>
              <input
                type="text"
                {...register("name")}
                name="name"
                value={formData.name}
                onChange={handleInputChange} // onChangeで入力値を管理
                // onBlur={() => trigger("name")} // onBlurでバリデーションを実行
                className="w-full p-2 border rounded"
              />
              {errors.name && (
                <span className="text-red-500">{errors.name.message}</span>
              )}
            </div>

            <div>
              <label className="inline-flex items-center mt-2">
                {/* validata:100文字以内 */}
                フリガナ　
                <span className="text-xs border border-red-500 px-1 text-red-500">
                  必須
                </span>
              </label>
              <input
                type="text"
                {...register("nameKana")}
                name="nameKana"
                value={formData.nameKana}
                onChange={handleInputChange} // onChangeで入力値を管理
                className="w-full p-2 border rounded"
              />
              {errors.nameKana && (
                <span className="text-red-500">{errors.nameKana.message}</span>
              )}
            </div>

            <div>
              {/* validata:ハイフンなし、半角数字のみ */}
              <label className="block mt-2">電話番号</label>
              <input
                type="tel"
                {...register("phone")}
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              {errors.phone && (
                <span className="text-red-500">{errors.phone.message}</span>
              )}
            </div>

            <div>
              {/* validata:メールアドレスのみ */}
              <label className="inline-flex items-center mt-2">
                メール　
                <span className="text-xs border border-red-500 px-1 text-red-500">
                  必須
                </span>
              </label>
              <input
                type="email"
                {...register("email")}
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              {errors.email && (
                <span className="text-red-500">{errors.email.message}</span>
              )}
            </div>

            <div>
              {/* validata:100文字以内 */}
              <label className="block mt-2">会社名</label>
              <input
                type="text"
                {...register("company")}
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              {errors.company && (
                <span className="text-red-500">{errors.company.message}</span>
              )}
            </div>

            <div>
              {/* validata:100文字以内 */}
              <label className="block mt-2">XのID</label>
              <input
                type="text"
                {...register("xId")}
                name="xId"
                value={formData.xId}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              {errors.xId && (
                <span className="text-red-500">{errors.xId.message}</span>
              )}
            </div>

            <div>
              {/* validata:100文字以内 */}
              <label className="block mt-2">Xのハンドル名</label>
              <input
                type="text"
                {...register("xHandle")}
                name="xHandle"
                value={formData.xHandle}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
              />
              {errors.xHandle && (
                <span className="text-red-500">{errors.xHandle.message}</span>
              )}
            </div>

            <div>
              <label className="inline-flex items-center mt-4">
                利用用途　
                <span className="text-xs border border-red-500 px-1 text-red-500">
                  必須
                </span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center pl-4">
                  <input
                    type="checkbox"
                    name="usageType"
                    value="個人利用"
                    checked={formData.usageType === "個人利用"}
                    onChange={() =>
                      setFormData({ ...formData, usageType: "個人利用" })
                    }
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
                    onChange={() =>
                      setFormData({ ...formData, usageType: "商用利用" })
                    }
                    className="mr-2"
                  />
                  商用利用
                </label>
              </div>
            </div>

            {/* validata:200文字以内 */}
            <div>
              <label className="block mt-2">備考</label>
              <textarea
                {...register("notes")}
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                rows={3}
              />
              {errors.notes && (
                <span className="text-red-500">{errors.notes.message}</span>
              )}
            </div>

            {/* validata:半角数字のみ */}
            <div>
              <label className="block mt-2">参加人数</label>
              <input
                type="number"
                {...register("participants")}
                name="participants"
                value={formData.participants}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setFormData((prev) => ({
                    ...prev,
                    participants: value < 0 ? "0" : e.target.value,
                  }));
                }}
                className="w-full p-2 border rounded"
              />
              {errors.participants && (
                <span className="text-red-500">
                  {errors.participants.message}
                </span>
              )}
            </div>

            {/* validata:200文字以内 */}
            <div>
              <label className="block mt-2">撮影内容</label>
              <textarea
                {...register("shootingDetails")}
                name="shootingDetails"
                value={formData.shootingDetails}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                rows={3}
              />
              {errors.shootingDetails && (
                <span className="text-red-500">
                  {errors.shootingDetails.message}
                </span>
              )}
            </div>

            {/* チェックボックス */}
            <div className="mt-4 flex items-center">
              <input
                id="parkingRequired"
                type="checkbox"
                name="parkingRequired"
                checked={formData.parkingRequired}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="parkingRequired" className="ml-2">
                駐車場を利用する
              </label>
            </div>

            <div className="mt-4 flex items-center">
              <input
                id="receiptRequired"
                type="checkbox"
                name="receiptRequired"
                checked={formData.receiptRequired}
                onChange={handleCheckboxChange}
              />
              <label htmlFor="receiptRequired" className="ml-2">
                領収書が必要
              </label>
            </div>

            <div className="mt-4 flex items-center">
              <input
                id="termsAgreed"
                type="checkbox"
                name="termsAgreed"
                checked={formData.termsAgreed}
                onChange={handleCheckboxChange}
              />
              <label
                htmlFor="termsAgreed"
                className="inline-flex items-center ml-2"
              >
                利用規約に同意する　
                <span className="text-xs border border-red-500 px-1 text-red-500">
                  必須
                </span>
              </label>
            </div>

            <button
              className="w-full mt-6 bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
              onClick={handleReservation}
            >
              仮予約する
            </button>
            <div className="loading-area text-center">
              {message && (
                <div className="mt-4 text-center text-red-500">{message}</div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
