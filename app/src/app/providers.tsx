"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefaktorProvider } from "@refaktor/sdk/react";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";
import { INDEXER_URL } from "@/lib/deployment";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 2_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={qc}>
        <RefaktorProvider indexerUrl={INDEXER_URL}>{children}</RefaktorProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
