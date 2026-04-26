import deployment from "./deployment.json";
import { loadDeployment, type SupportedChainId } from "@refaktor/sdk";

export const CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? 84532
) as SupportedChainId;

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org";

export const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:8080/v1/graphql";

export const DEPLOYMENT = deployment;

export const ADDRESSES = loadDeployment(CHAIN_ID, deployment);
