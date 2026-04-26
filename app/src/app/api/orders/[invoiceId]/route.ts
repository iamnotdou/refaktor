import { NextResponse } from "next/server";
import { addOrder, listBook } from "@/lib/orderbook";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await ctx.params;
  return NextResponse.json(listBook(invoiceId));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await ctx.params;
  const body = (await req.json()) as {
    side: "bid" | "ask";
    maker: string;
    qty: string;
    pricePerShare: string;
    primary?: boolean;
  };
  if (body.side !== "bid" && body.side !== "ask") {
    return NextResponse.json({ error: "bad side" }, { status: 400 });
  }
  if (!body.maker || !body.qty || !body.pricePerShare) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }
  const order = addOrder({
    invoiceId,
    side: body.side,
    maker: body.maker,
    qty: body.qty,
    pricePerShare: body.pricePerShare,
    primary: body.primary,
  });
  return NextResponse.json(order);
}
