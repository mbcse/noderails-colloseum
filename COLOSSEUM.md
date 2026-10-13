# NodeRails multi-chain payments

NodeRails is payment infrastructure for crypto commerce. Merchants use one product surface (payment intents, links, invoices, subscriptions) while settlement follows **on-chain escrow** on the EVM networks below or the **Solana** Anchor program when that rail is enabled.

This document centers on the chains we ship and test most in this repo: **Tempo**, **Base**, **Arbitrum**, **Robinhood Chain**, and **Solana**. Other EVM networks use the same Solidity contracts and admin registration flow.

## Tempo

Tempo is an EVM chain with TIP-20 style fee tokens. NodeRails deploys the same escrow facade pattern as other EVM rails, with **separate Logic + Escrow** broadcasts on Moderato because of the 30M gas cap.

| | Moderato testnet | Mainnet |
|--|------------------|---------|
| Chain ID | `42431` | `4217` |
| RPC | `https://rpc.moderato.tempo.xyz` | `https://rpc.tempo.xyz` |
| Explorer | `https://explore.testnet.tempo.xyz` | `https://explore.tempo.xyz` |
| Escrow Logic | `0x9080212268bd2a34991a36841a538223cf81ae38` | deploy via `noderails-contracts/ops-ui` |
| Escrow | `0x86efe26b441075bf77d0dd938770a1d484692372` | see `deployData/` after deploy |
| Merchant Manager | `0x1998d37d674ac17b55fea185c0677250b31d1d3c` | see `deployData/` after deploy |

Foundry flags and fee-token fields live in `noderails/noderails-contracts/script/chains.json` (`tempo_moderato`, `tempo`).

## Base

| | Base mainnet | Base Sepolia |
|--|--------------|--------------|
| Chain ID | `8453` | `84532` |
| Explorer | `https://basescan.org` | `https://sepolia.basescan.org` |
| Escrow (mainnet) | `0x2fa8ec8170e74afa89991e44e7d8c984f7867e86` | deploy / register per environment |
| Merchant Manager (mainnet) | `0xa1c9f1ca5e665958bce9d734ada691601b781972` | deploy / register per environment |

Chain metadata: `noderails/noderails-contracts/script/chains.json` (`base`, `base_sepolia`).

## Arbitrum

| | Arbitrum One | Arbitrum Sepolia |
|--|--------------|------------------|
| Chain ID | `42161` | `421614` |
| Explorer | `https://arbiscan.io` | `https://sepolia.arbiscan.io` |
| Contracts | Same `NodeRailsEscrow` + `NodeRailsMerchantManager` bytecode; register addresses in admin after deploy | same |

Deploy with Foundry / ops-ui or point admin at existing deployments. `script/chains.json` lists `arbitrum` and `arbitrum_sepolia`.

## Robinhood Chain

| Field | Robinhood Chain testnet |
|-------|-------------------------|
| Chain ID | `46630` |
| RPC | `https://robinhood-testnet.drpc.org` |
| Explorer | `https://explorer.testnet.chain.robinhood.com` |
| Escrow | `0x5a4bc03b982a909fc1e665cf63c5e662ee74cb2a` |
| Merchant Manager | `0x2fa8ec8170e74afa89991e44e7d8c984f7867e86` |

Recorded in `noderails/noderails-contracts/deployData/customChains.json` and `contractAddresses.json`.

## Solana

| | |
|--|--|
| Programs | `noderails_escrow`, `noderails_merchant_manager` (Anchor) under `noderails/noderails-solana/` |
| Tooling | `deploy.devnet.json`, `deploy.mainnet.json`, IDL in `target/idl/` after build |
| Integration | MTXM submits instructions; Indexer watches program logs when configured |

Enable Solana in admin, register program IDs from your cluster deploy, then run `setup-cli` for MTXM and Indexer hooks.

## TypeScript SDK

Folder: `noderails-sdk/` (`@noderails/sdk`). Server-side client for payment intents, checkout sessions, payouts, and webhooks.

## Architecture

```
Shopper / merchant backends
        |
        v
  NodeRails API + payment UI + dashboard
        |
        +---- BPC --------> balances and prices (EVM + Solana)
        |
        +---- MTXM -------> sign + broadcast
        |
        +---- Indexer ----> contract / program events
        |
        v
  Escrow on Tempo / Base / Arbitrum / Robinhood Chain, or Solana program
```


## MTXM (Multichain Transaction Manager)

Folder: `MultichainTxManager/`

MTXM handles sign, broadcast, and confirmation for on-chain steps that merchants should not run from the API process. NodeRails calls MTXM for escrow capture, settle, refund, dispute resolution, and merchant manager payouts. This tree ships the service layout and API types; the public entrypoint is a reference listener until you configure signers in your own deployment.

## Indexer

Folder: `Indexer/`

Indexer watches registered contracts and programs, normalizes events, and delivers HMAC webhooks into NodeRails. MTXM reports what was submitted; Indexer reports what the chain emitted. Together they give reconciliation finance and support can trust.

## BPC (balance and price check)

Folder: `noderails-bpc-service/`

BPC aggregates RPC endpoints, token metadata, live balances, and USD prices for checkout and dashboards. NodeRails uses it so payment UI and merchant screens do not each maintain their own RPC and price soup.


## Demo flow

1. In admin, enable **Tempo Moderato**, **Base Sepolia**, **Arbitrum Sepolia**, **Robinhood Chain testnet**, and/or **Solana devnet**.
2. Register contract and program addresses with `noderails/services/setup-cli` (MTXM + Indexer).
3. Create a payment link; pay on the rail you enabled.
4. Confirm intent state in the dashboard and on the matching explorer.

Contact: **mohit@noderails.com**
