import { formatUnits } from "viem";

const USDC_DECIMALS = 6;

export function fmtUsdc(value: bigint | string | number, dp = 2): string {
  const v =
    typeof value === "bigint" ? value : BigInt(value as string | number);
  const s = formatUnits(v, USDC_DECIMALS);
  const [int, dec = ""] = s.split(".");
  return `${withCommas(int)}.${(dec + "0".repeat(dp)).slice(0, dp)}`;
}

export function fmtPrice(value: bigint | null | undefined): string {
  if (value == null) return "—";
  return fmtUsdc(value, 4);
}

export function shortAddr(addr?: string | null): string {
  if (!addr) return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function withCommas(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function daysFromUnix(unix: bigint | number | string): number {
  const ts = Number(unix);
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.round((ts - now) / 86400));
}

export function annualizedYield(
  faceValue: bigint,
  pricePerShare: bigint | null,
  totalShares: bigint,
  daysToMaturity: number
): number | null {
  if (!pricePerShare || pricePerShare === 0n || daysToMaturity <= 0) return null;
  const facePerShare = Number(faceValue) / Number(totalShares);
  const price = Number(pricePerShare);
  const ratio = facePerShare / price - 1;
  return ratio * (365 / daysToMaturity);
}
