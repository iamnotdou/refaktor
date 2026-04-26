"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { decodeEventLog, parseAbiItem } from "viem";
import { InvoiceSharesAbi, parseUsdc } from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();

  const [faceValue, setFaceValue] = useState("50000");
  const [days, setDays] = useState("90");
  const [totalShares, setTotalShares] = useState("500");
  const [buyerName, setBuyerName] = useState("Lidl GmbH");
  const [currency, setCurrency] = useState("EUR");
  const [rating, setRating] = useState<0 | 1 | 2 | 3>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!address) return;
    setBusy(true);
    setErr(null);
    try {
      const dueDate = BigInt(Math.floor(Date.now() / 1000) + Number(days) * 86400);
      const hash = await writeContractAsync({
        address: ADDRESSES.invoiceShares,
        abi: InvoiceSharesAbi,
        functionName: "mintInvoice",
        args: [
          address,
          parseUsdc(faceValue),
          dueDate,
          BigInt(totalShares),
          buyerName,
          currency,
          rating,
        ],
      });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });

      // Parse the InvoiceMinted event for the new id
      const evt = parseAbiItem(
        "event InvoiceMinted(uint256 indexed invoiceId, address indexed seller, uint256 faceValue, uint256 totalShares)"
      );
      let newId: bigint | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== ADDRESSES.invoiceShares.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: [evt],
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "InvoiceMinted") {
            newId = (decoded.args as { invoiceId: bigint }).invoiceId;
            break;
          }
        } catch {}
      }

      router.push(newId ? `/invoice/${newId.toString()}` : "/marketplace");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Mint Invoice</h1>
      <p className="text-sm text-zinc-500 mb-6">
        Bağlı cüzdan <code>VERIFIER_ROLE</code> sahibi olmalı (deployer wallet:{" "}
        <code className="text-xs">0x46E6…F1B</code>).
      </p>

      {!isConnected ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm">
          Önce wallet bağla.
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <Field label="Buyer name (off-chain alıcı)">
            <input
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              className="input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Face value (USDC)">
              <input
                value={faceValue}
                onChange={e => setFaceValue(e.target.value)}
                className="input font-mono"
              />
            </Field>
            <Field label="Currency">
              <input
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Total shares">
              <input
                value={totalShares}
                onChange={e => setTotalShares(e.target.value)}
                className="input font-mono"
              />
            </Field>
            <Field label="Days to maturity">
              <input
                value={days}
                onChange={e => setDays(e.target.value)}
                className="input font-mono"
              />
            </Field>
            <Field label="Rating">
              <select
                value={rating}
                onChange={e => setRating(Number(e.target.value) as 0 | 1 | 2 | 3)}
                className="input"
              >
                <option value={0}>A</option>
                <option value={1}>B</option>
                <option value={2}>C</option>
                <option value={3}>D</option>
              </select>
            </Field>
          </div>

          {err ? (
            <div className="rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-xs text-red-800 dark:text-red-300">
              {err}
            </div>
          ) : null}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Minting…" : "Mint Invoice"}
          </button>
        </div>
      )}

      <style jsx>{`
        :global(.input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid rgb(212 212 216);
          background: transparent;
          font-size: 0.875rem;
        }
        :global(.dark .input) {
          border-color: rgb(63 63 70);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs text-zinc-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
