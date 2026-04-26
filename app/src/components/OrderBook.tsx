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
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Forms
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
  }, [invoiceId]);

  const flash = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const placeBid = async () => {
    if (!address) return flash("err", "Wallet bağla");
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
      flash("ok", "Bid emri eklendi");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const placeAsk = async () => {
    if (!address) return flash("err", "Wallet bağla");
    setBusy("ask");
    try {
      // Approve OrderBook to move ERC-1155 shares
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
      flash("ok", "Ask emri eklendi");
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const takeAsk = async (ask: Order) => {
    if (!address) return flash("err", "Wallet bağla");
    setBusy(ask.id);
    try {
      const qty = BigInt(ask.qty);
      const price = BigInt(ask.pricePerShare);
      const cost = qty * price;

      // Ensure USDC approval to OrderBook
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
      flash("ok", `Trade settled: ${data.txHash.slice(0, 10)}…`);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const takeBid = async (bid: Order) => {
    if (!address) return flash("err", "Wallet bağla");
    setBusy(bid.id);
    try {
      // Seller (current user) approves shares
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
      flash("ok", `Filled bid: ${data.txHash.slice(0, 10)}…`);
    } catch (e) {
      flash("err", (e as Error).message);
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
      {msg ? (
        <div
          className={`rounded-md px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BIDS */}
        <Side
          title="Bids (alış)"
          color="emerald"
          rows={book.bids}
          onCancel={cancel}
          onTake={takeBid}
          takeLabel="Sat"
          isMine={a => !!address && a.toLowerCase() === address.toLowerCase()}
          busy={busy}
        />
        {/* ASKS */}
        <Side
          title="Asks (satış)"
          color="rose"
          rows={book.asks}
          onCancel={cancel}
          onTake={takeAsk}
          takeLabel="Al"
          isMine={a => !!address && a.toLowerCase() === address.toLowerCase()}
          busy={busy}
        />
      </div>

      {/* PLACE FORMS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <FormCard color="emerald" title="Bid yerleştir">
          <NumberField label="Price (USDC)" value={bidPrice} onChange={setBidPrice} />
          <NumberField label="Qty (shares)" value={bidQty} onChange={setBidQty} />
          <button
            onClick={placeBid}
            disabled={busy === "bid"}
            className="w-full mt-1 px-3 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy === "bid" ? "…" : "Place Bid"}
          </button>
        </FormCard>
        <FormCard color="rose" title="Ask yerleştir">
          <NumberField label="Price (USDC)" value={askPrice} onChange={setAskPrice} />
          <NumberField label="Qty (shares)" value={askQty} onChange={setAskQty} />
          <button
            onClick={placeAsk}
            disabled={busy === "ask"}
            className="w-full mt-1 px-3 py-2 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
          >
            {busy === "ask" ? "…" : "Place Ask"}
          </button>
        </FormCard>
      </div>
    </div>
  );
}

function Side({
  title,
  color,
  rows,
  onCancel,
  onTake,
  takeLabel,
  isMine,
  busy,
}: {
  title: string;
  color: "emerald" | "rose";
  rows: Order[];
  onCancel: (o: Order) => void;
  onTake: (o: Order) => void;
  takeLabel: string;
  isMine: (a: string) => boolean;
  busy: string | null;
}) {
  const headerCls =
    color === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div className={`px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 text-sm font-medium ${headerCls}`}>
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="text-left px-4 py-2 font-normal">Price</th>
            <th className="text-left px-4 py-2 font-normal">Qty</th>
            <th className="text-left px-4 py-2 font-normal">Maker</th>
            <th className="text-right px-4 py-2 font-normal">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-zinc-500 text-xs">
                no orders
              </td>
            </tr>
          ) : (
            rows.map(o => {
              const mine = isMine(o.maker);
              return (
                <tr key={o.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2 font-mono">{fmtPrice(BigInt(o.pricePerShare))}</td>
                  <td className="px-4 py-2 font-mono">{o.qty}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                    {shortAddr(o.maker)}
                    {o.primary ? <span className="ml-1 text-blue-500">·primary</span> : null}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {mine ? (
                      <button
                        onClick={() => onCancel(o)}
                        disabled={busy === o.id}
                        className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        Cancel
                      </button>
                    ) : (
                      <button
                        onClick={() => onTake(o)}
                        disabled={busy === o.id}
                        className={`text-xs px-2 py-1 rounded font-medium text-white disabled:opacity-50 ${
                          color === "emerald" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                        }`}
                      >
                        {busy === o.id ? "…" : takeLabel}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="text-zinc-500">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent font-mono"
      />
    </label>
  );
}

function FormCard({
  color,
  title,
  children,
}: {
  color: "emerald" | "rose";
  title: string;
  children: React.ReactNode;
}) {
  const headerCls =
    color === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-700 dark:text-rose-400";
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-3">
      <div className={`text-sm font-medium ${headerCls}`}>{title}</div>
      {children}
    </div>
  );
}
