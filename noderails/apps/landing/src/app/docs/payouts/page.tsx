import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function PayoutsOverviewPage() {
  return (
    <>
      <h1>Payouts</h1>
      <p className="subtitle">
        Send crypto from an authorized payout wallet to one or many recipients. Use the dashboard
        for ops, or the SDK / API for productized payouts. Recipients receive the full amount; you
        pay the fee on top.
      </p>

      <Callout type="info" title="Dual authorization">
        Payouts require your wallet signature plus NodeRails. Authorize the payout wallet once per
        year in app settings, then approve ERC-20 allowance (or deposit native for that chain)
        before sending.
      </Callout>

      <h2>What you can do</h2>
      <ul>
        <li><strong>Send now</strong> - one recipient or a bulk EVM list (up to 200 lines).</li>
        <li><strong>Schedule once</strong> - fire at a UTC time.</li>
        <li><strong>Recurring</strong> - every N days in UTC; pause, resume, or cancel.</li>
        <li><strong>Address book</strong> - save recipients per app.</li>
        <li><strong>Payroll CSV</strong> - import label, wallet, optional email, and amount.</li>
      </ul>

      <h2>Chain limits</h2>
      <ul>
        <li><strong>EVM</strong> - bulk supported; ERC-20 uses allowance to Merchant Manager; native uses deposited balance.</li>
        <li><strong>Solana</strong> - native SOL, one recipient.</li>
        <li><strong>Sui</strong> - create may be stored; on-chain execute is not enabled for schedules in the current release.</li>
      </ul>

      <h2>Dashboard flow</h2>
      <ol>
        <li>Connect the payout wallet and sign yearly payout authorization in Settings.</li>
        <li>Fund the strip (approve token or deposit native) until coverage is enough.</li>
        <li>Open Payouts: add recipients, import CSV, or pick from the address book.</li>
        <li>Review recipient total, fee, and what you pay.</li>
        <li>Send now, schedule, or attach a recurring interval.</li>
        <li>Track status on Activity (processing, executed, failed).</li>
      </ol>

      <Callout type="warning" title="Bank deposits are separate">
        Settling your merchant settlement balance to fiat uses{' '}
        <Link href="/docs/bank/settle-to-bank">Settle to Bank</Link>.
        Payouts do not replace Bank settlement.
      </Callout>

      <h2>Developer references</h2>
      <ul>
        <li><Link href="/docs/sdk/payouts">SDK: Payouts</Link></li>
        <li><Link href="/docs/api-reference/payouts">API: Payouts</Link></li>
        <li>Webhooks: <code>payout.executed</code>, <code>payout.failed</code></li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><a href="/products/payouts">Payouts product page</a></li>
        <li><Link href="/docs/bank">Bank</Link></li>
        <li><Link href="/docs/step-by-step-guide">Step-by-Step Guide</Link></li>
      </ul>
    </>
  );
}
