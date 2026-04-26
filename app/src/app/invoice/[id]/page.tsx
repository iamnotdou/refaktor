"use client";

import { use } from "react";
import { useReadContract } from "wagmi";
import { useInvoice, useTrades } from "@refaktor/sdk/react";
import { InvoiceSharesAbi, RATING_LABELS } from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";
import { OrderBookPanel } from "@/components/OrderBook";
import { fmtUsdc, fmtPrice, shortAddr, daysFromUnix } from "@/lib/format";
import type { Address } from "viem";

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
      <div>
        <div className="text-xs text-zinc-500">Invoice</div>
        <h1 className="text-3xl font-semibold tracking-tight">
          #{id}{" "}
          {meta ? (
            <span className="text-zinc-400 text-base">
              · {meta.buyerName} · {meta.currency}
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
        <Stat
          label="Days to maturity"
          value={meta ? `${days} d` : "…"}
        />
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
        <section>
          <h2 className="text-lg font-medium mb-3">Order book</h2>
          <OrderBookPanel invoiceId={id} originalSeller={meta.originalSeller} />
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-medium mb-3">Recent trades</h2>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-950/40">
              <tr>
                <th className="text-left px-4 py-2 font-normal">When</th>
                <th className="text-left px-4 py-2 font-normal">Type</th>
                <th className="text-left px-4 py-2 font-normal">Qty</th>
                <th className="text-left px-4 py-2 font-normal">Price</th>
                <th className="text-left px-4 py-2 font-normal">Seller → Buyer</th>
                <th className="text-left px-4 py-2 font-normal">Tx</th>
              </tr>
            </thead>
            <tbody>
              {!trades || trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    no trades yet
                  </td>
                </tr>
              ) : (
                trades.map(t => (
                  <tr key={t.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {new Date(Number(t.timestamp) * 1000).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          t.primary
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {t.primary ? "primary" : "secondary"}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono">{t.qty.toString()}</td>
                    <td className="px-4 py-2 font-mono">{fmtPrice(t.pricePerShare)}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {shortAddr(t.seller)} → {shortAddr(t.buyer)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <a
                        href={`https://sepolia.basescan.org/tx/${t.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {t.txHash.slice(0, 10)}…
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono text-sm mt-0.5">{value}</div>
    </div>
  );
}
