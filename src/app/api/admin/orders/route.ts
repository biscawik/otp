import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { numberOrders, users } from "@/db/schema";
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

  const orders = await db
    .select({
      id: numberOrders.id,
      fivesimOrderId: numberOrders.fivesimOrderId,
      phone: numberOrders.phone,
      country: numberOrders.country,
      operator: numberOrders.operator,
      product: numberOrders.product,
      priceRub: numberOrders.priceRub,
      priceIdr: numberOrders.priceIdr,
      status: numberOrders.status,
      smsCode: numberOrders.smsCode,
      smsText: numberOrders.smsText,
      createdAt: numberOrders.createdAt,
      userId: numberOrders.userId,
      userTelegramId: users.telegramId,
      username: users.username,
      firstName: users.firstName,
    })
    .from(numberOrders)
    .leftJoin(users, eq(numberOrders.userId, users.id))
    .orderBy(desc(numberOrders.createdAt))
    .limit(100);

  return NextResponse.json(orders);
}
