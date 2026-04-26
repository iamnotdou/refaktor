"use client";

import Link from "next/link";
import { useMarketplace } from "@refaktor/sdk/react";
import type { InvoiceFromIndexer } from "@refaktor/sdk";
import { fmtUsdc, fmtPrice } from "@/lib/format";

export default function MarketplacePage() {
  const { data, isLoading, error } = useMarketplace({ status: "Listed" });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Aktif tokenize faturalar — indexer’dan canlı veri.
          </p>
        </div>
      </div>

      {error ? (
        <Banner kind="error">
          Indexer’a ulaşılamadı: {(error as Error).message}. NEXT_PUBLIC_INDEXER_URL
          ayarlandığından ve Hasura’nın 8080’de çalıştığından emin ol.
        </Banner>
      ) : null}

      {isLoading ? (
        <div className="text-zinc-500">Yükleniyor…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Henüz listelenmiş fatura yok.
          </p>
          <Link
            href="/upload"
            className="inline-block mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            İlk faturayı mint et
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(inv => (
            <InvoiceCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceCard({ inv }: { inv: InvoiceFromIndexer }) {
  const remaining = inv.totalShares - inv.filledShares;
  const fillPct = Number((inv.filledShares * 10000n) / (inv.totalShares || 1n)) / 100;
  return (
    <Link
      href={`/invoice/${inv.invoiceId}`}
      className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:border-blue-400 transition"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          #{inv.invoiceId.toString()}
        </span>
        <span className="text-xs text-zinc-500">{inv.status}</span>
      </div>
      <div className="space-y-1.5 text-sm">
        <Row k="Face value" v={`${fmtUsdc(inv.faceValue)} USDC`} />
        <Row k="Total shares" v={inv.totalShares.toString()} />
        <Row k="Remaining" v={remaining.toString()} />
        <Row k="Primary VWAP" v={inv.primaryVwap ? `${fmtPrice(inv.primaryVwap)} USDC` : "—"} />
      </div>
      <div className="mt-4">
        <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${Math.min(100, fillPct)}%` }}
          />
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">{fillPct.toFixed(1)}% filled</div>
      </div>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-zinc-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Banner({ kind, children }: { kind: "error" | "info"; children: React.ReactNode }) {
  const cls =
    kind === "error"
      ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-200"
      : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-200";
  return (
    <div className={`mb-6 rounded-md border px-4 py-3 text-sm ${cls}`}>{children}</div>
  );
}
