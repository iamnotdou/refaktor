import "server-only";
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, hardhat } from "viem/chains";
import { OrderBookAbi as OrderBookAbiSdk } from "@refaktor/sdk";
import { ADDRESSES, CHAIN_ID, RPC_URL } from "./deployment";

const OrderBookAbi = OrderBookAbiSdk as unknown as readonly unknown[];

const chain = CHAIN_ID === 31337 ? hardhat : baseSepolia;

// Use `any` to sidestep the dual-viem-instance types between the SDK bundle
// and the app. Runtime behaviour is unaffected.
let cached: { publicClient: any; walletClient: any } | null = null;

function getClients() {
  if (cached) return cached;
  const pk = process.env.MATCHER_PK;
  if (!pk) throw new Error("MATCHER_PK env var is not set");
  const account = privateKeyToAccount(
    (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`
  );
  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RPC_URL),
  });
  cached = { publicClient, walletClient };
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
  const { walletClient } = getClients();
  // Pass the wallet's LocalAccount through so viem signs locally and sends
  // via eth_sendRawTransaction. Passing just an address string would fall
  // back to eth_sendTransaction which public RPCs reject.
  return walletClient.writeContract({
    account: walletClient.account!,
    chain,
    address: ADDRESSES.orderBook,
    abi: OrderBookAbi,
    functionName: "executeMatch",
    args: [
      args.invoiceId,
      args.seller,
      args.buyer,
      args.qty,
      args.pricePerShare,
    ],
  });
}
