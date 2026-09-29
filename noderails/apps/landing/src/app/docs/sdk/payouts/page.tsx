import { CodeBlock, Callout, ResponseField } from '@/components/docs/ui';

export default function SDKPayoutsPage() {
  return (
    <>
      <h1>Payouts</h1>
      <p className="subtitle">
        Send tokens from the merchant payout wallet to one or more recipients. Standing wallet
        authorization and ERC-20 approve / depositETH are done once in the dashboard. The SDK
        only creates, schedules, and lists payouts.
      </p>

      <Callout type="warning" title="Authorize once in the dashboard">
        Connect the payout wallet, sign the yearly payout authorization, and approve the token
        (or depositETH for native) before calling the SDK. Chains and tokens must be enabled by
        NodeRails admin and on your app - same catalog as checkout.
      </Callout>

      <Callout type="info" title="Chain limits">
        Bulk (more than one recipient) is EVM only, max 200 lines. Solana is native SOL only,
        one recipient. Sui create is allowed; schedule and on-chain execute are not enabled.
        Stored <code>tokenAmount</code> and <code>lines[].amount</code> are atomic integer strings.
        Bank settlement is dashboard-only - not in the SDK.
      </Callout>

      <h2>Create and send now</h2>
      <p>
        <code>amount</code> on each line is a human token amount. The server converts it using
        the admin token decimals.
      </p>
      <CodeBlock
        language="typescript"
        title="Send now"
        code={`const payout = await noderails.payouts.create({
  chain: '11155111',
  tokenAddress: '0x...',
  lines: [
    { recipient: '0xAlice', amount: '100.50' },
    { recipient: '0xBob', amount: '80' },
  ],
  executeNow: true,
});

console.log(payout.id, payout.status, payout.txHash);`}
      />

      <h2>Schedule once</h2>
      <CodeBlock
        language="typescript"
        title="Send at a UTC time"
        code={`const payout = await noderails.payouts.create({
  chain: '11155111',
  tokenAddress: '0x...',
  lines: [{ recipient: '0xAlice', amount: '100.50' }],
  scheduledAt: '2026-09-01T09:00:00.000Z',
});`}
      />

      <h2>Recurring</h2>
      <p>Every N days in UTC. Timezone-named cron is not in this release.</p>
      <CodeBlock
        language="typescript"
        title="Every 30 days"
        code={`const schedule = await noderails.payoutSchedules.create({
  chain: '11155111',
  tokenAddress: '0x...',
  intervalDays: 30,
  startAt: '2026-09-01T09:00:00.000Z',
  lines: [
    { recipient: '0xAlice', amount: '100.50' },
    { recipient: '0xBob', amount: '80' },
  ],
});

await noderails.payoutSchedules.pause(schedule.id);
await noderails.payoutSchedules.resume(schedule.id);
await noderails.payoutSchedules.cancel(schedule.id);`}
      />

      <h2>Address book and payroll CSV</h2>
      <CodeBlock
        language="typescript"
        title="Contacts"
        code={`await noderails.payoutContacts.create({
  label: 'Alice',
  wallet: '0xAlice',
  family: 'EVM',
});

const preview = await noderails.payoutContacts.importCsv({
  family: 'EVM',
  saveToAddressBook: true,
  csv: 'label,wallet,amount\\nAlice,0xAlice,100.50\\nBob,0xBob,80',
});

await noderails.payoutContacts.update('contact-id', { label: 'Alice payroll' });`}
      />

      <h2>List and cancel</h2>
      <CodeBlock
        language="typescript"
        title="History"
        code={`const page = await noderails.payouts.list({ status: 'EXECUTED', page: 1 });
await noderails.payouts.execute('payout-id');
await noderails.payouts.cancel('payout-id');`}
      />

      <h2>Webhooks</h2>
      <p>
        Subscribe to <code>payout.executed</code> and <code>payout.failed</code> on your webhook endpoint.
      </p>

      <h2>Types</h2>
      <ResponseField name="PayoutIntent.status" type="PENDING | SCHEDULED | EXECUTED | FAILED | CANCELLED" description="Intent lifecycle" />
      <ResponseField name="PayoutSchedule.status" type="ACTIVE | PAUSED | CANCELLED" description="Recurring template" />
    </>
  );
}
