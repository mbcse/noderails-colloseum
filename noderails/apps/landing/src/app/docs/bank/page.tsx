import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function BankIntroPage() {
  return (
    <>
      <h1>Bank</h1>
      <p className="subtitle">
        Bank is the merchant fiat rail inside the same dashboard as payments. Verify identity,
        add your own business account, open global bank accounts for local receiving, and settle
        captured crypto to fiat.
      </p>

      <Callout type="info" title="Dashboard only">
        Bank onboarding and settle-to-bank are configured in the merchant dashboard under{' '}
        <strong>Bank</strong>. They are not exposed as public SDK create endpoints. Crypto payouts
        to wallets use <Link href="/docs/payouts">Payouts</Link> instead.
      </Callout>

      <h2>What Bank includes</h2>
      <ul>
        <li>
          <Link href="/docs/bank/own-account">Own bank account</Link>
          {' '}- connect the business account you already have (no extra account open fee).
        </li>
        <li>
          <Link href="/docs/bank/global-accounts">Global bank accounts</Link>
          {' '}- open receiving accounts (for example USD, EUR, MXN, BRL, GBP, COP) so partners can pay you locally.
        </li>
        <li>
          <Link href="/docs/bank/settle-to-bank">Settle to Bank</Link>
          {' '}- after escrow, convert your merchant settlement balance and deposit fiat to a verified account.
        </li>
      </ul>

      <h2>Environments</h2>
      <p>
        Test and production stay separate. Sandbox identity and bank work never touch live rails.
        Production Bank uses live identity and banking partners.
      </p>

      <h2>Identity first</h2>
      <p>
        Business KYC/KYB must complete before an account goes live. Own-account and global-account
        flows both depend on a verified merchant identity for that environment.
      </p>

      <h2>Related product pages</h2>
      <ul>
        <li><a href="/products/bank">Bank product overview</a></li>
        <li><Link href="/docs/settlement">Settlement</Link></li>
        <li><Link href="/docs/step-by-step-guide">Step-by-Step Guide</Link></li>
      </ul>
    </>
  );
}
