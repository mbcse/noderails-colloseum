# Mezo Borrow & Pay — Integration Research (NodeRails)

**Purpose:** Portable reference for reusing Mezo borrowing / checkout patterns in another project.  
**Status:** Implemented in NodeRails `payment-ui` (testnet only, chain `31611`).  
**Last updated:** 2026-05-24  
**Gitignored path:** `mezo-addition-docs/` (see repo `.gitignore`)

---

## 1. Executive summary

Mezo is an **EVM-compatible L2** where **native gas is BTC** (18 decimals), not ETH. Payments often use **MUSD** (Bitcoin-backed stablecoin, 18 decimals). Users can **Borrow & Pay**: lock **native BTC** as collateral via Liquity-style **Troves**, mint **MUSD**, then pay a merchant.

NodeRails implemented Borrow & Pay as a **client-only** feature:

- **No** `@mezo-checkout/core` dependency
- **No** server borrow-quote API (math runs in the browser)
- **Libraries:** `viem` + `wagmi` only (plus existing app stack: React, `@noderails/common`)
- **Isolated module:** `apps/payment-ui/src/features/mezo-borrow/` — removable via feature flag + ~5 lines in checkout

**Critical product constraint:** Opening a trove requires **minimum net debt ~1,800 MUSD** on testnet (on-chain `minNetDebt()`), regardless of a $5 checkout. Borrow & Pay is a poor fit for micro-payments unless the user already has MUSD or accepts minting the floor amount.

---

## 2. Mezo network reference

### 2.1 Testnet (what NodeRails targets today)

| Parameter | Value |
|-----------|--------|
| Network name | Mezo Testnet |
| Chain ID | **31611** (`0x7b7b`) |
| RPC (HTTPS) | `https://rpc.test.mezo.org` |
| RPC (WSS) | `wss://rpc-ws.test.mezo.org` |
| Explorer | `https://explorer.test.mezo.org` |
| Borrow UI (reference) | `https://testnet.mezo.org/borrow` |
| Faucet | `https://faucet.test.mezo.org` |
| Native currency | **BTC**, **18 decimals** |
| EVM version | **`london`** (Foundry/Hardhat deploy profiles) |

### 2.2 Mainnet (future)

| Parameter | Value |
|-----------|--------|
| Chain ID | **31612** |
| RPC | `https://rpc.mezo.org`, `https://rpc-http.mezo.boar.network`, etc. |
| Explorer | `https://explorer.mezo.org` |

### 2.3 Architecture notes

- Standard Solidity / ERC-20 / wagmi / viem — no custom VM.
- **Native BTC** = gas + trove collateral (`openTrove` is **payable** with `msg.value`).
- **mBTC** (`0x7b7C000000000000000000000000000000000000` on testnet) is a **bridged ERC-20**, not the same as native gas BTC.
- MUSD protocol is **Liquity v1-style CDP** (Troves, `BorrowerOperations`, `TroveManager`).
- Optional wallet stack: [@mezo-org/passport](https://mezo.org/docs/developers/getting-started/) (RainbowKit + Bitcoin wallets). **Not used** in NodeRails v1 (MetaMask / standard EVM wallets only).

---

## 3. Token & contract addresses (testnet)

### 3.1 Tokens

| Token | Testnet address | Decimals | Role |
|-------|-----------------|----------|------|
| **MUSD** | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | 18 | Payment / minted debt |
| **MEZO** | `0x7B7c000000000000000000000000000000000001` | 18 | Governance (optional checkout) |
| **mBTC** (bridged) | `0x7b7C000000000000000000000000000000000000` | 18 | Wrapped BTC token (not trove collateral in our flow) |
| **Native BTC** | — | 18 | Gas + `openTrove` collateral |

Mainnet MUSD (reference): `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186`.

Use **proxy addresses** from Mezo explorer when registering ERC-20s in admin tools.

### 3.2 MUSD / CDP protocol (Borrow & Pay)

| Contract | Testnet address | Purpose |
|----------|-----------------|---------|
| **BorrowerOperations** | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` | `minNetDebt()`, `getBorrowingFee(debt)`, `openTrove(debt, upperHint, lowerHint)` payable |
| **TroveManager** | `0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0` | `MUSD_GAS_COMPENSATION()`, `MCR()` |
| **MUSD** (ERC-20) | See above | Minted to trove owner on successful `openTrove` |

ABI source of truth for another project:

- Minimal ABIs are inlined in NodeRails: `apps/payment-ui/src/features/mezo-borrow/lib/constants.ts`
- Full protocol: [mezo-org/musd](https://github.com/mezo-org/musd) — deployments under `matsnet/` (testnet) in that repo
- Reference UI/math: [Freedteck/mezo-checkout](https://github.com/Freedteck/mezo-checkout) (analyzed, **not** a dependency)

### 3.3 NodeRails escrow on Mezo testnet

Deployed via `noderails-contracts` (`chains.json` → `mezo_testnet`):

| Contract | Address (31611) |
|----------|-----------------|
| NodeRailsEscrow | `0x5a4bc03b982a909fc1e665cf63c5e662ee74cb2a` |
| NodeRailsMerchantManager | `0x2fa8ec8170e74afa89991e44e7d8c984f7867e86` |

Borrow flow does **not** call escrow; after borrow, checkout continues with **standard MUSD authorize/capture** against NodeRails escrow.

**Do not** reuse addresses from mezo-checkout’s `ShoplinkEscrow` — different product.

---

## 4. Protocol behavior (what we learned on-chain)

### 4.1 View functions that work (testnet)

| Call | Contract | Returns (testnet, verified) | Notes |
|------|----------|----------------------------|--------|
| `minNetDebt()` | BorrowerOperations | `1800e18` (1,800 MUSD) | **Not** `MIN_NET_DEBT()` — that name **reverts** |
| `getBorrowingFee(uint256 debt)` | BorrowerOperations | ~0.5% of debt (scaled) | Used for quote + fee estimate |
| `MUSD_GAS_COMPENSATION()` | TroveManager | ~`200e18` MUSD | Added to total debt; refunded when trove closed |
| `MCR()` | TroveManager | ~`1.1e18` → **110%** minimum CR | Liquidation threshold |

### 4.2 `openTrove` transaction shape

```typescript
// viem / wagmi writeContract
BorrowerOperations.openTrove(
  borrowAmountMusd,  // uint256 — net MUSD debt (not including gas comp in arg; protocol adds fees)
  zeroAddress,       // upperHint — v1 uses 0x0
  zeroAddress,       // lowerHint
  { value: collateralBtcWei }  // native BTC, 18 decimals
)
```

- Chain ID must be **31611** on testnet.
- Hints: NodeRails passes `0x000…000` (same as mezo-checkout reference).
- User must have enough **native BTC** for `value` **plus** gas.

### 4.3 Collateralization ratio (ICR model)

Aligned with **testnet.mezo.org/borrow** (not the older 200% default from mezo-checkout sample code):

| Constant | Value | Meaning |
|----------|-------|---------|
| **MCR** | 110% | Protocol minimum; liquidation if ICR falls below |
| **Default UI CR** | **151%** | Mezo borrow site default collateralization |
| **Max UI CR** | 300% | Slider cap in NodeRails quote panel |

**Collateral sizing (forward):**

```
fee           = getBorrowingFee(borrowAmount)  // or proportional estimate from reference borrow/fee
totalDebtUsd  = borrowAmount + fee + gasCompensation   // all in MUSD 18-decimal units
collateralUsd = totalDebtUsd * (CR_percent / 100)
collateralBtc = collateralUsd / btcPriceUsd
collateralWei = parseUnits(collateralBtc, 18)
```

**Inverse (sliders):** Given collateral + CR, solve net `borrowAmount` iteratively (~8 iterations) because fee depends on borrow size.

**Liquidation price (display):**

```
liquidationPriceUsd = (totalDebtUsd * (mcrPercent / 100)) / collateralBtcHuman
```

### 4.4 Target borrow amount for checkout

```
paymentAmountMusd = parseUnits(checkoutUsd.toFixed(6), 18)  // 6 dp USD → MUSD wei
targetBorrow      = max(paymentAmountMusd, minNetDebt)
```

If payment &lt; 1,800 MUSD, user still must open trove at **at least** `minNetDebt` — show clear UX warning.

---

## 5. Libraries & dependencies

### 5.1 Used (NodeRails payment-ui)

| Package | Version (app) | Role |
|---------|---------------|------|
| **viem** | `^2` | `createPublicClient`, `readContract`, `parseUnits` / `formatUnits`, `defineChain` |
| **wagmi** | `^2.19.5` | `useWriteContract`, `useWaitForTransactionReceipt`, `useAccount`, `useBalance` |
| **@noderails/common** | workspace | `isNativeToken()`, `blockExplorerTxUrl()` |
| **lucide-react** | existing | Icons in modal |
| App `getTokenPrice` | `apps/payment-ui/src/lib/api.ts` | BTC/USD via `GET {API}/prices/BTC?currency=USD` |

### 5.2 Explicitly NOT used

| Package / approach | Reason |
|--------------------|--------|
| `@mezo-checkout/core` | Avoid coupling; logic reimplemented in feature folder |
| `@mezo-org/passport` | Not required for MetaMask-only; ask before adding per dependency policy |
| Server borrow-quote endpoint | Trove tx must be wallet-signed; math is cheap client-side |
| LeanRPC for protocol reads on 31611 | `eth_call` **timed out** in practice; dedicated Mezo RPC used for reads |
| ethers.js | Project standard is viem |

### 5.3 RPC strategy (important for porting)

| Use case | RPC | Why |
|----------|-----|-----|
| Wallet txs (`openTrove`) | Whatever wagmi uses for chain 31611 (DB `rpcUrl` / LeanRPC if supported) | User wallet connection |
| Protocol **view** reads (`minNetDebt`, fees) | **`https://rpc.test.mezo.org`** via dedicated `createPublicClient` | Reliable `eth_call`; 12s timeout |
| BTC price | NodeRails price API | Fallback `$84,000` if API fails |

For another project: **always** use Mezo’s public RPC (or your own node) for CDP reads; do not assume aggregator RPCs support 31611.

---

## 6. Reference repositories analyzed

### 6.1 [Freedteck/mezo-checkout](https://github.com/Freedteck/mezo-checkout)

| Aspect | Detail |
|--------|--------|
| What it is | Standalone React plugin `@mezo-checkout/core` |
| Modes | Pay with MUSD **or** Borrow & Pay |
| Borrow tx | `BorrowerOperations.openTrove` + `msg.value` collateral |
| Post-borrow | Refetch MUSD → approve → **ShoplinkEscrow** (not NodeRails) |
| Collateral math | `calcCollateral` in `useRouter.ts` — reference used **200%** CR; **Mezo live site uses 151%** |
| Atomic path | `ShoplinkRouter.borrowAndPay()` exists but **UI does not use it** |
| Simulation | `simulate-trove.mjs` — `eth_estimateGas` pattern |

**Takeaway for NodeRails:** Sequential flow (open trove → then normal ERC-20 checkout), not atomic router, unless you own router custody/accounting.

### 6.2 [mezo-org/musd](https://github.com/mezo-org/musd)

- Protocol source, deployment artifacts, full ABIs.
- Use for mainnet address updates and hint / sorted list logic if you add advanced trove management later.

### 6.3 Mezo official docs

- [Getting started](https://mezo.org/docs/developers/getting-started/)
- [Environment / RPC](https://mezo.org/docs/developers/getting-started/configure-environment/)
- [Contract addresses](https://mezo-org-documentation.mintlify.app/resources/contracts)

---

## 7. NodeRails implementation map

### 7.1 Feature module layout

```
apps/payment-ui/src/features/mezo-borrow/
├── config.ts                    # addresses, chain id, CR constants, feature flag
├── types.ts                     # MezoBorrowSession, MezoBorrowQuote, steps
├── index.ts                     # public exports
├── components/
│   ├── mezo-borrow-layer.tsx    # modal: offer → quote → confirming → success
│   └── mezo-borrow-quote-panel.tsx  # Mezo-style sliders, fees, liquidation
├── hooks/
│   └── use-mezo-borrow-proceed.ts   # gate + layer props for checkout
└── lib/
    ├── constants.ts             # minimal ABIs
    ├── mezo-public-client.ts    # viem public client → Mezo RPC
    ├── calc-collateral.ts       # ICR math (151% default)
    ├── borrow-quote.ts          # session fetch (protocol + BTC price)
    ├── open-trove.ts            # wagmi useOpenTrove()
    └── should-offer-borrow.ts   # when to intercept checkout proceed
```

### 7.2 Checkout adapter (thin integration)

File: `apps/payment-ui/src/components/payment-link-checkout.tsx`

```typescript
import { MezoBorrowLayer, useMezoBorrowProceed } from '@/features/mezo-borrow';

const mezoBorrow = useMezoBorrowProceed({
  isTestnet,
  amountUsd: numericAmount ?? undefined,
  selectedChain,
  selectedToken,
  acceptedTokens: tokens,
  onContinueReview: (nextTokenKey) => {
    if (nextTokenKey) setSelectedTokenKey(nextTokenKey);
    setStep('review');
  },
});

// CustomerInfoStep: onProceed={mezoBorrow.proceed}
// Render: {mezoBorrow.layerProps && <MezoBorrowLayer {...mezoBorrow.layerProps} />}
```

No `31611` / `MUSD` / `openTrove` strings required in checkout beyond this hook.

### 7.3 When Borrow & Pay is offered

All must be true (`should-offer-borrow.ts`):

1. `MEZO_BORROW_ENABLED === true` in `config.ts`
2. App / link is **testnet** (`isTestnet`)
3. Selected chain `chainId === 31611`
4. Selected token is **native BTC** (`isNativeToken(contractAddress)`)
5. Payment link **accepts MUSD** on 31611 (symbol `MUSD` in `acceptedTokens`)

If user declines borrow → `onContinueReview()` with **native BTC** path unchanged.

If user completes borrow → `onContinueReview(musdTokenKey)` → review step with **MUSD** selected.

### 7.4 UX steps

```
Customer info → Proceed
       │
       ├─ [gate false] → review (existing flow)
       │
       └─ [gate true] → MezoBorrowLayer
              │
              ├─ offer: "Check borrowing power" / "Pay with BTC instead"
              ├─ quote: load session (RPC + BTC price), sliders, fees
              ├─ confirming: wallet signs openTrove
              └─ success: auto-switch to MUSD → review → standard MUSD capture
```

### 7.5 Analytics events

| Event | When |
|-------|------|
| `mezo_borrow_offer_shown` | Gate passed, modal opened |
| `mezo_borrow_accepted` | User clicks into quote |
| `mezo_borrow_declined` | Pay with BTC instead |
| `mezo_borrow_tx_success` | Trove tx confirmed |

### 7.6 Disable / remove

1. Set `MEZO_BORROW_ENABLED = false` in `config.ts`, **or**
2. Delete `features/mezo-borrow/` and remove hook + `<MezoBorrowLayer />` from checkout.

---

## 8. Minimal ABIs (copy-paste for another project)

See `constants.ts` in repo. Summary:

**BorrowerOperations**

- `minNetDebt() → uint256`
- `getBorrowingFee(uint256 _debt) → uint256`
- `openTrove(uint256 _debtAmount, address _upperHint, address _lowerHint)` payable

**TroveManager**

- `MUSD_GAS_COMPENSATION() → uint256`
- `MCR() → uint256` (18-decimal ratio, e.g. 1.1 = 110%)

---

## 9. Porting checklist (another project)

### 9.1 Prerequisites

- [ ] EVM wallet on chain **31611** with native BTC for gas
- [ ] RPC URL that supports `eth_call` on BorrowerOperations / TroveManager
- [ ] MUSD ERC-20 available as payment token in your app
- [ ] BTC/USD price source (or documented fallback)
- [ ] Merchant/payment escrow that accepts MUSD (your contracts, not Shoplink)

### 9.2 Implementation steps

1. Copy or reimplement `config.ts` addresses for target network (testnet vs mainnet).
2. Create viem `publicClient` on **Mezo RPC** with timeouts; read `minNetDebt`, `MUSD_GAS_COMPENSATION`, `MCR`.
3. Implement `calc-collateral.ts` math with **151%** default CR (verify against mezo.org borrow UI).
4. Wire wagmi `writeContract` for `openTrove` with `value: collateralWei`.
5. Gate: native BTC selected + MUSD accepted + testnet flag (if you want parity with NodeRails).
6. After tx success: switch payment asset to MUSD and run your existing ERC-20 payment flow.
7. Show warnings: min debt 1,800 MUSD, surplus MUSD stays in user wallet, gas compensation ~200 MUSD.

### 9.3 Admin / infra (if using NodeRails backend)

| Layer | Requirement |
|-------|-------------|
| SupportedChain | 31611, `rpcUrl: https://rpc.test.mezo.org`, native BTC 18 dp |
| SupportedToken | MUSD row + native BTC sentinel |
| Contracts | NodeRailsEscrow + MerchantManager deployed on 31611 |
| MTXM | Chain registered with same RPC |
| Indexer | Escrow registered from deployment block |
| Prices | BTC/USD, MUSD/USD (testnet can peg MUSD ≈ $1) |

### 9.4 Pitfalls we hit

| Issue | Symptom | Fix |
|-------|---------|-----|
| Wrong ABI name `MIN_NET_DEBT()` | Revert / fallback “~2,000 MUSD” warning | Use `minNetDebt()` |
| LeanRPC on 31611 | Quote stuck “Loading…” | Dedicated Mezo RPC for reads |
| 200% default CR | Too much collateral vs mezo.org | Use **151%** default |
| Payment &lt; min debt | Trove still mints ≥ 1,800 MUSD | UX warning + `belowMinDebt` / `belowPayment` flags |
| No MUSD on link | Borrow button disabled | Require MUSD in accepted tokens |

---

## 10. Edge cases & future work

| Case | v1 behavior | Future |
|------|-------------|--------|
| User already has trove | Still `openTrove` (may fail if one trove per user) | `adjustTrove`, withdraw, or “use balance” |
| Payment &lt; 1,800 MUSD | Borrow amount bumped to `minNetDebt`; surplus MUSD in wallet | Hide borrow path or suggest MUSD balance |
| Insufficient BTC | `canBorrow = false` if `nativeBalance < collateral` | Pre-simulate `estimateGas` |
| Mainnet 31612 | Disabled (`isTestnet` gate) | Swap addresses + enable flag |
| Atomic borrow+pay | Not implemented | Custom router contract (custody risk) |
| Mezo Passport / Xverse | Not implemented | Optional `@mezo-org/passport` |

---

## 11. Testing (testnet)

1. Fund wallet: [faucet.test.mezo.org](https://faucet.test.mezo.org)
2. Payment link: **native BTC + MUSD** on chain 31611, testnet app
3. **Borrow yes:** offer → quote at 151% → confirm → explorer tx → review with MUSD → capture
4. **Borrow no:** proceed with native BTC capture
5. Small USD amount (&lt; 1,800): verify min-debt messaging
6. Verify on-chain: `minNetDebt()` = 1800e18, `openTrove` mints MUSD to wallet

---

## 12. Related docs in this folder

| File | Contents |
|------|----------|
| `implementation-plan.md` | Broader Mezo chain/token rollout phases (0–4), gap analysis, admin JSON |
| **This file** | Borrow & Pay research, libraries, math, ABIs, porting guide |

---

## 13. Quick reference constants (testnet)

```typescript
export const MEZO_BORROW_CHAIN_ID = 31611;
export const MEZO_TESTNET_RPC_URL = 'https://rpc.test.mezo.org';
export const MEZO_BORROWER_OPERATIONS = '0xCdF7028ceAB81fA0C6971208e83fa7872994beE5';
export const MEZO_TROVE_MANAGER = '0xE47c80e8c23f6B4A1aE41c34837a0599D5D16bb0';
export const MEZO_MUSD = '0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503';
export const MEZO_MIN_NET_DEBT_FALLBACK = 1800n * 10n ** 18n;
export const MEZO_GAS_COMPENSATION_FALLBACK = 200n * 10n ** 18n;
export const MEZO_MCR_PERCENT = 110;
export const MEZO_DEFAULT_CR_PERCENT = 151;  // matches testnet.mezo.org/borrow
export const MEZO_MAX_CR_PERCENT = 300;
export const BTC_PRICE_FALLBACK_USD = 84_000;
```

---

## 14. External links

- Mezo borrow (testnet): https://testnet.mezo.org/borrow  
- Mezo explorer (testnet): https://explorer.test.mezo.org  
- mezo-checkout (reference): https://github.com/Freedteck/mezo-checkout  
- musd protocol: https://github.com/mezo-org/musd  
- Mezo docs: https://mezo.org/docs/developers/getting-started/

---

*Document generated from NodeRails implementation and on-chain verification on Mezo testnet (31611), May 2026.*
