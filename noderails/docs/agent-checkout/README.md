# Agent + human checkout (design note)

Status: Discussion only. Do not implement until we come back to this.

Saved: 2026-09-27

Related: [Checkout collateral / credit](../checkout-collateral-credit/README.md).

Goal: one checkout that works for people (current hosted UI) and for agents (readable state + exact next cryptographic action). If the agent has a key, it signs and sends. NodeRails never holds the agent key.

---

## Product sentence

Same checkout link. People get the current page. Agents get a readable payment brief plus the exact next cryptographic action. If they have a key, they sign; we never take the key.

Do **not** make the agent scrape the human checkout. Same URL, two representations.

---

## How it works today

### Humans

They hit `pay.noderails.com/checkout/{session}`. That page is HTML + React: pick chain/token, connect wallet, sign, we capture. That path is already good. Leave it.

### Agents today (if they only have that page)

- Browser-use agents (Operator, Computer Use) try to click the UI. Fragile. Breaks when we restyle.
- LLM agents with tools need an API. They cannot reliably “see” a checkout the way a person does.
- **Headless checkout** already has the real machine flow: options → prepare → confirm → submit tx. It is a **merchant secret-key** API. It is for the merchant backend, not for an agent that landed on a payment link. Putting `sk` in an agent is the wrong trust model.

So: humans have a product. Agents do not have a first-class client on the hosted page. Headless is the closest engine, aimed at the wrong caller.

Existing references:

- Hosted: `noderails.checkoutSessions.create` + payment-ui `/checkout/[sessionId]`
- Headless: `noderails.headlessCheckout.*` (`paymentOptions`, `prepare`, `confirm`, `submitUserTx`)
- Docs: `/docs/sdk/headless-checkout`
- Landing `llms.txt` is docs discovery only, not per-checkout state

---

## What we want

An agent should:

1. Open the same checkout URL (or a well-known sibling).
2. Get a **readable, structured state** (who/what/how much, allowed tokens, next action).
3. If it holds a key (or a wallet tool), **sign/send**.
4. Tell NodeRails the signature or tx hash.
5. Get the next state: paid, need gas, wrong chain, etc.

That is not “HTML but for robots.” It is a **state machine with prose + JSON**, same session as the human page.

---

## How to frame it (three layers)

### 1. Discovery (same link)

`GET /checkout/{id}`

- Browser / `Accept: text/html` → current UI
- Agent / `Accept: application/json` (or `text/markdown`) → machine document

Also a boring sibling: `/.well-known` or `?format=agent`. Agents already look for `llms.txt`-style docs; a checkout can do the same for *this payment*.

The document should read like a short human brief **and** be parseable:

- Who is charging, amount, currency, expiry
- Allowed chains/tokens
- What the agent must do next (`select_token`, `sign_typed_data`, `send_tx`, `wait`, `done`)
- Exact payload to sign (typed data / unsigned tx) — not “click Pay”
- Where to POST the result
- What not to do (do not send the merchant secret key, do not pay a different address)

### 2. Public session API (no merchant `sk`)

A session-scoped token already in the URL (or a short-lived checkout token). Enough to: list options, prepare for a wallet the agent presents, confirm, submit user tx.

Same server functions as headless, **scoped to that session only**. Merchant secret stays on the merchant server.

### 3. Signing is the agent’s problem, not NodeRails’

If the agent has a key (local wallet, TEE, Coinbase-style agent wallet, WallCard-style “card custody, you keep control”): it signs the payload we returned and posts it back.

If it does **not** have a key: the document says “ask the human to sign in their wallet” or return a deep link.

Do not have NodeRails hold agent keys.

**We describe and authorize the payment; the agent (or human) is the signer.**

---

## Client table

| Client | We return | They do |
| --- | --- | --- |
| Person | Current checkout UI | Connect wallet, click |
| Agent | Markdown + JSON state | Follow `nextAction`, sign if it can |
| Merchant backend | Existing headless + `sk` | Embed checkout in their own app |

Computer-use on HTML can stay as a fallback. It should not be the design.

---

## What is already reusable

`headlessCheckout.paymentOptions` / `prepare` / `confirm` / `submitUserTx` is the right sequence.

Expose a **public, session-bound** version of that to whoever opened the hosted link. Human JS already talks to the API for quotes and capture; an agent would call the same steps without the DOM.

Do not invent a second capture path.

---

## Hard parts (decide before building)

- **Who may pay.** An agent with a random key paying a session is fine if the session is “anyone who pays this amount.” If the session is bound to a customer email/wallet, the agent must prove that identity.
- **Key in the agent.** Possible, and dangerous if the prompt can be tricked into a different `to` / amount. The prepare step must pin `to`, amount, chain, deadline. The agent should refuse to sign anything that does not match the checkout document.
- **Gas and chain.** Agents fail here more than humans. The state doc must say “wrong chain” / “need X native for gas” as first-class next actions.
- **Prompt injection.** If the human page and the agent doc can say different things, an attacker wins. One session state, two renderers.
- **Idempotency.** Agents retry. Confirm/submit must stay safe to call twice.

---

## Suggested first slice (when we resume)

Not a new wallet product. Just:

1. `GET` the session as JSON/markdown for agents
2. Session-bound `prepare` for a presented address
3. Same confirm / submit-user-tx as headless

Signing tools (WallCard, MCP `sign_and_submit`) sit on top of that later.

---

## Out of scope until we say otherwise

- Scraping-optimized HTML
- Giving agents the merchant secret key
- NodeRails custodial signing for agents
- Replacing the human checkout UI
