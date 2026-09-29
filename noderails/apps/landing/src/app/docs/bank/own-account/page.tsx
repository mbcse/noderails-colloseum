import Link from 'next/link';
import { Callout } from '@/components/docs/ui';

export default function OwnBankAccountPage() {
  return (
    <>
      <h1>Own Bank Account</h1>
      <p className="subtitle">
        Add the business bank account you already operate. There is no extra NodeRails fee to
        attach your own account. After verification you can settle crypto sales to that account.
      </p>

      <h2>What you get</h2>
      <ul>
        <li>Link your existing business bank details for the selected environment (test or live).</li>
        <li>Identity (Didit KYC/KYB) plus bank details and statement for admin review.</li>
        <li>Once verified, settle your merchant settlement balance to this account when Settle to Bank is enabled.</li>
      </ul>

      <h2>How to set it up</h2>
      <ol>
        <li>Open <strong>Bank</strong> in the merchant dashboard.</li>
        <li>Choose <strong>Own account</strong> (or the own-account tile).</li>
        <li>Complete identity verification for that environment.</li>
        <li>Submit bank details and the required statement PDF.</li>
        <li>Wait for admin review. Status moves to verified when approved.</li>
      </ol>

      <Callout type="info" title="Updating details later">
        After the account is verified, you can change bank details and statement without restarting
        identity from scratch. Live beneficiary details stay until admin approves the pending change.
        Rejecting a change keeps the verified account and previous beneficiary.
      </Callout>

      <h2>Fees</h2>
      <p>
        Attaching your own bank account does not charge an annual open fee. Settlement and
        corridor fees still follow your published Bank / settlement configuration when you settle
        crypto to fiat.
      </p>

      <h2>Related</h2>
      <ul>
        <li><Link href="/docs/bank/global-accounts">Global bank accounts</Link></li>
        <li><Link href="/docs/bank/settle-to-bank">Settle to Bank</Link></li>
        <li><Link href="/docs/bank">Bank introduction</Link></li>
      </ul>
    </>
  );
}
