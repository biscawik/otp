import { NextResponse } from "next/server";
import { getProfile } from "@/lib/fivesim";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getProfile();
    return NextResponse.json({
      balance: profile.balance,
      email: profile.email,
      rating: profile.rating,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
