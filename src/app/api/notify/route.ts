import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    const { name, email, date } = await req.json();

    // Slack通知
    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `📅 **新しい予約が入りました！**\n\n👤 **名前:** ${name}\n📧 **メール:** ${email}\n📆 **日付:** ${date}`,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("通知エラー:", error);
    return NextResponse.json({ success: false, error: "通知に失敗しました" }, { status: 500 });
  }
}
