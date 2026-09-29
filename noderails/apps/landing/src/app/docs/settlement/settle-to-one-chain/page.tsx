import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function SettleToOneChainPage() {
  return (
    <>
      <h1>Settle to One Chain</h1>
      <p className="subtitle">
        Accept payments across multiple EVM chains, then settle your merchant settlement balance
        to a single destination chain and wallet. NodeRails handles bridging during settlement.
      </p>

      <Callout type="info" title="Why merchants use this">
        You can offer Ethereum, Polygon, Base, and other EVM networks at checkout without
        managing balances on every chain. Treasury lives on one chain you pick.
      </Callout>

      <h2>What it does</h2>
      <ul>
        <li>Customers still pay on any enabled pay-in chain and token.</li>
        <li>After capture and the timelock, settlement bridges your settlement balance to your settle chain.</li>
        <li>Funds land on the settlement wallet you authorized for that chain.</li>
        <li>A published single-chain settlement fee can apply when the feature is on.</li>
      </ul>

      <h2>How to enable</h2>
      <ol>
        <li>Open app <strong>Settings</strong> in the merchant dashboard.</li>
        <li>Enable <strong>Settle to One Chain</strong> (often after Convert to One Token).</li>
        <li>Choose the destination chain and settlement token.</li>
        <li>
          Confirm the settlement wallet. The dialog uses your current settlement wallet, or the
          app receiving wallet if none is set. Connecting a different wallet requires a signature.
        </li>
        <li>Save. New payments follow the new destination.</li>
      </ol>

      <Callout type="warning" title="Wallet authorization">
        If you do not authorize a new wallet, the current settlement wallet stays. Enabling
        single-chain with an empty settlement wallet can copy a valid EVM receiving wallet.
      </Callout>

      <h2>Prerequisites</h2>
      <ul>
        <li>EVM app with chains and tokens enabled.</li>
        <li>Receiving / settlement wallet connected for the destination family.</li>
        <li>For bank settlement, convert + settle-to-one-chain are required first.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><Link href="/docs/settlement/convert-to-one-token">Convert to One Token</Link></li>
        <li><Link href="/docs/bank/settle-to-bank">Settle to Bank</Link></li>
        <li><Link href="/docs/settlement">Settlement overview</Link></li>
      </ul>
    </>
  );
}
