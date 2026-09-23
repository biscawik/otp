import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupTransactions, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { PakasirWebhookPayload } from "@/lib/pakasir";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: PakasirWebhookPayload = await req.json();
    console.log("Pakasir webhook received:", body);

    const { order_id, amount, status, project } = body;

    // Verify project matches
    if (project !== process.env.PAKASIR_PROJECT) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }

    if (status !== "completed") {
      return NextResponse.json({ ok: true, message: "Not completed yet" });
    }

    // Find transaction
    const [tx] = await db
      .select()
      .from(topupTransactions)
      .where(eq(topupTransactions.orderId, order_id))
      .limit(1);

    if (!tx) {
      console.error("Transaction not found:", order_id);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Verify amount matches
    if (tx.amount !== amount) {
      console.error(`Amount mismatch: expected ${tx.amount}, got ${amount}`);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Already processed
    if (tx.status === "completed") {
      return NextResponse.json({ ok: true, message: "Already processed" });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tx.userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update transaction status
    await db
      .update(topupTransactions)
      .set({
        status: "completed",
        completedAt: new Date(body.completed_at),
      })
      .where(eq(topupTransactions.id, tx.id));

    // Credit user balance
    const newBalance = user.balance + amount;
    await db
      .update(users)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    console.log(
      `Top-up success: user ${user.telegramId}, +${amount} IDR, new balance: ${newBalance}`
    );

    // Notify user via Telegram
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: user.telegramId,
            text:
              `✅ *Top Up Berhasil!*\n\n` +
              `💰 Nominal: *Rp ${amount.toLocaleString("id-ID")}*\n` +
              `💳 Saldo sekarang: *Rp ${newBalance.toLocaleString("id-ID")}*\n\n` +
              `Terima kasih telah melakukan top up! 🎉`,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (notifyErr) {
      console.error("Failed to notify user:", notifyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Payment webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
