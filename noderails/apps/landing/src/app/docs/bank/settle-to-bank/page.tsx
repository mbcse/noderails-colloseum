import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function SettleToBankPage() {
  return (
    <>
      <h1>Settle to Bank</h1>
      <p className="subtitle">
        Keep accepting crypto at checkout. After capture and the escrow timelock, your merchant
        settlement balance converts and deposits as fiat to a verified bank account instead of
        settling only to a wallet.
      </p>

      <Callout type="info" title="Requirements">
        Settle to Bank needs Convert to One Token and Settle to One Chain configured on the app,
        plus a verified bank destination (own account and/or eligible bank setup). Authorization
        uses a yearly bank-settlement signature in the dashboard.
      </Callout>

      <h2>What happens</h2>
      <ol>
        <li>Customer pays on-chain as usual (authorize then capture into escrow).</li>
        <li>Optional partial refunds reduce the merchant settlement balance.</li>
        <li>After the timelock, NodeRails runs bank settlement for that balance.</li>
        <li>Fiat lands on the verified bank account. The same payment record tracks capture through deposit.</li>
      </ol>

      <h2>How to enable</h2>
      <ol>
        <li>Complete <Link href="/docs/bank/own-account">own bank</Link> (or required Bank identity) for the environment.</li>
        <li>In app Settings, enable conversion and single-chain settlement as needed.</li>
        <li>Enable settle to bank / bank destination for the app.</li>
        <li>Sign the bank settlement authorization when prompted (yearly wallet auth).</li>
        <li>New captures become eligible for bank settlement under those rules.</li>
      </ol>

      <Callout type="warning" title="Not the same as Payouts">
        <Link href="/docs/payouts">Payouts</Link> send crypto from your payout wallet to recipient
        wallets. Settle to Bank moves your merchant settlement balance to fiat for treasury. Use
        Bank for deposits; use Payouts for payroll and affiliates.
      </Callout>

      <h2>Coverage</h2>
      <p>
        Bank settlement is built for merchant treasury across a wide set of countries and
        currencies (100+ countries / 120+ currencies in product coverage). Exact corridors depend
        on verification and partner availability.
      </p>

      <h2>Related</h2>
      <ul>
        <li><Link href="/docs/settlement/convert-to-one-token">Convert to One Token</Link></li>
        <li><Link href="/docs/settlement/settle-to-one-chain">Settle to One Chain</Link></li>
        <li><Link href="/docs/bank">Bank introduction</Link></li>
        <li><Link href="/docs/webhooks">Webhooks</Link> for payment and settlement events</li>
      </ul>
    </>
  );
}
