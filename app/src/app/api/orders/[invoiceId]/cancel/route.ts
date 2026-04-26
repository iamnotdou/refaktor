import { NextResponse } from "next/server";
import { cancelOrder } from "@/lib/orderbook";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await ctx.params;
  const { orderId, maker } = (await req.json()) as { orderId: string; maker: string };
  const ok = cancelOrder(invoiceId, orderId, maker);
  return NextResponse.json({ ok });
}
