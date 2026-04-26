"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { ACTIVE_CHAIN } from "@/lib/wagmi";
import { shortAddr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    const c = connectors[0];
    return (
      <Button
        size="sm"
        onClick={() => c && connect({ connector: c })}
        disabled={isPending}
      >
        {isPending ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  if (chainId !== ACTIVE_CHAIN.id) {
    return (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => switchChain({ chainId: ACTIVE_CHAIN.id })}
        disabled={switching}
      >
        {switching ? "Switching…" : `Switch to ${ACTIVE_CHAIN.name}`}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="font-mono">
        {shortAddr(address)}
      </Badge>
      <Button size="sm" variant="ghost" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  );
}
