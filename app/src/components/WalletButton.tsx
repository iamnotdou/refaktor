"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { ACTIVE_CHAIN } from "@/lib/wagmi";
import { shortAddr } from "@/lib/format";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    const c = connectors[0];
    return (
      <button
        onClick={() => c && connect({ connector: c })}
        disabled={isPending}
        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== ACTIVE_CHAIN.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
        disabled={switching}
        className="px-4 py-2 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
      >
        {switching ? "Switching…" : `Switch to ${ACTIVE_CHAIN.name}`}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
        {shortAddr(address)}
      </span>
      <button
        onClick={() => disconnect()}
        className="px-3 py-1.5 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        Disconnect
      </button>
    </div>
  );
}
