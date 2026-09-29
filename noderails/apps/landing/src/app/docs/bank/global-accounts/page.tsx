import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function GlobalBankAccountsPage() {
  return (
    <>
      <h1>Global Bank Accounts</h1>
      <p className="subtitle">
        Open receiving accounts so customers and partners can pay you through local rails
        (ACH, SEPA, Pix, SPEI, Faster Payments, and more). Accounts live under Bank in the dashboard.
      </p>

      <Callout type="info" title="Naming">
        Product copy uses <strong>global bank accounts</strong>. Do not call them virtual accounts
        or VAs in merchant-facing text.
      </Callout>

      <h2>Supported examples</h2>
      <ul>
        <li><strong>USD</strong> (United States) - ACH, Wire, FedNow</li>
        <li><strong>EUR</strong> (Europe) - SEPA</li>
        <li><strong>MXN</strong> (Mexico) - SPEI</li>
        <li><strong>BRL</strong> (Brazil) - Pix</li>
        <li><strong>GBP</strong> (United Kingdom) - Faster Payments</li>
        <li><strong>COP</strong> (Colombia) - local bank transfer</li>
      </ul>
      <p>Availability depends on environment, compliance, and partner coverage.</p>

      <h2>How to open an account</h2>
      <ol>
        <li>Open <strong>Bank</strong> in the merchant dashboard.</li>
        <li>Pick a country under open / available accounts.</li>
        <li>Complete identity if it is not already verified for that environment.</li>
        <li>Pay the annual fee for that country through NodeRails checkout when prompted.</li>
        <li>After confirmation on a signed <code>payment.captured</code>, the account becomes available.</li>
        <li>Deposit instructions and activity appear on the account detail page.</li>
      </ol>

      <Callout type="warning" title="Annual fee">
        Global bank accounts are billed per country per year (published dashboard rates, for example
        $30 / $40). Fee checkout must succeed before the rail is fully live. Test environments may
        use sandbox partners and simulation tools.
      </Callout>

      <h2>After it is open</h2>
      <ul>
        <li>Share deposit instructions from the account page.</li>
        <li>Track inbound activity and fees on the same account view.</li>
        <li>Use Own account when you want to settle crypto sales out to a bank you already own.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><Link href="/docs/bank/own-account">Own bank account</Link></li>
        <li><Link href="/docs/bank/settle-to-bank">Settle to Bank</Link></li>
        <li><a href="/products/bank">Bank product page</a></li>
      </ul>
    </>
  );
}
