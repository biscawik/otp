import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, numberOrders, topupTransactions } from "@/db/schema";
import { count, sum, eq, gte } from "drizzle-orm";

export const dynamic = "force-dynamic";

function checkAdmin(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [totalUsers] = await db.select({ count: count() }).from(users);
    const [totalOrders] = await db.select({ count: count() }).from(numberOrders);
    const [totalTopups] = await db
      .select({ count: count(), total: sum(topupTransactions.amount) })
      .from(topupTransactions)
      .where(eq(topupTransactions.status, "completed"));

    const [pendingOrders] = await db
      .select({ count: count() })
      .from(numberOrders)
      .where(eq(numberOrders.status, "PENDING"));

    const [pendingTopups] = await db
      .select({ count: count() })
      .from(topupTransactions)
      .where(eq(topupTransactions.status, "pending"));

    // Recent 24h activity
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [todayOrders] = await db
      .select({ count: count() })
      .from(numberOrders)
      .where(gte(numberOrders.createdAt, yesterday));

    const [todayTopups] = await db
      .select({ count: count(), total: sum(topupTransactions.amount) })
      .from(topupTransactions)
      .where(gte(topupTransactions.createdAt, yesterday));

    return NextResponse.json({
      totalUsers: totalUsers.count,
      totalOrders: totalOrders.count,
      totalTopupsCount: totalTopups.count,
      totalTopupsAmount: totalTopups.total ?? 0,
      pendingOrders: pendingOrders.count,
      pendingTopups: pendingTopups.count,
      todayOrders: todayOrders.count,
      todayTopupsCount: todayTopups.count,
      todayTopupsAmount: todayTopups.total ?? 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
