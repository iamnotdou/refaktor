import { http, createConfig } from "wagmi";
import { baseSepolia, hardhat } from "wagmi/chains";
import { injected, metaMask } from "wagmi/connectors";
import { CHAIN_ID, RPC_URL } from "./deployment";

const chain = CHAIN_ID === 31337 ? hardhat : baseSepolia;

export const wagmiConfig =
  chain.id === baseSepolia.id
    ? createConfig({
        chains: [baseSepolia],
        connectors: [injected({ shimDisconnect: true }), metaMask()],
        transports: { [baseSepolia.id]: http(RPC_URL) },
        ssr: true,
      })
    : createConfig({
        chains: [hardhat],
        connectors: [injected({ shimDisconnect: true }), metaMask()],
        transports: { [hardhat.id]: http(RPC_URL) },
        ssr: true,
      });

export const ACTIVE_CHAIN = chain;
