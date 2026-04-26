# Refaktör

**Türk KOBİ ihracat faturalarını tokenize ederek global yatırımcılara açan Web3 faktöring protokolü.**

Refaktör; Türkiye'nin ihracatçı KOBİ'leriyle dünyanın her yerindeki yatırımcıları, açık ve şeffaf bir ikincil pazar üzerinden bir araya getirir. Vade beklemekten yorulmuş KOBİ aynı gün likiditeye ulaşır; yatırımcı kısa vadeli, USDC bazlı, gerçek dünyaya bağlı (RWA) bir getiri elde eder.

> **Bi-Thongo Web3 Hackathon — Biruni Teknopark, Nisan 2026** için geliştirilen MVP.
> Ağ: **Base Sepolia** · Stable: **MockUSDC** (6 decimals) · Tüm işlemler on-chain.

**Sunum:** [Refaktör Pitch Deck (Google Slides)](https://docs.google.com/presentation/d/e/2PACX-1vQtH8esDxs2epCd2cuRyMfgLd0H0_IBARKX0TKgSiVHohnUivwAptNr7EARClUBeegLoLvPe7gF-nBE/pub?start=true&loop=false&delayms=60000&slide=id.p4)

---

## İçindekiler

- [Sunum](#sunum)
- [Çözdüğü Problem](#çözdüğü-problem)
- [Protokol Nasıl Çalışır?](#protokol-nasıl-çalışır)
- [Canlı Dağıtım (Base Sepolia)](#canlı-dağıtım-base-sepolia)
- [Monorepo Yapısı](#monorepo-yapısı)
- [Smart Contract'lar](#smart-contractlar)
- [Kullanıcı Akışları](#kullanıcı-akışları)
- [Geliştirme Ortamı](#geliştirme-ortamı)
- [Teknoloji Yığını](#teknoloji-yığını)
- [Demo Senaryosu](#demo-senaryosu)

---

## Sunum

Hackathon pitch sunumu (Google Slides, otomatik yayın):

[**Refaktör — Pitch Deck**](https://docs.google.com/presentation/d/e/2PACX-1vQtH8esDxs2epCd2cuRyMfgLd0H0_IBARKX0TKgSiVHohnUivwAptNr7EARClUBeegLoLvPe7gF-nBE/pub?start=true&loop=false&delayms=60000&slide=id.p4)

---

## Çözdüğü Problem

**KOBİ tarafı:** İhracat faturasının vadesi 60–120 gün. Banka faktöringi pahalı, yavaş, teminat ister; özellikle küçük tutarlı faturalarda erişim neredeyse imkânsız. KOBİ "satış yaptım ama param yok" döngüsünde kalıyor.

**Yatırımcı tarafı:** RWA piyasasında çoğu ürün ya çok büyük ticket gerektiriyor ya da merkezî bir middleman'e güven istiyor. Kısa vadeli, parçalı, şeffaf alım-satım yapılabilen bir araç yok.

**Refaktör'ün cevabı:** Her fatura bir ERC-1155 token serisi olarak basılır (ör. 1 fatura = 1.000 share). Yatırımcılar parça parça alır, vadeden önce başkasına satabilir, vadede prorata USDC tahsilat alır. Default olursa sigorta havuzu prorata tazminat öder. Her şey on-chain ve halka açık order book üzerinden.

---

## Protokol Nasıl Çalışır?

```
┌────────────┐   1. fatura yükle      ┌──────────────────┐
│   KOBİ     │ ─────────────────────▶ │  InvoiceShares   │  ERC-1155
│ (issuer)   │      (mint shares)     │  (1 fatura =     │  her fatura
└────────────┘                        │   N share)       │  ayrı tokenId
      │                               └──────────────────┘
      │ 2. ask order
      ▼
┌────────────┐                        ┌──────────────────┐
│ OrderBook  │ ◀─── 3. bid order ──── │   Yatırımcı      │
│ (off-chain │                        │   (USDC ile)     │
│  → on-chain│                        └──────────────────┘
│  match)    │       4. matcher       
└────────────┘  ─────executeMatch────▶ Escrow + InsurancePool
      │                               (USDC akışı + %0.5 sigorta payı)
      │
      ▼ vade geldiğinde
┌────────────┐   5. repay (USDC)      ┌──────────────────┐
│   KOBİ     │ ─────────────────────▶ │     Escrow       │
└────────────┘                        │  (havuz dolar)   │
                                      └──────────────────┘
                                              │
                       6. claim (prorata)     │
┌────────────┐ ◀────────────────────────────  │
│ Yatırımcı  │   share oranınca USDC çek      │
└────────────┘                                ▼
                                       Default ise:
                                       InsurancePool
                                       prorata tazminat
```

**İki pazar paralel çalışır:**

- **Birincil pazar** — KOBİ ilk satışını yapar. Yatırımcı doğrudan KOBİ'den alır. İskonto = getiri.
- **İkincil pazar** — Vade dolmadan token sahibi başkasına satar. Vade yaklaştıkça fiyat 1.0'e yaklaşır → time-decay arbitrajı.

---

## Canlı Dağıtım (Base Sepolia)

| Kontrat            | Rol                                              | Adres |
|--------------------|--------------------------------------------------|-------|
| `MockUSDC`         | Test için 6-decimal stable                       | `0x551b3cF9b0BC6C602014380E25635700A9996606` |
| `InvoiceShares`    | ERC-1155 tokenize fatura                         | `0x35012A9419B87C87eb51a35F2266c98b14b3288c` |
| `InsurancePool`    | %0.5 trade fee birikimi + default tazminatı      | `0x3E150415133e769146DF546F4D2678307Fb11520` |
| `Escrow`           | KOBİ repayment + yatırımcı claim                 | `0x49Dd9c5d11c1fA8Ab3B40E51a283cA1550370b8D` |
| `OrderBook`        | Match yürütücü (matcher signer)                  | `0x448d5EC2eAF8EB85c99508B8Ed907cc61d906c79` |

**Chain ID:** `84532` · **Deployer / matcher / verifier / fee recipient:** `0x46E6278E23BB0DfcCb6Af022572CCc19B84dFF1B`

Tam dağıtım çıktısı: [`refaktor-sc/deployments/baseSepolia.json`](./refaktor-sc/deployments/baseSepolia.json)

---

## Monorepo Yapısı

`pnpm` workspaces. `docs/`, `refaktor-indexer/` ve `refaktor-sdk/` ayrı git repo'ları olarak submodule ile bağlıdır.

```
refaktor/
├── app/                  Next.js 16 + wagmi/viem — kullanıcı arayüzü
│   └── src/app/
│       ├── marketplace/  listed faturalar + mini orderbook
│       ├── upload/       KOBİ fatura mint formu
│       ├── invoice/[id]/ tek fatura detayı, trade history
│       ├── portfolio/    yatırımcı pozisyonları + claim
│       ├── faucet/       MockUSDC + ETH faucet
│       ├── admin/        verifier rolü için onay paneli
│       └── api/
│           ├── orders/   off-chain order defteri (mock backend)
│           └── match/    server-side matcher (private key burada)
│
├── refaktor-sc/          Hardhat — Solidity 0.8.x kontratlar
│   ├── contracts/        InvoiceShares, OrderBook, Escrow, InsurancePool, MockUSDC
│   ├── scripts/          deploy.ts, wireRoles.ts, verifyAll.ts
│   ├── test/             Refaktor.test.ts (unit), E2E.test.ts (full flow)
│   └── deployments/      Network başına JSON çıktı (sözleşme adresleri)
│
├── refaktor-sdk/         viem wrapper + indexer client + React hooks (submodule)
│   ├── src/contracts.ts  createRefaktorContracts() — write/read tek API
│   ├── src/indexer.ts    GraphQL client (graphql-request)
│   ├── src/react/        useMarketplace, usePortfolio, useInvoice ... TanStack Query
│   └── src/abi/          refaktor-sc/artifacts'tan otomatik senkronize
│
├── refaktor-indexer/     Envio HyperIndex (submodule)
│   ├── config.yaml       4 kontratın event'lerini izler
│   ├── schema.graphql    Invoice, Holder, Trade, RepaymentEvent, ProtocolStat ...
│   └── src/              Event handler'ları (TypeScript)
│
└── docs/                 Fumadocs — kavramsal & mimari dokümantasyon (submodule)
```

### Submodule kurulumu

```bash
git clone --recurse-submodules https://github.com/iamnotdou/refaktor.git
# veya zaten klonladıysan:
git submodule update --init --recursive
```

Submodule güncellemek için:

```bash
git submodule update --remote refaktor-sdk refaktor-indexer docs
git add refaktor-sdk refaktor-indexer docs && git commit -m "bump submodules"
```

---

## Smart Contract'lar

`refaktor-sc/contracts/` altında, OpenZeppelin v5 + AccessControl tabanlı.

### `InvoiceShares.sol` — ERC-1155 fatura
Her fatura için `tokenId = invoiceId`, `totalShares` adet token mintlenir. Status makinesi:

```
PendingVerification → Listed → Repaid
                       │
                       └──→ Defaulted
```

`mintInvoice(seller, faceValue, totalShares, dueDate, ...)` — sadece `MINTER_ROLE` (KOBİ).
`setStatus(invoiceId, newStatus)` — sadece `VERIFIER_ROLE` (admin paneli).

### `OrderBook.sol` — match yürütücü
Off-chain order defteri (Next.js API route'ta tutulur) signer-matcher tarafından eşleştirilir. `executeMatch(invoiceId, seller, buyer, qty, pricePerShare)`:

1. `buyer`dan USDC çeker.
2. `%0.5`'i `InsurancePool`'a yatırır.
3. Kalan USDC'yi `seller`'a (birincil pazarda) veya KOBİ + önceki holder'a böler.
4. `seller`dan ERC-1155 share'leri `buyer`'a transfer eder.
5. `Matched(invoiceId, seller, buyer, qty, pricePerShare, primary)` event'i atar — indexer bunu yakalar.

Sadece `MATCHER_ROLE` çağırabilir.

### `Escrow.sol` — repayment + claim
KOBİ vadede `repay(invoiceId, amount)` ile USDC'yi havuza yatırır.
Token sahipleri `claim(invoiceId)` ile balance'larıyla orantılı USDC çeker.
Default durumunda `markDefault(invoiceId)` → `InsurancePool.payout()` çağırır.

### `InsurancePool.sol` — sigorta havuzu
Her trade'in %0.5'i otomatik buraya akar. Default olursa havuz, default olan faturanın holder'larına prorata ödeme yapar (havuz bakiyesi izin verdiği kadar). Havuz bakiyesi Marketplace'te public.

### `MockUSDC.sol` — test stable
Hackathon için. `mint(to, amount)` herkese açık → faucet sayfası kullanıyor.

---

## Kullanıcı Akışları

### 1. KOBİ — fatura yükle
1. Wallet bağla → MetaMask (Base Sepolia).
2. `/upload` — fatura PDF + face value + due date + total shares.
3. `mintInvoice` tx → status = `PendingVerification`.
4. Verifier (admin paneli) onaylar → status = `Listed`.
5. KOBİ ask order girer, marketplace'te görünür.

### 2. Yatırımcı — birincil alım
1. `/faucet` üzerinden MockUSDC al (test için).
2. `/marketplace` → bir fatura seç → bid gir.
3. Matcher (server-side) ask + bid eşleştirir → `executeMatch` tx.
4. ERC-1155 share'ler yatırımcının cüzdanına düşer.

### 3. Yatırımcı — ikincil satış
1. `/portfolio` → "satışa çıkar" → ask order off-chain defterine eklenir.
2. Başka biri bid girer → matcher eşleştirir → token devri + USDC akışı.

### 4. Vade — repayment & claim
1. KOBİ `/invoice/[id]` üzerinden `repay` tx atar (face value tutarında USDC).
2. Yatırımcılar `/portfolio` → "claim" → prorata USDC çekilir.

### 5. Default
1. Vadeden sonra repayment yoksa verifier `markDefault` çağırır.
2. `InsurancePool.payout` otomatik tetiklenir.
3. Yatırımcı `/portfolio` → claim ile sigortadan prorata USDC alır.

---

## Geliştirme Ortamı

Önkoşul: **Node.js 20+**, **pnpm 9.12+**, MetaMask.

```bash
# 1. Repo + submodule
git clone --recurse-submodules https://github.com/iamnotdou/refaktor.git
cd refaktor
pnpm install

# 2. SDK build (app SDK'ya bağımlı)
pnpm build:sdk

# 3. App (kullanıcı arayüzü)
pnpm dev:app                    # http://localhost:3000

# 4. Docs
pnpm dev:docs                   # http://localhost:3001

# 5. Indexer (opsiyonel — yerel GraphQL playground)
pnpm indexer:codegen
pnpm indexer:dev                # Hasura: http://localhost:8080

# 6. Contract testleri
pnpm test:sc                    # hardhat test
pnpm test:sdk                   # vitest
```

### App'in ihtiyacı olan environment variable'lar (`app/.env.local`)

```
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_INDEXER_URL=http://localhost:8080/v1/graphql
MATCHER_PK=0x...                # server-side matcher private key (api/match için)
```

### ABI senkronizasyonu

Kontratlar değiştiğinde:

```bash
cd refaktor-sc && pnpm compile
cd .. && pnpm sync-abi          # SDK + indexer'a ABI'leri kopyalar
pnpm build:sdk                  # SDK yeniden derlenir
```

### Yeniden dağıtım

```bash
cd refaktor-sc
pnpm deploy:baseSepolia         # adresleri deployments/baseSepolia.json'a yazar
pnpm hardhat run scripts/wireRoles.ts --network baseSepolia
pnpm hardhat run scripts/verifyAll.ts --network baseSepolia   # block explorer verify
```

---

## Teknoloji Yığını

| Katman | Stack |
|---|---|
| Smart contracts | Solidity 0.8.x · Hardhat · OpenZeppelin v5 (ERC-1155, AccessControl) |
| On-chain test | Hardhat + chai + ethers v6 (unit + E2E) |
| Indexer | Envio HyperIndex 2.32 · Hasura GraphQL · PostgreSQL · Rescript handlers |
| SDK | viem 2.21 · graphql-request 7 · TanStack Query 5 · React 19 · tsup |
| App | Next.js 16 (app router) · wagmi 2 · viem · TailwindCSS 4 · shadcn/ui · Radix UI · sonner |
| Docs | Fumadocs UI 16 · MDX · React 19 |
| Deploy | Vercel (app + docs) · Base Sepolia (kontratlar) |

---

## Demo Senaryosu

Jüriye/izleyiciye gösterilecek 5 dakikalık akış:

1. **`/`** — landing: problem + 3 modül (birincil/ikincil/sigorta).
2. **`/faucet`** — MockUSDC + ETH al (test için).
3. **`/upload`** — KOBİ rolünde 100.000 USDC face-value bir fatura mint et (1.000 share).
4. **`/admin`** — verifier rolünde fatura'yı `Listed`'a çek.
5. **`/marketplace`** — yatırımcı rolünde 100 share @ 0.95 USDC bid → matcher eşleştirir.
6. **`/portfolio`** — pozisyon görünür, ikincil pazara 0.97'den çıkar (time-decay arbitrajı).
7. **`/invoice/[id]`** — KOBİ vade'de repay → yatırımcı claim → kâr realize.
8. **Default senaryo** — başka bir fatura'da `markDefault` → InsurancePool prorata tazminat.

Tüm tx'ler [Base Sepolia explorer](https://sepolia.basescan.org/) üzerinden takip edilebilir.

---

## Lisans

MIT (smart contracts). UI ve docs özel proje, henüz lisans tanımlı değil.

## İletişim

Hackathon ekibi: [@iamnotdou](https://github.com/iamnotdou) · İssue ve PR'lar açıktır.
