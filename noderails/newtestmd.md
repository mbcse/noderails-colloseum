# Bridge Fiat Rails — Architecture Flow Diagrams

> How WallCard integrates KYC, virtual accounts, and transfers with Bridge.
> Existing crypto wallet features (card, 16-digit number, Send/Receive, signer-host) are unchanged.

---

## 1. High-level system architecture

What exists today vs what gets added.

```mermaid
flowchart TB
  subgraph clients [Client layer — member app only]
    Mobile[apps/mobile]
  end

  subgraph wallcard_api [WallCard API — services/api :9080]
    Auth[/v1/auth]
    Wallet[/v1/wallet]
    SignConnect[/v1/onetime-connect]
    Fiat[/v1/fiat — NEW]
    WebhookIn[/v1/webhooks/inbound/bridge — NEW]
    Workers[BullMQ workers]
  end

  subgraph wallcard_signer [Signer-host — unchanged]
    SignerHost[signer-host :9081]
    KeyRegistry[KeyProviderRegistry]
    Privy[PrivyKeyProvider]
  end

  subgraph data [Data layer]
    PG[(PostgreSQL)]
    Redis[(Redis)]
    SM[AWS Secrets Manager]
  end

  subgraph external [External services]
    Bridge[Bridge API v0]
    Bank[User real bank]
    RPC[EVM / Solana RPC]
    PrivyAPI[Privy API]
  end

  Mobile --> Auth
  Mobile --> Wallet
  Mobile --> SignConnect
  Mobile --> Fiat
  Mobile -.->|Phase 2 withdraw signing| SignConnect

  Auth --> PG
  Wallet --> PG
  Wallet --> RPC
  SignConnect --> SignerHost
  SignerHost --> KeyRegistry
  KeyRegistry --> Privy
  Privy --> PrivyAPI

  Fiat --> PG
  Fiat --> Bridge
  Bridge --> WebhookIn
  WebhookIn --> Workers
  Workers --> PG
  Workers --> Mobile

  Bank --> Bridge
  Bridge -->|USDC on-ramp| RPC

  Fiat --> SM
  SignerHost --> SM
```

**Trust boundary:** Mobile never holds Bridge API keys. Only `services/api` calls Bridge.

---

## 2. Two accounts in one app

WallCard keeps its existing identifiers. Bridge adds a separate fiat deposit account.

```mermaid
flowchart LR
  subgraph keep [Existing WallCard — unchanged]
    PAN[Card PAN + PIN + OTP]
    ACCT16[16-digit WallCard number]
    CryptoWallet[EVM + Solana wallets]
    SendCrypto[Send / Request crypto]
  end

  subgraph add [Neo-bank layer — NEW]
    KYC[Bridge KYC]
    VA[Virtual USD Account]
    BankDetails[Routing + Account number]
    Transfers[Transfers on/off-ramp]
  end

  ACCT16 -->|P2P crypto| SendCrypto
  BankDetails -->|ACH / Wire| VA
  VA -->|auto convert| CryptoWallet
  KYC --> VA
  KYC --> Transfers
  Transfers -->|Phase 2 cash out| BankDetails
  CryptoWallet -->|Phase 2 USDC send| Transfers
```

| Identifier | Purpose | Created when |
|---|---|---|
| 16-digit WallCard number | Other WallCard users send you crypto | ProfileSetup (today) |
| Virtual bank account | Your real bank sends you USD | After KYC approved |
| EVM address | Receives USDC from Bridge + on-chain sends | ProfileSetup (today) |

---

## 3. Complete user journey (start to end)

```mermaid
flowchart TD
  Start([User opens WallCard])

  subgraph phase_a [Phase A — existing signup]
    Email[Email OTP]
    Profile[ProfileSetup: PIN name DOB country]
    Issue[Card + crypto wallets issued]
    Home[Home: crypto Send Receive balances]
  end

  subgraph phase_b [Phase B — activate bank]
    Account[Account tab]
    Activate[Tap Activate bank account]
  end

  subgraph phase_c [Phase C — Step 1 KYC]
    KycCheck{KYC approved?}
    Sheet[In-app sheet: Verify identity]
    Form[Native form: Enter details]
    WebView[Embedded ToS + KYC WebView]
    Wait{Bridge kyc_status}
  end

  subgraph phase_d [Phase D — Step 2 Virtual account]
    CreateVA[API creates virtual USD account]
    ShowVA[Virtual USD Account screen]
    CopyDetails[User copies routing + account]
  end

  subgraph phase_e [Phase E — money in]
    BankSend[User sends ACH Wire from real bank]
    BridgeConvert[Bridge converts USD to USDC]
    WalletCredit[USDC in existing EVM wallet]
    Notify[Push + Activity update]
  end

  subgraph phase_f [Phase F — Phase 2 withdraw]
    LinkBank[Link personal bank External Account]
    Withdraw[Withdraw amount]
    SignUSDC[PIN OTP sign USDC send]
    BankPayout[Bridge pays linked bank]
  end

  Start --> Email --> Profile --> Issue --> Home
  Home --> Account --> Activate --> KycCheck
  KycCheck -->|No| Sheet --> Form --> WebView --> Wait
  Wait -->|rejected| Sheet
  Wait -->|under_review| Wait
  Wait -->|approved| KycCheck
  KycCheck -->|Yes| CreateVA --> ShowVA --> CopyDetails
  CopyDetails --> BankSend --> BridgeConvert --> WalletCredit --> Notify
  ShowVA --> LinkBank --> Withdraw --> SignUSDC --> BankPayout
```

---

## 4. KYC flow — sequence diagram (Step 1)

```mermaid
sequenceDiagram
  actor User
  participant App as Mobile app
  participant API as WallCard API
  participant DB as PostgreSQL
  participant Bridge as Bridge API
  participant Persona as Bridge KYC widget

  User->>App: Account → Activate bank account
  App->>API: GET /v1/fiat/status
  API->>DB: Read FiatCustomer
  API-->>App: kycStatus not_started

  User->>App: Continue on Verify identity sheet
  User->>App: Fill Enter your details form
  App->>API: POST /v1/fiat/kyc/session
  API->>Bridge: POST /v0/kyc_links
  Note over API,Bridge: full_name email type individual redirect_uri
  Bridge-->>API: tos_link kyc_link kyc_status
  API->>DB: Upsert FiatCustomer
  API-->>App: tosUrl kycUrl

  App->>Persona: Open tosUrl in WebView
  User->>Persona: Accept terms
  App->>Persona: Open kycUrl in WebView
  User->>Persona: Upload ID + selfie

  Bridge->>API: Webhook customer KYC updated
  API->>DB: Update kycStatus approved
  API->>App: Push or poll on deep link

  App->>API: GET /v1/fiat/status
  API-->>App: kycStatus approved customerId
```

---

## 5. Virtual account on-ramp — sequence diagram (Step 2)

```mermaid
sequenceDiagram
  actor User
  participant App as Mobile app
  participant API as WallCard API
  participant DB as PostgreSQL
  participant Bridge as Bridge API
  participant Bank as User bank
  participant Chain as EVM wallet RPC

  User->>App: Create USD deposit account
  App->>API: POST /v1/fiat/virtual-accounts
  API->>DB: Verify kycStatus approved
  API->>DB: Read user EVM Account.address
  API->>Bridge: POST /v0/customers/id/virtual_accounts
  Note over API,Bridge: source usd destination usdc base userAddress
  Bridge-->>API: source_deposit_instructions
  API->>DB: Insert FiatRailAccount
  API-->>App: routing accountNumber bankName

  User->>App: Copy deposit details
  User->>Bank: Send ACH or Wire
  Bank->>Bridge: Fiat received

  Bridge->>API: Webhook funds_received
  Bridge->>Chain: Send USDC to user address
  Bridge->>API: Webhook payment_processed

  API->>DB: Record deposit activity
  API->>App: Push deposit received
  App->>API: GET /v1/wallet/balances
  API->>Chain: Read USDC balance
  API-->>App: Updated balance on Home
```

---

## 6. Transfer off-ramp — sequence diagram (Step 3, Phase 2)

```mermaid
sequenceDiagram
  actor User
  participant App as Mobile app
  participant API as WallCard API
  participant Signer as signer-host
  participant Bridge as Bridge API
  participant Bank as Linked personal bank

  User->>App: Bank → Withdraw
  App->>API: POST /v1/fiat/external-accounts
  API->>Bridge: POST /v0/customers/id/external_accounts
  Bridge-->>API: external_account_id

  User->>App: Enter amount select bank
  App->>API: POST /v1/fiat/transfers/prepare
  API->>Bridge: POST /v0/transfers
  Note over API,Bridge: crypto source USDC fiat destination external_account
  Bridge-->>API: transfer_id deposit_address amount

  App->>API: POST /v1/wallet/transfer/prepare
  App->>API: POST /v1/onetime-connect/start
  User->>App: Enter PIN + OTP
  App->>API: POST /v1/onetime-connect/id/confirm
  API->>Signer: Sign USDC transaction
  Signer-->>API: Signed tx broadcast

  Bridge->>API: Webhook transfer payment_processed
  Bridge->>Bank: ACH or Wire payout
  API->>DB: Update FiatTransfer status
  API->>App: Push withdrawal complete
```

---

## 7. Backend module map (where code lives)

```mermaid
flowchart TB
  subgraph mobile [apps/mobile]
    AccountScreen[AccountScreen Activate CTA]
    BankFeature[features/fiat/]
    BankHome[BankHome]
    KycWebView[BankKycWebView]
    VirtualScreen[VirtualUsdAccount]
    WithdrawScreen[WithdrawScreen Phase2]
  end

  subgraph api [services/api]
    FiatRoutes[modules/fiat/fiat.routes.ts]
    WebhookRoutes[modules/fiat/fiat-webhook.routes.ts]
    Orchestrator[lib/fiat-rails/orchestrator.ts]
    Registry[lib/fiat-rails/registry.ts]
    BridgeProvider[lib/fiat-rails/providers/bridge/]
    FiatWorker[workers/fiat-webhook.worker.ts]
  end

  subgraph packages [shared packages]
    Common[packages/common schemas + provider IDs]
    Database[packages/database Prisma models]
    Queue[packages/queue FiatWebhookProcessJob]
  end

  AccountScreen --> BankHome
  BankHome --> KycWebView
  BankHome --> VirtualScreen
  BankHome --> WithdrawScreen

  BankFeature -->|GET POST /v1/fiat/*| FiatRoutes
  FiatRoutes --> Orchestrator
  Orchestrator --> Registry
  Registry --> BridgeProvider
  Orchestrator --> Database

  WebhookRoutes --> FiatWorker
  FiatWorker --> Orchestrator
  FiatWorker --> Queue

  FiatRoutes --> Common
  Orchestrator --> Common
```

---

## 8. Bridge API mapping

| WallCard step | User action | WallCard API | Bridge API |
|---|---|---|---|
| **1 KYC** | Activate → verify identity | `POST /v1/fiat/kyc/session` | `POST /v0/kyc_links` |
| **1 KYC** | Wait for result | `GET /v1/fiat/status` + webhook | Customer / KYC status |
| **2 Virtual account** | Create deposit account | `POST /v1/fiat/virtual-accounts` | `POST /v0/customers/{id}/virtual_accounts` |
| **2 Virtual account** | View details | `GET /v1/fiat/virtual-accounts` | List / get VA |
| **2 Virtual account** | See deposits | `GET /v1/fiat/virtual-accounts/:id/activity` | VA activity |
| **3 Transfer off-ramp** | Link bank | `POST /v1/fiat/external-accounts` | `POST /v0/customers/{id}/external_accounts` |
| **3 Transfer off-ramp** | Withdraw | `POST /v1/fiat/transfers/prepare` | `POST /v0/transfers` |
| **All** | Async updates | `POST /v1/webhooks/inbound/bridge` | Bridge webhooks |

Every Bridge POST from WallCard API includes `Api-Key` and `Idempotency-Key`.

---

## 9. Data model relationships

```mermaid
erDiagram
  User ||--o| FiatCustomer : has
  User ||--o{ Account : has
  User ||--o{ FiatRailAccount : has
  User ||--o{ FiatTransfer : has
  FiatCustomer ||--o{ FiatRailAccount : owns
  FiatCustomer ||--o{ FiatTransfer : owns
  FiatTransfer }o--o| SigningRequest : "Phase 2 audit link"

  User {
    string id
    string email
    string accountNumber16
    string displayName
    string country
  }

  Account {
    string address
    string chainFamily
  }

  FiatCustomer {
    string externalCustomerId
    string kycStatus
    string providerId
  }

  FiatRailAccount {
    string kind
    string externalAccountId
    json depositInstructions
    string destinationAddress
  }

  FiatTransfer {
    string direction
    string status
    string externalTransferId
    string onChainTxHash
  }
```

---

## 10. What does NOT change

```mermaid
flowchart LR
  subgraph unchanged [Unchanged in this integration]
    Signup[Auth onboarding ProfileSetup]
    CardIssue[Card + 16-digit number]
    HomeBanner[Home WallCard account banner]
    SendReceive[Send Request Top up crypto]
    SignerHost[signer-host + Privy]
    SDK[dApp SDK session-connect]
    Mezo[Mezo borrow feature]
  end
```

---

## Related docs

- Implementation plan: `.cursor/plans/bridge_neo-bank_integration_13a081c8.plan.md`
- Product guide: [WALLCARD_MASTER_GUIDE.md](./WALLCARD_MASTER_GUIDE.md)
- Bridge docs: https://apidocs.bridge.xyz/
