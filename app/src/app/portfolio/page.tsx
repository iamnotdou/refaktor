"use client";

import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { usePortfolio } from "@refaktor/sdk/react";
import { EscrowAbi, MockUSDCAbi } from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";
import { fmtUsdc } from "@/lib/format";
import { useState } from "react";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data, isLoading } = usePortfolio(address);
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const { data: usdcBal } = useReadContract({
    address: ADDRESSES.usdc,
    abi: MockUSDCAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const claim = async (invoiceId: string) => {
    setBusy(invoiceId);
    setMsg(null);
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.escrow,
        abi: EscrowAbi,
        functionName: "claim",
        args: [BigInt(invoiceId)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setMsg(`Claimed: ${hash.slice(0, 10)}…`);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Portfolio</h1>
          {address ? (
            <p className="text-xs text-zinc-500 font-mono mt-1">{address}</p>
          ) : null}
        </div>
        {isConnected ? (
          <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2">
            <div className="text-[11px] uppercase tracking-wider text-zinc-500">
              USDC balance
            </div>
            <div className="font-mono">
              {usdcBal !== undefined ? fmtUsdc(usdcBal as bigint) : "…"}
            </div>
          </div>
        ) : null}
      </div>

      {!isConnected ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm">
          Önce wallet bağla.
        </div>
      ) : isLoading ? (
        <div className="text-zinc-500">Yükleniyor…</div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">
            Henüz pozisyon yok.
          </p>
          <Link
            href="/marketplace"
            className="inline-block mt-4 px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Marketplace’i aç
          </Link>
        </div>
      ) : (
        <>
          {msg ? (
            <div className="mb-3 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-3 py-2 text-xs">
              {msg}
            </div>
          ) : null}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-950/40">
                <tr>
                  <th className="text-left px-4 py-2 font-normal">Invoice</th>
                  <th className="text-left px-4 py-2 font-normal">Balance</th>
                  <th className="text-left px-4 py-2 font-normal">Status</th>
                  <th className="text-left px-4 py-2 font-normal">Total repaid</th>
                  <th className="text-right px-4 py-2 font-normal">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map(h => {
                  const settled =
                    h.invoice.status === "Repaid" || h.invoice.status === "Defaulted";
                  return (
                    <tr key={h.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-2">
                        <Link
                          href={`/invoice/${h.invoice.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          #{h.invoice.id}
                        </Link>
                      </td>
                      <td className="px-4 py-2 font-mono">{h.balance.toString()}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            h.invoice.status === "Listed"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                              : h.invoice.status === "Repaid"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }`}
                        >
                          {h.invoice.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono">{fmtUsdc(h.invoice.totalRepaid)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => claim(h.invoice.id)}
                          disabled={!settled || busy === h.invoice.id}
                          className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40"
                          title={settled ? "Claim USDC" : "Wait for settlement"}
                        >
                          {busy === h.invoice.id ? "…" : "Claim"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
