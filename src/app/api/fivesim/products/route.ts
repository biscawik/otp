import { NextRequest, NextResponse } from "next/server";
import { getProducts, rubToIdr } from "@/lib/fivesim";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get("country") ?? "indonesia";
  const operator = searchParams.get("operator") ?? "any";

  try {
    const products = await getProducts(country, operator);

    // Filter only activation products and add IDR pricing
    const result = Object.entries(products)
      .filter(([, v]) => v.Category === "activation" && v.Qty > 0)
      .map(([name, data]) => ({
        name,
        qty: data.Qty,
        priceRub: data.Price,
        priceIdr: rubToIdr(data.Price),
      }))
      .sort((a, b) => a.priceIdr - b.priceIdr);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
