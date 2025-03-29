import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { formData } = await req.json();

    // Slack通知メッセージの作成
    const message = `📅 **新しい予約が入りました！**\n
    👤 **名前:** ${formData.name}\n
    🔤 **フリガナ:** ${formData.nameKana}\n
    📧 **メール:** ${formData.email}\n
    📱 **電話番号:** ${formData.phone}\n
    🏢 **会社名:** ${formData.company}\n
    🆔 **X ID:** ${formData.xId}\n
    🏠 **スタジオ名:** Grista\n
    🏢 **利用用途:** ${formData.usageType}\n
    💰 **価格:** ${formData.price}円\n
    📝 **備考:** ${formData.notes || "なし"}\n
    👥 **参加人数:** ${formData.participants || "未定"}\n
    🚗 **駐車場利用:** ${formData.parkingRequired ? "あり" : "なし"}\n
    🎥 **撮影詳細:** ${formData.shootingDetails || "なし"}\n
    🧾 **領収書:** ${formData.receiptRequired ? "必要" : "不要"}\n
    ✅ **利用規約同意:** ${formData.termsAgreed ? "同意済み" : "未同意"}\n
    🔄 **予約ステータス:** pending`;

    // Slackに通知
    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("通知エラー:", error);
    return NextResponse.json({ success: false, error: "通知に失敗しました" }, { status: 500 });
  }
}
