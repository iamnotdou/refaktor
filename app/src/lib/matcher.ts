import "server-only";
import { createPublicClient, createWalletClient, http, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, hardhat } from "viem/chains";
import { createRefaktorContracts } from "@refaktor/sdk";
import { ADDRESSES, CHAIN_ID, RPC_URL } from "./deployment";

const chain = CHAIN_ID === 31337 ? hardhat : baseSepolia;

let cached: ReturnType<typeof createRefaktorContracts> | null = null;

export function getMatcher() {
  if (cached) return cached;
  const pk = process.env.MATCHER_PK;
  if (!pk) throw new Error("MATCHER_PK env var is not set");
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
  );
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });
  cached = createRefaktorContracts({
    chainId: CHAIN_ID,
    // SDK ships its own viem types; cast through unknown.
    publicClient: publicClient as unknown as Parameters<typeof createRefaktorContracts>[0]["publicClient"],
    walletClient: walletClient as unknown as Parameters<typeof createRefaktorContracts>[0]["walletClient"],
    addresses: ADDRESSES,
  });
  return cached;
}

export type ExecuteMatchArgs = {
  invoiceId: bigint;
  seller: Address;
  buyer: Address;
  qty: bigint;
  pricePerShare: bigint;
};

export async function executeMatch(args: ExecuteMatchArgs): Promise<Hash> {
  return getMatcher().book.executeMatch(args);
}
