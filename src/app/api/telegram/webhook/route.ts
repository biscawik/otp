import { NextRequest, NextResponse } from "next/server";
import { getBot } from "@/lib/bot";
import { webhookCallback } from "grammy";

export const dynamic = "force-dynamic";

let handler: ((req: Request) => Promise<Response>) | null = null;

function getHandler() {
  if (!handler) {
    const bot = getBot();
    handler = webhookCallback(bot, "std/http");
  }
  return handler;
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (expected && secret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const h = getHandler();
    return h(req);
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
