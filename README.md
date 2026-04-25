# Refaktor — FaturaChain

Türk KOBİ ihracat faturalarını açık pazar modeliyle global yatırımcılara açan Web3 platformu.
Bi-Thongo Web3 Hackathon (Biruni Teknopark, Nisan 2026) için MVP.

## Monorepo Yapısı

```
refaktor/
├── docs/         Fumadocs — tüm dokümantasyon (kavramsal, mimari, oyun teorisi)
├── contracts/    Solidity smart contract'lar (git submodule, ayrı repo)
├── frontend/     React + ethers/wagmi + MetaMask
├── backend/      Node.js + Express — off-chain order matching, GİB mock API
└── shared/       ABI, types, constants — frontend ↔ backend ortak
```

## Submodule (contracts)

Contracts ekibi (arkadaş) ayrı bir repo'da çalışıyor. Repo hazır olduğunda:

```bash
git submodule add <CONTRACTS_REPO_URL> contracts
git submodule update --init --recursive
```

Her contracts güncellemesinde:

```bash
git submodule update --remote contracts
git add contracts && git commit -m "bump contracts to <hash>"
```

## Geliştirme

```bash
# Docs (fumadocs)
cd docs && pnpm install && pnpm dev   # http://localhost:3000

# Frontend
cd frontend && pnpm install && pnpm dev

# Backend
cd backend && pnpm install && pnpm dev

# Contracts (submodule içinde)
cd contracts && pnpm install && pnpm hardhat node
```

## Dokümantasyon

Tüm konsept, mimari, kullanıcı akışları, oyun teorisi analizi ve yol haritası `docs/` altında. Lokalde `cd docs && pnpm dev` ile aç.
