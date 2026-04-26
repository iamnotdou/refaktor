"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { keccak256, stringToBytes, type Address } from "viem";
import {
  EscrowAbi,
  InvoiceSharesAbi,
  MockUSDCAbi,
  parseUsdc,
} from "@refaktor/sdk";
import { ADDRESSES } from "@/lib/deployment";

const VERIFIER_ROLE = keccak256(stringToBytes("VERIFIER_ROLE"));

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [repayId, setRepayId] = useState("1");
  const [repayAmt, setRepayAmt] = useState("50000");
  const [defaultId, setDefaultId] = useState("1");
  const [verifierAddr, setVerifierAddr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const flash = (kind: "ok" | "err", text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 6000);
  };

  const repay = async () => {
    if (!address) return;
    setBusy("repay");
    try {
      const amt = parseUsdc(repayAmt);
      // Approve USDC to escrow
      const allowance = (await publicClient!.readContract({
        address: ADDRESSES.usdc,
        abi: MockUSDCAbi,
        functionName: "allowance",
        args: [address, ADDRESSES.escrow],
      })) as bigint;
      if (allowance < amt) {
        const h = await writeContractAsync({
          address: ADDRESSES.usdc,
          abi: MockUSDCAbi,
          functionName: "approve",
          args: [ADDRESSES.escrow, amt],
        });
        await publicClient!.waitForTransactionReceipt({ hash: h });
      }
      const hash = await writeContractAsync({
        address: ADDRESSES.escrow,
        abi: EscrowAbi,
        functionName: "repayInvoice",
        args: [BigInt(repayId), amt],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      flash("ok", `Repaid: ${hash.slice(0, 10)}…`);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const triggerDefault = async () => {
    setBusy("default");
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.escrow,
        abi: EscrowAbi,
        functionName: "triggerDefault",
        args: [BigInt(defaultId)],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      flash("ok", `Default triggered: ${hash.slice(0, 10)}…`);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const grantVerifier = async () => {
    setBusy("grant");
    try {
      const hash = await writeContractAsync({
        address: ADDRESSES.invoiceShares,
        abi: InvoiceSharesAbi,
        functionName: "grantRole",
        args: [VERIFIER_ROLE, verifierAddr as Address],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      flash("ok", `Verifier granted: ${hash.slice(0, 10)}…`);
    } catch (e) {
      flash("err", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Connected wallet must hold the relevant roles (admin / verifier / repayer).
        </p>
      </div>

      {!isConnected ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-4 text-sm">
          Önce wallet bağla.
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

          <Card title="Repay invoice" desc="Buyer pays — anyone can simulate by approving USDC.">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Invoice ID">
                <input value={repayId} onChange={e => setRepayId(e.target.value)} className="input font-mono" />
              </Field>
              <Field label="Amount (USDC)">
                <input value={repayAmt} onChange={e => setRepayAmt(e.target.value)} className="input font-mono" />
              </Field>
            </div>
            <button
              onClick={repay}
              disabled={busy === "repay"}
              className="px-4 py-2 rounded-md bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === "repay" ? "…" : "Repay"}
            </button>
          </Card>

          <Card title="Trigger default" desc="Only after dueDate + 7 day grace.">
            <Field label="Invoice ID">
              <input value={defaultId} onChange={e => setDefaultId(e.target.value)} className="input font-mono" />
            </Field>
            <button
              onClick={triggerDefault}
              disabled={busy === "default"}
              className="px-4 py-2 rounded-md bg-rose-600 text-white font-medium hover:bg-rose-700 disabled:opacity-50"
            >
              {busy === "default" ? "…" : "Trigger Default"}
            </button>
          </Card>

          <Card title="Grant VERIFIER_ROLE" desc="Allow another wallet to mint invoices.">
            <Field label="Wallet address">
              <input value={verifierAddr} onChange={e => setVerifierAddr(e.target.value)} className="input font-mono" placeholder="0x…" />
            </Field>
            <button
              onClick={grantVerifier}
              disabled={busy === "grant" || !verifierAddr.startsWith("0x")}
              className="px-4 py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy === "grant" ? "…" : "Grant"}
            </button>
          </Card>
        </>
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

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-xs text-zinc-500">{desc}</div>
      </div>
      {children}
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
