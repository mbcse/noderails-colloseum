import { CodeBlock, Endpoint, Callout, ResponseTable, ResponseField } from '@/components/docs/ui';

export default function PricesPage() {
  return (
    <>
      <h1>Prices</h1>
      <p className="subtitle">
        The Prices API provides real-time cryptocurrency price data and conversion between fiat
        and crypto amounts. Prices are sourced via the BPC service. This is a{' '}
        <strong>public API</strong>, no authentication required.
      </p>

      <hr />

      <h2>Get price or convert</h2>
      <Endpoint method="GET" path="/prices" />

      <p>
        Unified endpoint for spot prices and fiat↔token conversion. Pass <code>asset</code> as a{' '}
        <strong>tokenKey</strong> (preferred, e.g. <code>SUI-202</code>, <code>USDC-137</code>), a
        symbol (e.g. <code>ETH</code>), or <code>contract-chain</code> (e.g.{' '}
        <code>0xa0b8...-1</code>).
      </p>

      <h3>Query parameters</h3>
      <table>
        <thead>
          <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>asset</code></td><td><code>string</code></td><td>Yes</td><td>Token key, symbol, or contract-chain identifier</td></tr>
          <tr><td><code>currency</code></td><td><code>string</code></td><td>No</td><td>Fiat currency code (default: &quot;USD&quot;). Supports USD and EUR.</td></tr>
          <tr><td><code>amountFiat</code></td><td><code>number</code></td><td>No</td><td>Fiat amount to convert to crypto</td></tr>
          <tr><td><code>tokenAmount</code></td><td><code>number</code></td><td>No</td><td>Token amount to convert to fiat</td></tr>
        </tbody>
      </table>

      <Callout type="info" title="Conversion">
        Omit <code>amountFiat</code> and <code>tokenAmount</code> for a spot price only. Provide
        one of them for conversion in the corresponding direction.
      </Callout>

      <CodeBlock
        language="typescript"
        title="Spot price by tokenKey"
        code={`const result = await fetch(
  'https://api.noderails.com/prices?asset=SUI-202&currency=USD'
).then((r) => r.json());

console.log(result.data.priceFiat); // spot price in USD`}
      />

      <CodeBlock
        language="typescript"
        title="Fiat to token (checkout)"
        code={`const result = await fetch(
  'https://api.noderails.com/prices?asset=USDC-137&currency=USD&amountFiat=100'
).then((r) => r.json());

console.log(result.data.tokenAmount); // crypto amount for $100`}
      />

      <CodeBlock
        language="bash"
        title="cURL"
        code={`# Spot price
curl "https://api.noderails.com/prices?asset=SUI-202&currency=USD"

# Fiat → token
curl "https://api.noderails.com/prices?asset=USDC-137&currency=EUR&amountFiat=50"`}
      />

      <h3>Response</h3>
      <CodeBlock
        language="json"
        title="Convert response (fiat → crypto)"
        code={`{
  "success": true,
  "data": {
    "asset": "USDC-137",
    "symbol": "USDC",
    "currency": "USD",
    "priceFiat": 1,
    "cachedAt": "2025-01-15T10:30:00.000Z",
    "amountFiat": 100,
    "tokenAmount": "100.000000000000000000"
  }
}`}
      />

      <ResponseTable title="Response fields">
        <ResponseField name="asset" type="string" description="Resolved asset identifier" />
        <ResponseField name="symbol" type="string" description="Token symbol (e.g. ETH, USDC)" />
        <ResponseField name="currency" type="string" description="Fiat currency for the quote" />
        <ResponseField name="priceFiat" type="number" description="Current token price in the selected fiat currency" />
        <ResponseField name="cachedAt" type="string" description="ISO 8601 timestamp when the price was cached" />
        <ResponseField name="amountFiat" type="number" description="Fiat amount (when converting)" />
        <ResponseField name="tokenAmount" type="string" description="Token amount (when converting)" />
      </ResponseTable>

      <hr />

      <h2>Wallet balance</h2>
      <Endpoint method="GET" path="/balance" />

      <p>
        Returns on-chain wallet balance for a token on a supported chain. Balances are fetched via
        BPC - no direct chain RPC from the browser is required.
      </p>

      <h3>Query parameters</h3>
      <table>
        <thead>
          <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>chainId</code></td><td><code>number</code></td><td>Yes</td><td>NodeRails chain ID</td></tr>
          <tr><td><code>address</code></td><td><code>string</code></td><td>Yes</td><td>Wallet address (EVM hex, Solana base58, Sui address)</td></tr>
          <tr><td><code>token</code></td><td><code>string</code></td><td>No</td><td><code>native</code>, contract/mint address, or Sui coin type</td></tr>
          <tr><td><code>tokenKey</code></td><td><code>string</code></td><td>No</td><td>Resolve token from registry when <code>token</code> is omitted</td></tr>
          <tr><td><code>includePrice</code></td><td><code>boolean</code></td><td>No</td><td>Attach fiat value (<code>true</code> / <code>false</code>)</td></tr>
          <tr><td><code>currency</code></td><td><code>string</code></td><td>No</td><td>Fiat currency for value (default: USD)</td></tr>
        </tbody>
      </table>

      <CodeBlock
        language="bash"
        title="cURL"
        code={`# Sui testnet USDC balance
curl "https://api.noderails.com/balance?chainId=202&address=0x...&token=0x6246...::sui_usdc::SUI_USDC"

# EVM native ETH
curl "https://api.noderails.com/balance?chainId=1&address=0x...&token=native&includePrice=true&currency=USD"`}
      />

      <hr />

      <h2>Batch balances</h2>
      <Endpoint method="POST" path="/balance/batch" />

      <p>Fetch up to 50 wallet balances in one request.</p>

      <CodeBlock
        language="json"
        title="Request body"
        code={`{
  "includePrice": true,
  "currency": "USD",
  "items": [
    { "chainId": 1, "address": "0x...", "token": "native" },
    { "chainId": 137, "address": "0x...", "tokenKey": "USDC-137" }
  ]
}`}
      />
    </>
  );
}
