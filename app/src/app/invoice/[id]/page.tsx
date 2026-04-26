"use client";

import { use } from "react";
import { useReadContract } from "wagmi";
import { useInvoice, useTrades } from "@refaktor/sdk/react";
import { InvoiceSharesAbi, RATING_LABELS } from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";
import { OrderBookPanel } from "@/components/OrderBook";
import { fmtUsdc, fmtPrice, shortAddr, daysFromUnix } from "@/lib/format";
import type { Address } from "viem";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const invoiceId = BigInt(id);

  const { data: indexed, isLoading: idxLoading } = useInvoice(invoiceId);
  const { data: trades } = useTrades(invoiceId);
  const { data: onchain } = useReadContract({
    address: ADDRESSES.invoiceShares,
    abi: InvoiceSharesAbi,
    functionName: "getInvoice",
    args: [invoiceId],
  });

  const meta = onchain as
    | {
        faceValue: bigint;
        dueDate: bigint;
        totalShares: bigint;
        originalSeller: Address;
        buyerName: string;
        currency: string;
        rating: number;
        status: number;
      }
    | undefined;

  const days = meta ? daysFromUnix(meta.dueDate) : 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Invoice</Badge>
          {meta ? (
            <Badge variant="secondary" className="font-mono">
              {meta.currency}
            </Badge>
          ) : null}
        </div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          #{id}
          {meta ? (
            <span className="text-muted-foreground text-base ml-2 font-normal">
              · {meta.buyerName}
            </span>
          ) : null}
        </h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Face value"
          value={meta ? `${fmtUsdc(meta.faceValue)} USDC` : "…"}
        />
        <Stat
          label="Total shares"
          value={meta ? meta.totalShares.toString() : "…"}
        />
        <Stat label="Days to maturity" value={meta ? `${days} d` : "…"} />
        <Stat
          label="Rating"
          value={meta ? RATING_LABELS[meta.rating as 0 | 1 | 2 | 3] : "…"}
        />
        <Stat
          label="Filled"
          value={
            indexed
              ? `${indexed.filledShares.toString()} / ${indexed.totalShares.toString()}`
              : idxLoading
                ? "…"
                : "0"
          }
        />
        <Stat
          label="Primary VWAP"
          value={
            indexed?.primaryVwap ? `${fmtPrice(indexed.primaryVwap)} USDC` : "—"
          }
        />
        <Stat
          label="Total repaid"
          value={indexed ? `${fmtUsdc(indexed.totalRepaid)} USDC` : "…"}
        />
        <Stat
          label="Original seller"
          value={meta ? shortAddr(meta.originalSeller) : "…"}
        />
      </div>

      {meta ? (
        <section className="space-y-3">
          <h2 className="font-heading text-lg font-medium">Order book</h2>
          <OrderBookPanel invoiceId={id} originalSeller={meta.originalSeller} />
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-medium">Recent trades</h2>
        <Card size="sm" className="p-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Seller → Buyer</TableHead>
                  <TableHead>Tx</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!trades || trades.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-6"
                    >
                      no trades yet
                    </TableCell>
                  </TableRow>
                ) : (
                  trades.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(Number(t.timestamp) * 1000).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.primary ? "default" : "secondary"}>
                          {t.primary ? "primary" : "secondary"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {t.qty.toString()}
                      </TableCell>
                      <TableCell className="font-mono">
                        {fmtPrice(t.pricePerShare)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {shortAddr(t.seller)} → {shortAddr(t.buyer)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <a
                          href={`https://sepolia.basescan.org/tx/${t.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {t.txHash.slice(0, 10)}…
                        </a>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="font-mono text-sm mt-0.5">{value}</div>
      </CardContent>
    </Card>
  );
}
