import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { adminSecret, webhookUrl } = body;

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
    }

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
    const url = webhookUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/telegram/webhook`;

    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          secret_token: secret,
          allowed_updates: ["message", "callback_query"],
        }),
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Set webhook error:", err);
    return NextResponse.json({ error: "Failed to set webhook" }, { status: 500 });
  }
}

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ error: "Bot token not configured" }, { status: 500 });
  }

  const res = await fetch(
    `https://api.telegram.org/bot${botToken}/getWebhookInfo`
  );
  const data = await res.json();
  return NextResponse.json(data);
}
