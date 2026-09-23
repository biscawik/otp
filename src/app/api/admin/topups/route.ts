import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { topupTransactions, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const txs = await db
    .select({
      id: topupTransactions.id,
      orderId: topupTransactions.orderId,
      amount: topupTransactions.amount,
      fee: topupTransactions.fee,
      totalPayment: topupTransactions.totalPayment,
      paymentMethod: topupTransactions.paymentMethod,
      status: topupTransactions.status,
      createdAt: topupTransactions.createdAt,
      completedAt: topupTransactions.completedAt,
      userId: topupTransactions.userId,
      userTelegramId: users.telegramId,
      username: users.username,
      firstName: users.firstName,
    })
    .from(topupTransactions)
    .leftJoin(users, eq(topupTransactions.userId, users.id))
    .orderBy(desc(topupTransactions.createdAt))
    .limit(100);

  return NextResponse.json(txs);
}
