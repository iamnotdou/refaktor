import "server-only";

export type Side = "bid" | "ask";

export type Order = {
  id: string;
  invoiceId: string;
  side: Side;
  maker: string;          // wallet address
  qty: string;            // remaining qty as decimal string (uint256)
  pricePerShare: string;  // 6dp USDC as decimal string
  createdAt: number;      // unix ms
  primary: boolean;       // true if maker is the originalSeller (only meaningful for asks)
};

type Book = { bids: Order[]; asks: Order[] };

declare global {
  // eslint-disable-next-line no-var
  var __refaktorBook: Map<string, Book> | undefined;
}

const books: Map<string, Book> =
  globalThis.__refaktorBook ?? new Map<string, Book>();
globalThis.__refaktorBook = books;

function book(invoiceId: string): Book {
  let b = books.get(invoiceId);
  if (!b) {
    b = { bids: [], asks: [] };
    books.set(invoiceId, b);
  }
  return b;
}

export function listBook(invoiceId: string): Book {
  const b = book(invoiceId);
  return {
    bids: [...b.bids].sort((a, z) =>
      cmpDesc(a.pricePerShare, z.pricePerShare) || a.createdAt - z.createdAt
    ),
    asks: [...b.asks].sort((a, z) =>
      cmpAsc(a.pricePerShare, z.pricePerShare) || a.createdAt - z.createdAt
    ),
  };
}

export function listAllOrders(): Order[] {
  const all: Order[] = [];
  for (const b of books.values()) {
    all.push(...b.bids, ...b.asks);
  }
  return all;
}

export type AddOrderInput = {
  invoiceId: string;
  side: Side;
  maker: string;
  qty: string;
  pricePerShare: string;
  primary?: boolean;
};

export function addOrder(input: AddOrderInput): Order {
  const order: Order = {
    id: cryptoRandomId(),
    invoiceId: input.invoiceId,
    side: input.side,
    maker: input.maker.toLowerCase(),
    qty: input.qty,
    pricePerShare: input.pricePerShare,
    createdAt: Date.now(),
    primary: !!input.primary,
  };
  const b = book(input.invoiceId);
  if (order.side === "bid") b.bids.push(order);
  else b.asks.push(order);
  return order;
}

export function cancelOrder(invoiceId: string, orderId: string, maker: string): boolean {
  const b = book(invoiceId);
  const m = maker.toLowerCase();
  for (const list of [b.bids, b.asks]) {
    const idx = list.findIndex(o => o.id === orderId && o.maker === m);
    if (idx >= 0) {
      list.splice(idx, 1);
      return true;
    }
  }
  return false;
}

/** Reduce or remove an order after a fill. Returns updated order or null if removed. */
export function applyFill(invoiceId: string, orderId: string, filledQty: bigint): Order | null {
  const b = book(invoiceId);
  for (const list of [b.bids, b.asks]) {
    const o = list.find(x => x.id === orderId);
    if (!o) continue;
    const remaining = BigInt(o.qty) - filledQty;
    if (remaining <= 0n) {
      list.splice(list.indexOf(o), 1);
      return null;
    }
    o.qty = remaining.toString();
    return o;
  }
  return null;
}

export function bestAsk(invoiceId: string): Order | null {
  return listBook(invoiceId).asks[0] ?? null;
}

export function bestBid(invoiceId: string): Order | null {
  return listBook(invoiceId).bids[0] ?? null;
}

function cmpAsc(a: string, b: string): number {
  const av = BigInt(a), bv = BigInt(b);
  return av < bv ? -1 : av > bv ? 1 : 0;
}
function cmpDesc(a: string, b: string): number {
  return -cmpAsc(a, b);
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
