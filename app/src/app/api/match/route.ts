import { NextResponse } from "next/server";
import type { Address } from "viem";
import { applyFill } from "@/lib/orderbook";
import { executeMatch } from "@/lib/matcher";

export const runtime = "nodejs";

type Body = {
  invoiceId: string;
  seller: string;
  buyer: string;
  qty: string;
  pricePerShare: string;
  // optional: order id to apply a fill against
  bidOrderId?: string;
  askOrderId?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  if (!body.invoiceId || !body.seller || !body.buyer || !body.qty || !body.pricePerShare) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  try {
    const txHash = await executeMatch({
      invoiceId: BigInt(body.invoiceId),
      seller: body.seller as Address,
      buyer: body.buyer as Address,
      qty: BigInt(body.qty),
      pricePerShare: BigInt(body.pricePerShare),
    });

    const filled = BigInt(body.qty);
    if (body.bidOrderId) applyFill(body.invoiceId, body.bidOrderId, filled);
    if (body.askOrderId) applyFill(body.invoiceId, body.askOrderId, filled);

    return NextResponse.json({ txHash });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
