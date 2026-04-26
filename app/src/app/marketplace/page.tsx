"use client";

import Link from "next/link";
import { useMarketplace } from "@refaktor/sdk/react";
import type { InvoiceFromIndexer } from "@refaktor/sdk";
import { fmtUsdc, fmtPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function MarketplacePage() {
  const { data, isLoading, error } = useMarketplace({ status: "Listed" });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aktif tokenize faturalar — indexer’dan canlı veri.
          </p>
        </div>
      </div>

      {error ? (
        <Card size="sm" className="mb-6 ring-destructive/40 bg-destructive/5">
          <CardContent className="text-sm text-destructive">
            Indexer’a ulaşılamadı: {(error as Error).message}.
            NEXT_PUBLIC_INDEXER_URL ayarlandığından ve Hasura’nın 8080’de
            çalıştığından emin ol.
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="text-muted-foreground">Yükleniyor…</div>
      ) : !data || data.length === 0 ? (
        <Card className="border-dashed ring-dashed">
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">
              Henüz listelenmiş fatura yok.
            </p>
            <Button asChild>
              <Link href="/upload">İlk faturayı mint et</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((inv) => (
            <InvoiceCard key={inv.id} inv={inv} />
          ))}
        </div>
      )}
    </div>
  );
}

function InvoiceCard({ inv }: { inv: InvoiceFromIndexer }) {
  const remaining = inv.totalShares - inv.filledShares;
  const fillPct =
    Number((inv.filledShares * 10000n) / (inv.totalShares || 1n)) / 100;
  return (
    <Link href={`/invoice/${inv.invoiceId}`} className="group block">
      <Card
        size="sm"
        className="transition hover:ring-2 hover:ring-primary/40 group-hover:-translate-y-0.5"
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge>#{inv.invoiceId.toString()}</Badge>
            <Badge variant="outline">{inv.status}</Badge>
          </div>
          <CardTitle className="font-mono text-base">
            {fmtUsdc(inv.faceValue)} USDC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <Row k="Total shares" v={inv.totalShares.toString()} />
          <Row k="Remaining" v={remaining.toString()} />
          <Row
            k="Primary VWAP"
            v={
              inv.primaryVwap ? `${fmtPrice(inv.primaryVwap)} USDC` : "—"
            }
          />
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-1.5">
          <Progress value={Math.min(100, fillPct)} className="h-1.5" />
          <div className="text-[11px] text-muted-foreground">
            {fillPct.toFixed(1)}% filled
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}
