import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function SettlementOverviewPage() {
  return (
    <>
      <h1>Settlement</h1>
      <p className="subtitle">
        After a payment is captured, NodeRails settles your merchant settlement balance to your
        wallet or bank. On EVM apps you can also convert incoming tokens and consolidate onto one
        chain.
      </p>

      <Callout type="info" title="Default behavior">
        With conversion and single-chain settlement both off, each payment settles in the token
        and chain the customer paid with, after the escrow timelock. Solana and Sui keep that
        default path.
      </Callout>

      <h2>Where to configure</h2>
      <p>
        Open your app in the merchant dashboard, then <strong>Settings</strong>. Settlement
        options live next to wallets, chains, and tokens. Changes apply to new payments; they
        do not rewrite payments already in escrow.
      </p>

      <h2>Settlement options</h2>
      <ul>
        <li>
          <Link href="/docs/settlement/convert-to-one-token">Convert to One Token</Link>
          {' '}- accept many tokens, settle into one chosen token (EVM).
        </li>
        <li>
          <Link href="/docs/settlement/settle-to-one-chain">Settle to One Chain</Link>
          {' '}- bridge your settlement balance onto one destination chain and wallet (EVM).
        </li>
        <li>
          <Link href="/docs/bank/settle-to-bank">Settle to Bank</Link>
          {' '}- convert your settlement balance and deposit fiat to a verified bank account.
        </li>
      </ul>

      <h2>How it fits the payment lifecycle</h2>
      <ol>
        <li><strong>Authorize</strong> - customer authorizes spend (often gasless).</li>
        <li><strong>Capture</strong> - funds move into TimeLock escrow. You can fulfill.</li>
        <li><strong>Settle</strong> - after the timelock, your settlement balance goes to your wallet or bank.</li>
      </ol>
      <p>
        Partial refunds reduce the merchant settlement balance. Refunding the full settlement
        balance closes the payment without a further settle.
      </p>

      <h2>Related</h2>
      <ul>
        <li><Link href="/docs/bank">Bank overview</Link></li>
        <li><Link href="/docs/payouts">Payouts</Link> (sending crypto out is separate from settlement)</li>
        <li><Link href="/docs/step-by-step-guide">Step-by-Step Guide</Link></li>
      </ul>
    </>
  );
}
