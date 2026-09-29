import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function ConvertToOneTokenPage() {
  return (
    <>
      <h1>Convert to One Token</h1>
      <p className="subtitle">
        Accept payments in many cryptocurrencies while settling into a single token you choose
        (for example a stablecoin). Conversion runs on EVM settlement paths.
      </p>

      <Callout type="info" title="Why merchants use this">
        Customers can pay with whatever token they hold. You receive one asset, which limits
        inventory of random tokens and reduces price volatility on settlement.
      </Callout>

      <h2>What it does</h2>
      <ul>
        <li>You keep accepting the chains and tokens enabled on the app (or overridden per request).</li>
        <li>At settlement time, your merchant settlement balance converts into your target token.</li>
        <li>A published conversion service fee can apply when the feature is enabled (snapshotted on the payment).</li>
      </ul>

      <h2>How to enable</h2>
      <ol>
        <li>Open the merchant dashboard and select your app.</li>
        <li>Go to <strong>Settings</strong> and open settlement options.</li>
        <li>Enable <strong>Convert to One Token</strong>.</li>
        <li>Pick the destination token from the allowlisted settlement tokens.</li>
        <li>Save. New captures use the new rules.</li>
      </ol>

      <Callout type="warning" title="EVM only">
        Token conversion settlement is an EVM feature. Solana and Sui continue to settle in the
        paid asset unless you use other product rails.
      </Callout>

      <h2>Works with</h2>
      <ul>
        <li>
          <Link href="/docs/settlement/settle-to-one-chain">Settle to One Chain</Link>
          {' '}- convert, then bridge everything to one chain.
        </li>
        <li>
          <Link href="/docs/bank/settle-to-bank">Settle to Bank</Link>
          {' '}- bank settlement requires conversion and single-chain settlement to be configured.
        </li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><Link href="/docs/settlement">Settlement overview</Link></li>
        <li><Link href="/docs/supported-assets">Supported chains and tokens</Link></li>
      </ul>
    </>
  );
}
