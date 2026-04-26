"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  InvoiceSharesAbi,
  MockUSDCAbi,
  parsePricePerShare,
} from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";
import { fmtPrice, shortAddr } from "@/lib/format";
import type { Address } from "viem";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  side: "bid" | "ask";
  maker: string;
  qty: string;
  pricePerShare: string;
  primary: boolean;
  createdAt: number;
};

type Book = { bids: Order[]; asks: Order[] };

type Props = {
  invoiceId: string;
  originalSeller: Address;
};

export function OrderBookPanel({ invoiceId, originalSeller }: Props) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [book, setBook] = useState<Book>({ bids: [], asks: [] });
  const [busy, setBusy] = useState<string | null>(null);

  const [bidPrice, setBidPrice] = useState("95");
  const [bidQty, setBidQty] = useState("10");
  const [askPrice, setAskPrice] = useState("95");
  const [askQty, setAskQty] = useState("10");

  const reload = async () => {
    const r = await fetch(`/api/orders/${invoiceId}`, { cache: "no-store" });
    setBook(await r.json());
  };

  useEffect(() => {
    reload();
    const t = setInterval(reload, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const placeBid = async () => {
    if (!address) return toast.error("Wallet bağla");
    setBusy("bid");
    try {
      await fetch(`/api/orders/${invoiceId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          side: "bid",
          maker: address,
          qty: bidQty,
          pricePerShare: parsePricePerShare(bidPrice).toString(),
        }),
      });
      await reload();
      toast.success("Bid emri eklendi");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const placeAsk = async () => {
    if (!address) return toast.error("Wallet bağla");
    setBusy("ask");
    try {
      const approved = (await publicClient!.readContract({
        address: ADDRESSES.invoiceShares,
        abi: InvoiceSharesAbi,
        functionName: "isApprovedForAll",
        args: [address, ADDRESSES.orderBook],
      })) as boolean;
      if (!approved) {
        const hash = await writeContractAsync({
          address: ADDRESSES.invoiceShares,
          abi: InvoiceSharesAbi,
          functionName: "setApprovalForAll",
          args: [ADDRESSES.orderBook, true],
        });
        await publicClient!.waitForTransactionReceipt({ hash });
      }
      const isPrimary = address.toLowerCase() === originalSeller.toLowerCase();
      await fetch(`/api/orders/${invoiceId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          side: "ask",
          maker: address,
          qty: askQty,
          pricePerShare: parsePricePerShare(askPrice).toString(),
          primary: isPrimary,
        }),
      });
      await reload();
      toast.success("Ask emri eklendi");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const takeAsk = async (ask: Order) => {
    if (!address) return toast.error("Wallet bağla");
    setBusy(ask.id);
    try {
      const qty = BigInt(ask.qty);
      const price = BigInt(ask.pricePerShare);
      const cost = qty * price;

      const allowance = (await publicClient!.readContract({
        address: ADDRESSES.usdc,
        abi: MockUSDCAbi,
        functionName: "allowance",
        args: [address, ADDRESSES.orderBook],
      })) as bigint;
      if (allowance < cost) {
        const hash = await writeContractAsync({
          address: ADDRESSES.usdc,
          abi: MockUSDCAbi,
          functionName: "approve",
          args: [ADDRESSES.orderBook, cost],
        });
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          seller: ask.maker,
          buyer: address,
          qty: ask.qty,
          pricePerShare: ask.pricePerShare,
          askOrderId: ask.id,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "match failed");
      await reload();
      toast.success(`Trade settled: ${data.txHash.slice(0, 10)}…`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const takeBid = async (bid: Order) => {
    if (!address) return toast.error("Wallet bağla");
    setBusy(bid.id);
    try {
      const approved = (await publicClient!.readContract({
        address: ADDRESSES.invoiceShares,
        abi: InvoiceSharesAbi,
        functionName: "isApprovedForAll",
        args: [address, ADDRESSES.orderBook],
      })) as boolean;
      if (!approved) {
        const hash = await writeContractAsync({
          address: ADDRESSES.invoiceShares,
          abi: InvoiceSharesAbi,
          functionName: "setApprovalForAll",
          args: [ADDRESSES.orderBook, true],
        });
        await publicClient!.waitForTransactionReceipt({ hash });
      }

      const r = await fetch("/api/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          seller: address,
          buyer: bid.maker,
          qty: bid.qty,
          pricePerShare: bid.pricePerShare,
          bidOrderId: bid.id,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "match failed");
      await reload();
      toast.success(`Filled bid: ${data.txHash.slice(0, 10)}…`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (o: Order) => {
    if (!address) return;
    setBusy(o.id);
    try {
      await fetch(`/api/orders/${invoiceId}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId: o.id, maker: address }),
      });
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Side
          title="Bids (alış)"
          tone="positive"
          rows={book.bids}
          onCancel={cancel}
          onTake={takeBid}
          takeLabel="Sat"
          isMine={(a) => !!address && a.toLowerCase() === address.toLowerCase()}
          busy={busy}
        />
        <Side
          title="Asks (satış)"
          tone="negative"
          rows={book.asks}
          onCancel={cancel}
          onTake={takeAsk}
          takeLabel="Al"
          isMine={(a) => !!address && a.toLowerCase() === address.toLowerCase()}
          busy={busy}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormCard tone="positive" title="Bid yerleştir">
          <NumberField
            id="bid-price"
            label="Price (USDC)"
            value={bidPrice}
            onChange={setBidPrice}
          />
          <NumberField
            id="bid-qty"
            label="Qty (shares)"
            value={bidQty}
            onChange={setBidQty}
          />
          <Button
            onClick={placeBid}
            disabled={busy === "bid"}
            className="w-full"
          >
            {busy === "bid" ? "…" : "Place Bid"}
          </Button>
        </FormCard>
        <FormCard tone="negative" title="Ask yerleştir">
          <NumberField
            id="ask-price"
            label="Price (USDC)"
            value={askPrice}
            onChange={setAskPrice}
          />
          <NumberField
            id="ask-qty"
            label="Qty (shares)"
            value={askQty}
            onChange={setAskQty}
          />
          <Button
            onClick={placeAsk}
            disabled={busy === "ask"}
            variant="outline"
            className="w-full"
          >
            {busy === "ask" ? "…" : "Place Ask"}
          </Button>
        </FormCard>
      </div>
    </div>
  );
}

function Side({
  title,
  tone,
  rows,
  onCancel,
  onTake,
  takeLabel,
  isMine,
  busy,
}: {
  title: string;
  tone: "positive" | "negative";
  rows: Order[];
  onCancel: (o: Order) => void;
  onTake: (o: Order) => void;
  takeLabel: string;
  isMine: (a: string) => boolean;
  busy: string | null;
}) {
  return (
    <Card size="sm" className="p-0">
      <CardHeader className="border-b py-3">
        <CardTitle
          className={cn(
            "text-sm",
            tone === "positive" ? "text-emerald-600" : "text-rose-600"
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Price</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Maker</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground text-xs py-6"
                >
                  no orders
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => {
                const mine = isMine(o.maker);
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono">
                      {fmtPrice(BigInt(o.pricePerShare))}
                    </TableCell>
                    <TableCell className="font-mono">{o.qty}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {shortAddr(o.maker)}
                      {o.primary ? (
                        <Badge variant="outline" className="ml-1.5">
                          primary
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {mine ? (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onCancel(o)}
                          disabled={busy === o.id}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          size="xs"
                          variant={tone === "positive" ? "default" : "outline"}
                          onClick={() => onTake(o)}
                          disabled={busy === o.id}
                        >
                          {busy === o.id ? "…" : takeLabel}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-mono"
      />
    </div>
  );
}

function FormCard({
  tone,
  title,
  children,
}: {
  tone: "positive" | "negative";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle
          className={cn(
            "text-sm",
            tone === "positive" ? "text-emerald-600" : "text-rose-600"
          )}
        >
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
