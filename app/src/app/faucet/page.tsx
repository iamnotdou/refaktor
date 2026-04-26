"use client";

import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import type { Address } from "viem";
import { isAddress } from "viem";
import { MockUSDCAbi, parseUsdc } from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";
import { fmtUsdc } from "@/lib/format";

export default function FaucetPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("10000");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const target = (recipient.trim() || address || "") as string;
  const targetValid = isAddress(target);

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: ADDRESSES.usdc,
    abi: MockUSDCAbi,
    functionName: "balanceOf",
    args: targetValid ? [target as Address] : undefined,
    query: { enabled: targetValid, refetchInterval: 5_000 },
  });

  const flash = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 6000);
  };

  const mint = async () => {
    if (!targetValid) return flash("err", "Geçerli adres gir");
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.usdc,
        abi: MockUSDCAbi,
        functionName: "mint",
        args: [target as Address, parseUsdc(amount)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      await refetchBalance();
      flash("ok", `Minted ${amount} USDC → ${target.slice(0, 10)}…`);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Faucet</h1>
        <p className="text-sm text-zinc-500 mt-1">
          MockUSDC.mint herkese açık — herhangi bir cüzdana test USDC bas.
        </p>
        <p className="text-[11px] text-zinc-500 mt-1 font-mono">
          USDC: {ADDRESSES.usdc}
        </p>
      </div>

      {!isConnected ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm">
          Önce wallet bağla (mint çağrısının gas’ı için).
        </div>
      ) : (
        <>
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

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
            <label className="block">
              <span className="text-xs text-zinc-500">Recipient</span>
              <input
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                placeholder={address ?? "0x…"}
                className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent font-mono text-sm"
              />
              <span className="block mt-1 text-[11px] text-zinc-500">
                Boş bırakırsan bağlı cüzdana mint eder.
              </span>
            </label>

            <div className="grid grid-cols-3 gap-2">
              {["1000", "10000", "100000"].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`px-3 py-2 rounded-md text-sm border ${
                    amount === v
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                      : "border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {Number(v).toLocaleString()} USDC
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-xs text-zinc-500">Custom amount (USDC)</span>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent font-mono text-sm"
              />
            </label>

            <button
              onClick={mint}
              disabled={busy || !targetValid}
              className="w-full px-4 py-2.5 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? "Minting…" : `Mint ${Number(amount || 0).toLocaleString()} USDC`}
            </button>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Balance for {targetValid ? `${target.slice(0, 6)}…${target.slice(-4)}` : "—"}</span>
                <span className="font-mono">
                  {balance !== undefined ? `${fmtUsdc(balance as bigint)} USDC` : "…"}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
