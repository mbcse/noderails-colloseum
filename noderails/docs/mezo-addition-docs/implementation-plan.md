# Mezo Chain & Token Support — Implementation Plan

**Status:** Draft (planning only — no code merged yet)  
**Scope:** Mezo **Testnet first** (chainId `31611`), then Mainnet (`31612`)  
**Reference:** [Freedteck/mezo-checkout](https://github.com/Freedteck/mezo-checkout) (cloned temporarily for analysis; not a dependency)

---

## 1. Goal

Add Mezo as a first-class EVM network in NodeRails so merchants can accept:

| Asset | Role on Mezo | Priority |
|-------|----------------|----------|
| **MUSD** | Bitcoin-backed stablecoin (primary checkout token) | P0 |
| **Native BTC** | Gas + collateral
 native capture | P1 |
| **MEZO** | Governance / ecosystem ERC-20 | P2 |
| **Borrow & Pay** | User locks BTC collateral, mints MUSD on the spot, then pays | P1 (differentiator) |

Standard NodeRails flows (escrow authorize → capture → settle/dispute) should remain unchanged. Mezo-specific behavior is additive.

---

## 2. Mezo network reference

Sources: [Mezo Developer Getting Started](https://mezo.org/docs/developers/getting-started/), [Environment setup](https://mezo.org/docs/developers/getting-started/configure-environment/), [Contract addresses](https://mezo-org-documentation.mintlify.app/resources/contracts)

### 2.1 Testnet (initial target)

| Parameter | Value |
|-----------|--------|
| Network name | Mezo Testnet |
| Chain ID | **31611** (`0x7b7b`) |
| RPC (HTTPS) | `https://rpc.test.mezo.org` |
| RPC (WSS) | `wss://rpc-ws.test.mezo.org` |
| Explorer | `https://explorer.test.mezo.org` |
| Native currency | **BTC** (18 decimals) |
| EVM version | `london` (important for Foundry/Hardhat) |
| Faucet | `https://faucet.test.mezo.org` |

### 2.2 Mainnet (later)

| Parameter | Value |
|-----------|--------|
| Chain ID | **31612** |
| RPC | `https://rpc-http.mezo.boar.network`, `https://rpc.mezo.org`, etc. |
| Explorer | `https://explorer.mezo.org` |

### 2.3 Architecture notes

- Fully **EVM-compatible** (Solidity, wagmi, viem, standard ERC-20).
- **BTC is native gas** — not ETH. Wallets show BTC balance for fees.
- MUSD protocol is **Liquity-style CDP** (Troves, `BorrowerOperations`, minimum net debt).
- Optional wallet UX: [@mezo-org/passport](https://mezo.org/docs/developers/getting-started/) (RainbowKit + Bitcoin wallets). Not required for MetaMask-only checkout.

---

## 3. Token & protocol addresses

### 3.1 Core tokens

| Token | Testnet | Mainnet | Decimals | Notes |
|-------|---------|---------|----------|-------|
| **MUSD** | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` | 18 | Primary payment token |
| **MEZO** | `0x7B7c000000000000000000000000000000000001` | Same pattern per Mezo docs | 18 | ERC-20 governance token |
| **Native BTC** | — | — | 18 | Used for gas & Trove collateral |
| **Bridged tBTC (mBTC)** | `0x7b7C000000000000000000000000000000000000` | Same | 18 | Wrapped/bridged BTC **token** (distinct from native gas BTC) |

Use **proxy addresses** from the explorer when adding ERC-20s to admin (Mezo docs warn about upgradeable proxies).

### 3.2 MUSD / CDP protocol (Borrow & Pay)

| Contract | Testnet address (from mezo-checkout + on-chain scripts) | Purpose |
|----------|---------------------------------------------------------|---------|
| **BorrowerOperations** | `0xCdF7028ceAB81fA0C6971208e83fa7872994beE5` | `openTrove(musdAmount, upperHint, lowerHint)` payable with **native BTC** collateral |
| MUSD ERC-20 | See §3.1 | Minted to trove owner on `openTrove` |

Verify BorrowerOperations on testnet via `eth_call` to `MIN_NET_DEBT()` before production — mezo-checkout scripts confirm this address responds on `https://rpc.test.mezo.org`.

**Protocol constraints (critical for UX):**

- **MIN_NET_DEBT** on testnet ≈ **1800–2000 MUSD** (Liquity-style floor). Opening a trove always mints **at least** this amount, even for a $5 checkout.
- **Gas compensation** ≈ 200 MUSD added to debt (Liquity constant in mezo-checkout `calcCollateral`).
- Recommended collateral ratio used in reference UI: **200%** (above 150% protocol minimum).
- Borrowing fee ~0.5% — reference UI borrows slightly above payment amount.

These limits mean **Borrow & Pay is a poor fit for micro-payments** unless the user already has a trove / MUSD balance.

---

## 4. How mezo-checkout works (reference analysis)

Repo: [Freedteck/mezo-checkout](https://github.com/Freedteck/mezo-checkout)

### 4.1 What it is

A standalone React plugin (`@mezo-checkout/core`) — **not** integrated with NodeRails. It targets **Mezo Matsnet/Testnet only**.

### 4.2 Payment modes

```
┌─────────────────────────────────────────────────────────────┐
│                     MezoCheckout UI                          │
├──────────────────────────┬──────────────────────────────────┤
│  Pay with MUSD           │  Borrow & Pay (BTC → MUSD)       │
│  (existing balance)      │  (open Trove first)              │
└────────────┬─────────────┴──────────────┬───────────────────┘
             │                            │
             ▼                            ▼
    ┌────────────────┐          ┌─────────────────────┐
    │ MUSD approve   │          │ BorrowerOperations  │
    │ (if escrow)    │          │ .openTrove{value:   │
    └───────┬────────┘          │  BTC collateral}    │
            │                   └──────────┬──────────┘
            ▼                              │
    ┌────────────────┐                     │ refetch MUSD balance
    │ Escrow OR      │◄────────────────────┘
    │ direct transfer│
    └────────────────┘
```

**Path A — Pay with MUSD**

1. Read `MUSD.balanceOf(user)`.
2. If `useEscrow`: `MUSD.approve(ShoplinkEscrow)` → `ShoplinkEscrow.createOrder(seller, amount, productId)`.
3. Else: `MUSD.transfer(seller, amount)`.

**Path B — Borrow & Pay** (sequential, **not** atomic in the UI)

1. `BorrowerOperations.openTrove(borrowAmount, hint, hint)` with `msg.value = collateralBtc`.
2. Wait for receipt; refetch MUSD balance.
3. Same as Path A (approve + escrow or transfer).

**Note:** They also deployed `ShoplinkRouter.borrowAndPay()` for atomic borrow+escrow in one tx, but **`MezoCheckout.tsx` does not call it** — only the sequential flow is wired.

### 4.3 Escrow used by mezo-checkout

Custom **`ShoplinkEscrow`** (simple order escrow for MUSD) — **not** NodeRails `NodeRailsEscrow`.

NodeRails must deploy **our own** escrow + merchant manager on Mezo and wire the indexer/MTXM to those addresses.

### 4.4 Key files in reference repo

| File | Relevance |
|------|-----------|
| `packages/mezo-checkout/src/lib/contracts/addresses.ts` | Chain 31611, MUSD, BorrowerOperations, MIN_NET_DEBT |
| `packages/mezo-checkout/src/hooks/useRouter.ts` | `openTrove`, `calcCollateral` |
| `packages/mezo-checkout/src/hooks/useMUSD.ts` | ERC-20 approve/transfer |
| `packages/mezo-checkout/src/hooks/useEscrow.ts` | Custom escrow (ignore for NodeRails escrow ABI) |
| `contracts/contracts/ShoplinkRouter.sol` | Optional atomic borrow pattern |

---

## 5. NodeRails gap analysis

### 5.1 What already works (EVM generic)

Once Mezo is in `SupportedChain` + tokens in DB, and contracts are deployed:

| Feature | Mezo compatibility |
|---------|-------------------|
| ERC-20 MUSD checkout (approve/permit + MTXM capture) | ✅ Same as USDC on Base |
| Native BTC capture (`authorizationMethod: NATIVE`) | ✅ Same as ETH native — **if** price feed + token row exist |
| Payment links / subscriptions / invoices | ✅ No chain-specific code |
| Disputes / timelocks / webhooks | ✅ Escrow-driven |
| Admin chain/token CRUD | ✅ Manual add |

### 5.2 What does **not** exist yet

| Gap | Impact |
|-----|--------|
| Mezo **not** in `CHAIN_DEFINITIONS`, LeanRPC, wagmi defaults | Checkout wallet cannot switch to 31611 |
| LeanRPC likely **no** Mezo routing | Must store **direct RPC** on `SupportedChain.rpcUrl` |
| Contracts **not** deployed on 31611 | Blocker for any capture |
| MTXM chain registration for 31611 | Blocker for server-side tx submission |
| Indexer registration for 31611 escrow | Blocker for lifecycle webhooks |
| MUSD / MEZO **price sources** | Blocker for USD conversion at checkout |
| **Borrow & Pay** UX + flow | New checkout step (not in platform today) |
| `blockExplorerTxUrl` for 31611 | Minor — falls back to “Chain 31611” |

### 5.3 payment-ui RPC bug to fix

`apps/payment-ui/src/lib/wagmi.ts` always uses `getLeanRpcUrl(chainId)` even when API returns `rpcUrl`. Mezo **requires** using DB `rpcUrl` (`https://rpc.test.mezo.org`).

Same pattern may be needed in dashboard wagmi if merchants connect wallets on Mezo.

---

## 6. Recommended implementation phases

### Phase 0 — Prerequisites & ops (1–2 days)

**Objective:** Chain exists in all infra layers with NodeRails contracts.

1. **Deploy NodeRails contracts on Mezo Testnet (31611)**
   - Add entry to `noderails-contracts/script/chains.json` with direct RPC (not LeanRPC).
   - Run `DeployAll` + `SetupRoles` via existing Foundry scripts (`evm_version = london`).
   - Record escrow + merchant manager addresses + deployment block.

2. **Register infrastructure**
   - **Admin UI:** Create `SupportedChain` (EVM, chainId 31611, native BTC, explorer, rpcUrl, escrow addresses).
   - **MTXM:** Add chain with `https://rpc.test.mezo.org`.
   - **Indexer:** Add chain + register escrow contract + start block.
   - **setup-cli:** Extend `CHAIN_DEFINITIONS` with `mezoTestnet` for automation scripts.

3. **LeanRPC decision**
   - If LeanRPC adds 31611: can switch later.
   - Until then: **always** set explicit `rpcUrl` on the chain row.

**Exit criteria:** Sepolia-style smoke test — manual `authorize` + capture on Mezo testnet with MUSD.

---

### Phase 1 — MUSD token checkout (P0, 2–4 days)

**Objective:** Merchant accepts MUSD on Mezo testnet through standard hosted checkout.

1. **Admin tokens**
   - Add `SupportedToken` for MUSD on chain 31611:
     - `contractAddress`: testnet MUSD proxy
     - `symbol`: `MUSD`, `decimals`: 18
     - Enable permit if token supports EIP-2612 (verify on-chain).
   - Optionally add MEZO token row (P2 can defer enablement).

2. **Pricing**
   - Add MUSD USD price source (oracle API, static $1 for testnet, or CoinGecko if listed).
   - Add native BTC price for gas estimation display.

3. **Frontend**
   - Fix wagmi to prefer `chain.rpcUrl` over LeanRPC.
   - Add Mezo testnet to static explorer helpers in `@noderails/common` (`blockExplorerTxUrl`).
   - Verify ConnectKit/Rainbow shows “Mezo Testnet” when app enables chain 31611.

4. **Merchant app config**
   - Enable chain 31611 + MUSD token on test app in dashboard settings.

5. **E2E test**
   - Payment link → select Mezo + MUSD → approve/permit → capture → indexer webhook → `payment.captured`.

**Exit criteria:** Full payment lifecycle on Mezo testnet with MUSD only.

---

### Phase 2 — Native BTC checkout (P1, 1–2 days)

**Objective:** Payer sends **native BTC** (18 decimals) into NodeRails escrow.

1. Add native token row (`contractAddress` = native sentinel used elsewhere in NodeRails, e.g. `0x000…000` or platform convention).
2. Ensure `authorize.service` native capture path uses Mezo RPC from chain row.
3. Indexer must index native transfers to escrow if not already covered by escrow events only (confirm indexer behavior for native capture on EVM).

**Exit criteria:** Small BTC-denominated payment link works end-to-end.

---

### Phase 3 — Borrow & Pay (BTC collateral → MUSD → pay) (P1, 4–7 days)

**Objective:** Match mezo-checkout’s differentiator inside NodeRails hosted checkout.

This is **not** a server-side feature — trove opening must be signed by the user’s wallet with native BTC.

#### 3.1 UX design (payment-ui)

Add a third funding source on Mezo when MUSD is selected (or when chain = 31611):

```
[ ] I have MUSD          → existing ERC-20 flow
[ ] Borrow against BTC   → new multi-step sub-flow
```

**Borrow sub-flow steps:**

1. **Quote** — Call view functions / off-chain math:
   - Payment amount in MUSD (from USD price).
   - `borrowAmount = max(paymentAmount, MIN_NET_DEBT)` (+ fee buffer).
   - `collateralBtc = calcCollateral(borrowAmount, btcUsdPrice)` (port logic from `useRouter.ts`).
   - Show warning: “Minimum borrow is ~2000 MUSD on testnet.”

2. **Open Trove** — Wallet tx:
   ```ts
   BorrowerOperations.openTrove(borrowAmount, zeroAddress, zeroAddress, { value: collateralBtc })
   ```

3. **Continue standard checkout** — After success, auto-select MUSD balance path:
   - Approve/permit NodeRails escrow
   - Authorize + capture via existing API

#### 3.2 Server changes

**Minimal** — optional endpoint for quotes only:

```
GET /checkout/mezo/borrow-quote?amountUsd=&chainId=31611
→ { borrowAmountWei, collateralBtcWei, minNetDebt, estimatedCr, warnings[] }
```

Implementation reads `MIN_NET_DEBT` and BTC/MUSD prices from RPC + price service. Keeps math centralized and testable.

**Do not** submit `openTrove` from MTXM (user wallet only).

#### 3.3 Optional Phase 3b — Atomic router (later)

Deploy a NodeRails-specific router (pattern from `ShoplinkRouter.sol`) that:

1. Opens trove
2. Approves NodeRails escrow
3. Triggers capture in one tx

**Pros:** One confirmation for user.  
**Cons:** Trove owned by router contract unless carefully designed; harder dispute/accounting alignment with NodeRails intent IDs. **Recommend sequential flow first** (matches mezo-checkout production UI).

#### 3.4 Edge cases

| Case | Handling |
|------|----------|
| User already has trove | Future: `adjustTrove` / `withdrawMUSD` — out of scope v1; show “Use existing MUSD balance” |
| Payment &lt; MIN_NET_DEBT | Block borrow path; message to use existing MUSD or increase cart size |
| Insufficient native BTC for collateral + gas | Pre-flight `eth_estimateGas` + balance check |
| Trove reverts | Show contract revert reason from simulation |

**Exit criteria:** Testnet user with only native BTC can complete a payment link by borrowing MUSD then paying through NodeRails escrow.

---

### Phase 4 — MEZO token & extras (P2)

1. Enable MEZO as optional ERC-20 checkout token (same as MUSD flow).
2. Add MEZO/USD pricing.
3. Document merchant-facing notes (volatility vs MUSD).
4. Mainnet rollout (31612) mirroring testnet with mainnet addresses from [Mezo contracts reference](https://mezo.org/docs/users/resources/contracts-reference/).

---

## 7. Data model checklist (admin)

### SupportedChain row (testnet example)

```json
{
  "chainId": 31611,
  "chainType": "EVM",
  "name": "mezo-testnet",
  "displayName": "Mezo Testnet",
  "nativeCurrencySymbol": "BTC",
  "nativeCurrencyDecimals": 18,
  "rpcUrl": "https://rpc.test.mezo.org",
  "explorerUrl": "https://explorer.test.mezo.org",
  "escrowAddress": "<NodeRailsEscrow deploy address>",
  "merchantManagerAddress": "<NodeRailsMerchantManager deploy address>",
  "isTestnet": true,
  "supports7702": false
}
```

### SupportedToken rows

| symbol | contractAddress (testnet) | decimals |
|--------|---------------------------|----------|
| MUSD | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | 18 |
| MEZO | `0x7B7c000000000000000000000000000000000001` | 18 |
| BTC (native) | platform native sentinel | 18 |

---

## 8. Code touchpoints (when implementing)

| Area | File(s) | Change |
|------|---------|--------|
| Chain constants | `packages/common/src/constants/index.ts` | Add `mezoTestnet` / `mezoMainnet` + explorer URLs |
| Contract deploy | `noderails-contracts/script/chains.json` | RPC + chainId 31611 |
| Payment UI wagmi | `apps/payment-ui/src/lib/wagmi.ts` | Use `rpcUrl` when provided |
| Dashboard wagmi | `apps/dashboard/src/lib/wagmi.ts` | Same RPC fix if applicable |
| Checkout UI | `apps/payment-ui/src/components/payment-link-checkout.tsx` | Mezo borrow sub-flow |
| Quote API | `services/noderails-server/src/modules/checkout/` (new) | Optional borrow quote |
| Prices | `services/noderails-server/src/modules/prices/` | MUSD, MEZO, BTC-USD |
| Setup CLI | `services/setup-cli/src/setup-mtxm.ts` | Mezo in CHAIN_DEFINITIONS |
| Mezo constants package | `packages/common/src/mezo/` (new, optional) | ABIs, addresses, `calcCollateral` |

**No new npm dependency required for Phase 1** — use viem + existing wagmi.

**Phase
 & Pay:** consider copying ABIs from mezo-checkout or `mezo-org/musd` repo into `packages/common` (no `@mezo-checkout/core` dependency).

Optional later: `@mezo-org/passport` for Bitcoin wallet connectors — **ask before adding** per dependency policy.

---

## 9. Testing plan

### 9.1 Testnet setup

1. Fund wallet via [Mezo faucet](https://faucet.test.mezo.org) (native BTC for gas).
2. For MUSD-only tests: obtain testnet MUSD (borrow manually or faucet if available).
3. Enable Mezo + MUSD on NodeRails test app.

### 9.2 Test matrix

| # | Scenario | Expected |
|---|----------|----------|
| 1 | MUSD + permit | Intent captured, webhook fired |
| 2 | MUSD + approve | Same |
| 3 | Native BTC capture | Escrow funded in BTC |
| 4 | Borrow & Pay → MUSD capture | Trove opened, then standard capture |
| 5 | Borrow & Pay, cart &lt; MIN_NET_DEBT | Clear error, no tx |
| 6 | Wrong chain in wallet | ConnectKit switch to 31611 |
| 7 | MEZO ERC-20 (P2) | Same as MUSD |

### 9.3 Contract verification

- Simulate `openTrove` with `eth_estimateGas` (pattern in mezo-checkout `simulate-trove.mjs`).
- Read `MIN_NET_DEBT()` from BorrowerOperations before shipping borrow UI.

---

## 10. Risks & open questions

| Risk | Mitigation |
|------|------------|
| MIN_NET_DEBT makes small checkouts impossible via borrow | Document; hide borrow path when `amount < minDebt` |
| LeanRPC doesn't support 31611 | Direct RPC on chain row (required) |
| MUSD permit may be unavailable | Fall back to approve-only (already supported) |
| Price oracle gaps for MUSD/MEZO | Testnet: peg MUSD to $1; mainnet: integrate oracle |
| Trove ownership / recovery | v1: user-owned trove; surplus MUSD stays in user wallet after pay |
| mezo-checkout escrow ≠ NodeRails escrow | Do not reuse ShoplinkEscrow addresses |
| EVM `london` vs `paris` | Match Mezo docs in Foundry deploy profile |

**Open questions for product:**

1. Do we support **Borrow & Pay in v1** or ship **MUSD-only** first?
2. Accept **native BTC** checkout or MUSD-only (simpler merchant accounting)?
3. Mainnet timeline — follow testnet hackathon/demo date?
4. Integrate **Mezo Passport** (Xverse/Unisat) or MetaMask-only initially?

---

## 11. Suggested execution order (summary)

```
Phase 0: Deploy contracts + register chain (MTXM, Indexer, Admin)
    ↓
Phase 1: MUSD checkout (standard ERC-20) + RPC/wagmi fix
    ↓
Phase 3: Borrow & Pay UX (differentiator; can parallelize price feeds)
    ↓
Phase 2: Native BTC (optional)
    ↓
Phase 4: MEZO + Mainnet
```

**Recommended MVP for demo:** Phase 0 + Phase 1 + Phase 3 (Borrow & Pay), testnet only.

---

## 12. References

- [Mezo Developer Getting Started](https://mezo.org/docs/developers/getting-started/)
- [Mezo Environment / RPC](https://mezo.org/docs/developers/getting-started/configure-environment/)
- [Mezo Contract Addresses](https://mezo-org-documentation.mintlify.app/resources/contracts)
- [mezo-org/musd](https://github.com/mezo-org/musd) — MUSD protocol source
- [Freedteck/mezo-checkout](https://github.com/Freedteck/mezo-checkout) — reference checkout plugin (analyzed locally in `/tmp/mezo-checkout`)

---

*Last updated: 2026-05-24*
