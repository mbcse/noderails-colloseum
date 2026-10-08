# Checkout collateral / credit (design note)

Status: Discussion only. Do not implement until we come back to this.

Saved: 2026-09-27

Related: [Agent + human checkout](../agent-checkout/README.md) (same “one checkout, extra method” idea). Existing sketch: Mezo borrow in `apps/payment-ui/src/features/mezo-borrow` (testnet, MUSD only).

---

## Product sentence

On the hosted checkout page: lock collateral, pay the merchant in USDC now, user owes a loan (protocol or our vault). Merchant capture stays the current escrow path. We do not hold the user’s keys.

Do not mix three products into one sentence. They have different difficulty and legal weight.

---

## Three things people mix together

| | What the user feels | Who is the lender | How hard on this stack |
| --- | --- | --- | --- |
| **A. Borrow-to-pay** | Lock BTC-asset, borrow a stable, pay this checkout now | Protocol (Mezo / Aave) or our vault | Medium. Mezo UI pattern exists. Production = USDC + a chain we settle. |
| **B. BNPL / 30-day credit** | Pay merchant today, user owes us (or a partner) in a month | Us or a credit partner | Hard. Capital, KYC, collections, default, licenses. Almost none of that exists today. |
| **C. Revolving credit line** | Pre-approved limit, many checkouts, monthly statement | Same as B | Harder than B. |

Checkout already has a thin **A**: Mezo testnet, BTC collateral → MUSD, only if the merchant accepts MUSD. After pay, the loan sits on Mezo. Payback is Mezo’s app, not a NodeRails 30-day invoice.

**B** (“due in a month on our checkout”) is not built.

---

## How it sits on checkout

Keep one checkout. Extra method, not a new product page:

1. **Pay from wallet** (today)
2. **Pay with collateral** — lock BTC-asset, borrow USDC (or MUSD), same capture
3. Later, maybe **Pay on credit** — only if a partner (or our vault LPs) funds USDC and owns the receivable

Atomic shape (right one):

- User signs `borrowAndPay(checkout, amount, …)`
- Collateral locks
- USDC goes **straight to NodeRails escrow** (user should not walk with borrowed USDC)
- Existing authorize / capture
- Do not invent a second escrow

Copy must be honest: who the user repays (Aave / Mezo / NodeRails vault), when interest starts, and that liquidation can happen **before** 30 days if health fails.

---

## A lockbox cannot mint USDC

Atomic “lock collateral → merchant paid in USDC” only works if USDC already exists for that tx:

1. **Liquidity pool in our vault** — LPs deposit USDC, earn our interest. We are a tiny Aave with our term and liquidation rules.
2. **Our treasury** deposits USDC. We are the lender. Inventory + credit risk.
3. **Vault borrows USDC from Aave in the same tx** (user collateral supplied through the vault, or our Aave credit).

Without one of those, “we give them USDC” is not a mechanism.

Flash loans: repaid **in the same transaction**. Useless for pay-now / repay-in-a-month.

---

## Aave as wholesale (not Mezo)

Better production lender for **A** if we stay checkout + fee layer:

- Live USDC on Ethereum / Base / Arbitrum / etc.
- Collateral is a **wrapped** BTC (WBTC, cbBTC), not native BTC
- User wallet (or our vault) talks to Aave Pool; we build calldata then run pay
- After capture, loan lives on Aave unless we wrap it

Mezo vs Aave:

| | Mezo (current sketch) | Aave V3 |
| --- | --- | --- |
| Merchant token | MUSD if they accept it | USDC on a chain we already settle |
| Network | Testnet-shaped | Mainnet, deep USDC |
| After pay | Mezo trove | Aave debt, variable APY |
| Liquidation | Mezo | Aave keepers |

Aave does **not** give “0% for 30 days.” Interest starts when they borrow. “Pay back in a month” is the user’s plan unless **we** add a second product (vault term / late APR).

---

## What Aave charges (approx., Sep 2026 — do not hardcode)

Aave does **not** charge a flat “use Aave” fee on a normal borrow. The user pays **market borrow APY** + gas. We get **$0** of that unless we add our own fee.

| Item | Typical |
| --- | --- |
| Open a borrow | $0 protocol origination on V3 |
| Hold USDC debt | ~4–6% APR now (variable; Core ~4.4%, Base ~4.6%) |
| 30 days on $100 | ~$0.35–$0.50 interest |
| Flash loan | 0.05% of flashed amount, same tx only |
| Liquidation bonus | ~5–8% of the seized collateral slice (asset/chain specific) |
| Reserve factor | Slice of *interest* to Aave DAO (often ~10–20% of interest), not an extra user line |

Of borrow APY: most → USDC suppliers; reserve factor → DAO. **Integrators get none.**

Gas (approve + supply + borrow + pay) can exceed Aave interest on a small L1 checkout. Prefer Base / Arbitrum.

Quote live APY on the checkout screen from the pool. Do not bake in 4.5%.

Sources: [Aave V3 flash loans](https://aave.com/docs/aave-v3/guides/flash-loans), [app.aave.com](https://app.aave.com).

---

## How NodeRails earns

We do not earn Aave supply APY unless *we* deposit the collateral (we should not; that is custody / we are the borrower).

Fits this company (in order):

1. **VAS on the payment** — already in settlement math (`A − platform − VAS`). “Pay with collateral” as a merchant-opt-in VAS.
2. **Origination** — flat or bps at `borrowAndPay`, disclosed. Extra USDC to `feeRecipient` or slightly larger borrow.
3. **Merchant pays for the feature** — user only sees Aave (or vault) rates. Simpler UX.
4. **Aave Merit / referrals** — unstable bonus, not the business.
5. **Vault spread** — only if **we** lend to the user (see below).

Do not:

- Deposit user BTC into *our* Aave account and borrow for them (we eat liquidation)
- Pretend we earn Aave’s 4.5%
- Productize liquidating our own users as the main revenue

Merchant still gets promised dest amount after published fees. They should not silently eat borrow interest.

---

## Own vault: 30 days, late interest, then close

Idea: non-custodial contract locks collateral, pays USDC to escrow atomically, 30 days to repay with interest; after that rate steps up until health fails; then liquidation closes the position.

**Non-custodial** means: user cannot withdraw collateral until repaid or liquidated; **we** cannot seize except via the contract; no user keys. It does **not** mean there is no lender. Someone funded the USDC.

If an admin key can change LTV, seize early, or drain, it is custodial in practice. Immutable or timelocked params match NodeRails escrow.

Term loop:

| Clock | What happens |
| --- | --- |
| Day 0 | Lock collateral, debt = Y + fee, USDC → escrow. Health from oracle. |
| Days 1–30 | Normal APR (or teaser). |
| After day 30 | Late APR. Debt grows; HF can fall even if BTC is flat. |
| HF &lt; 1 (price **or** interest) | Public liquidator repays, takes collateral + penalty. |
| User repays anytime | USDC in, debt burned, leftover collateral out. |

Still need: oracle (usual exploit surface), min CR at open (e.g. 150%), keepers (or the book goes insolvent), close path (DEX sell vs liquidator keeps the asset).

**This is a lending market**, not a checkout toggle. Legal: still looks like lending in many places.

Isolated v1 if we ever build it: one collateral (e.g. cbBTC), one debt (USDC), one chain, `borrowAndPay` pinned to that payment id, public `liquidate(position)`, LP USDC with a utilization cap.

---

## “Charge them 8%, pay Aave 4%”

If the **user’s wallet** borrows on Aave, they pay **Aave’s variable rate**. We cannot rewrite that to 8%. We can only add **our** fee on top. That is not an 8/4 spread.

Spread only works with a **middle vault**:

```
User collateral → our vault
Vault supplies to Aave, borrows USDC @ Aave APY (~4%)
Vault sends USDC to escrow
User owes the vault 8% (our term, late APR, etc.)
Vault owes Aave ~4% until the vault repays Aave
We keep the difference if rates stay there
```

We are the lender; Aave is wholesale.

Implications:

- If Aave borrow APY spikes to 12%, fixed 8% to the user is **underwater**. Safer: `Aave APY + 4%` or a floor.
- **Two clocks:** Aave can liquidate the vault on a crash on day 2. Our “30 days then late fee” does not bind Aave. Either pass liquidation through, or defend with **our** USDC.
- Legal: we are setting an interest rate.

Cleaner than a fake 8/4:

- User rate = `max(Aave borrow APY + spread, floor)`
- Or pass Aave through + **origination bps** we keep

Marketing “8% for 30 days” as a **fixed fee** (~8% × 30/365 ≈ **0.66%** of the payment) is clearer than calling it APR. $100 → ~$0.66 to us; Aave still charges its own ~$0.37 for the month. Do not tell the user one loan is “8% to us, 4% to Aave.”

---

## Liquidation events and emails

We can **watch** risk and email. We cannot **control** Aave liquidations. Anyone can liquidate when HF &lt; 1. Emails do not stop a keeper. We cannot pause Aave unless we repay the debt.

How emails would work (same idea as payment indexer + SES):

1. On borrow-and-pay: store wallet, position id, payment id, email.
2. Worker (1–5 min): read collateral, debt, oracle, health factor.
3. Our events (DB/queue), not Aave’s inbox:  
   `hf_warning` (e.g. HF &lt; 1.3)  
   `hf_critical` (HF &lt; 1.1)  
   `in_liquidation` (HF &lt; 1)  
   `liquidated` (saw the tx)  
   `due_soon` / `past_due` (our 30-day clock only)
4. Email via existing SES; dedupe `(position, template)` so we do not spam every tick.
5. Merchant webhook usually unnecessary — they were already paid.

Index Aave (or our vault): `LiquidationCall`, `Borrow`, `Repay`, `Supply`.

**Disclose:** Aave (or the vault’s Aave leg) can close the position **whenever health fails**, including before 30 days. Promising “safe for 30 days” is false unless we overcollateralize enough *and* still never guarantee it.

Optional: we auto-repay from a buffer (we eat that USDC). That is a product decision, not a protocol feature.

---

## Suggested first slices (when we resume)

1. **Honest Aave (or production Mezo) borrow-to-pay**  
   One chain, one collateral, borrowed token = payment token, VAS/origination, repay deep-link to the protocol. Emails on HF optional.

2. **Do not start with** our 30-day late curve + 8/4 warehouse book until (1) is boring and we have USDC liquidity + legal.

3. Checkout UI is the easy part. Oracle, inventory, insolvency, and lending law are the hard part.

---

## Out of scope until we say otherwise

- Native BTC (no wrap) as Aave collateral
- Flash-loan BNPL
- Replacing escrow capture
- Admin “stop this liquidation” without repaying
- Hardcoded Aave APY in the UI
- NodeRails holding user keys or user collateral outside a public vault
