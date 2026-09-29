import { CodeBlock, Endpoint, Callout, ResponseField } from '@/components/docs/ui';

export default function PayoutsApiPage() {
  return (
    <>
      <h1>Payouts</h1>
      <p className="subtitle">
        Create one-shot or scheduled payouts, recurring schedules, and a per-app address book.
        Secret API key or dashboard JWT. Amounts on create are human decimal strings.
      </p>

      <Callout type="info" title="Standing auth">
        The payout wallet must already be authorized in the merchant dashboard. ERC-20 payouts
        need an allowance to Merchant Manager; native EVM payouts spend depositETH.
      </Callout>

      <Callout type="warning" title="Chain limits">
        Bulk lines (2-200) are EVM only. Solana is native SOL, one recipient. Sui cannot be
        scheduled and cannot execute on-chain yet. Create amounts are human decimals; stored
        amounts are atomic. Bank settlement is a separate dashboard flow, not these endpoints.
      </Callout>

      <h2>Create a payout</h2>
      <Endpoint method="POST" path="/payouts" />
      <table>
        <thead>
          <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>appId</code></td><td><code>string</code></td><td>Yes</td><td>App UUID (SDK sets this)</td></tr>
          <tr><td><code>chain</code></td><td><code>string</code></td><td>Yes</td><td>Chain id, e.g. 11155111</td></tr>
          <tr><td><code>tokenAddress</code></td><td><code>string</code></td><td>Yes</td><td>Admin+app catalog token, or native sentinel</td></tr>
          <tr><td><code>lines</code></td><td><code>{`{ recipient, amount }[]`}</code></td><td>Yes*</td><td>1-200 human amounts. *Or recipientWallet + tokenAmount</td></tr>
          <tr><td><code>scheduledAt</code></td><td><code>string</code></td><td>No</td><td>ISO UTC. Future time → SCHEDULED</td></tr>
          <tr><td><code>executeNow</code></td><td><code>boolean</code></td><td>No</td><td>Default true when scheduledAt is omitted</td></tr>
          <tr><td><code>amountUsd</code></td><td><code>string</code></td><td>No</td><td>Record only</td></tr>
        </tbody>
      </table>

      <h2>List / get / execute / cancel</h2>
      <Endpoint method="GET" path="/payouts" />
      <Endpoint method="GET" path="/payouts/:id" />
      <Endpoint method="POST" path="/payouts/:id/execute" />
      <Endpoint method="POST" path="/payouts/:id/cancel" />

      <h2>Schedules</h2>
      <Endpoint method="POST" path="/payout-schedules" />
      <table>
        <thead>
          <tr><th>Parameter</th><th>Type</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>appId</code></td><td><code>string</code></td><td>Yes</td><td>App UUID</td></tr>
          <tr><td><code>chain</code></td><td><code>string</code></td><td>Yes</td><td>Chain id</td></tr>
          <tr><td><code>tokenAddress</code></td><td><code>string</code></td><td>Yes</td><td>Catalog token</td></tr>
          <tr><td><code>lines</code></td><td><code>array</code></td><td>Yes</td><td>Fixed recipients and human amounts</td></tr>
          <tr><td><code>intervalDays</code></td><td><code>number</code></td><td>Yes</td><td>1-365 UTC days</td></tr>
          <tr><td><code>startAt</code></td><td><code>string</code></td><td>No</td><td>First run ISO UTC (default now)</td></tr>
        </tbody>
      </table>
      <Endpoint method="GET" path="/payout-schedules" />
      <Endpoint method="POST" path="/payout-schedules/:id/pause" />
      <Endpoint method="POST" path="/payout-schedules/:id/resume" />
      <Endpoint method="POST" path="/payout-schedules/:id/cancel" />

      <h2>Address book</h2>
      <Endpoint method="POST" path="/apps/:appId/payout-contacts" />
      <Endpoint method="GET" path="/apps/:appId/payout-contacts" />
      <Endpoint method="PUT" path="/apps/:appId/payout-contacts/:contactId" />
      <Endpoint method="DELETE" path="/apps/:appId/payout-contacts/:contactId" />
      <Endpoint method="POST" path="/apps/:appId/payout-contacts/import" />
      <p>
        CSV header: <code>label,wallet,amount</code>. Body: <code>csv</code>, <code>family</code> (EVM | SOLANA | SUI), <code>saveToAddressBook</code>.
        <code>PUT</code> updates <code>label</code>, <code>wallet</code>, or <code>family</code>. Contacts are scoped to the URL <code>appId</code>.
      </p>

      <h2>Funding (dashboard)</h2>
      <Endpoint method="GET" path="/apps/:id/payout-funding?chainId=" />

      <h2>Webhooks</h2>
      <ResponseField name="payout.executed" type="event" description="Intent executed on-chain" />
      <ResponseField name="payout.failed" type="event" description="Execute failed; recurring stays ACTIVE" />

      <CodeBlock
        language="typescript"
        title="SDK"
        code={`await noderails.payouts.create({
  chain: '11155111',
  tokenAddress: '0x...',
  lines: [{ recipient: '0xAlice', amount: '100.50' }],
  executeNow: true,
});`}
      />
    </>
  );
}
