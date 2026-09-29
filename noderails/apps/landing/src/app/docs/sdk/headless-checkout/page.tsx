import { CodeBlock, Callout, PathCard, PathChooser, StepList } from '@/components/docs/ui';

export default function SDKHeadlessCheckoutPage() {
  return (
    <>
      <h1>Headless Checkout</h1>
      <p className="subtitle">
        Charge from your own UI. The secret-key SDK lists tokens, returns the exact approve or
        sign payload, and captures after the customer acts in their wallet.
      </p>

      <PathChooser>
        <PathCard
          href="/docs/sdk/checkout-sessions"
          title="Hosted"
          code="noderails.checkoutSessions.create"
          description="Redirect the customer to pay.noderails.com. We handle token pick, wallet, and capture."
        />
        <PathCard
          href="/docs/sdk/headless-checkout"
          title="Headless"
          code="noderails.headlessCheckout.*"
          description="Keep the customer on your site. You show tokens and collect the wallet action."
          current
        />
      </PathChooser>

      <Callout type="warning" title="Secret key on your server">
        Call <code>headlessCheckout</code> from your backend only. The browser talks to your API,
        then the customer&apos;s wallet. Do not put <code>sk</code> in the frontend.
      </Callout>

      <h2>Flow</h2>
      <StepList
        steps={[
          {
            title: 'create or createFromSubscription',
            body: 'Open a session. Do not send the customer to pay.noderails.com.',
          },
          {
            title: 'paymentOptions',
            body: 'Show accepted chains and tokens. Each token includes a spot quote for display.',
          },
          {
            title: 'prepare',
            body: 'Pass the selected token and wallet. You get cryptoAmount and a userAction.',
          },
          {
            title: 'confirm',
            body: 'After they sign or approve, authorize. ERC-20 is captured here.',
          },
          {
            title: 'submitUserTx',
            body: 'Only if confirm returns AWAITING_USER_TX (native, Solana, or Sui one-time).',
          },
        ]}
      />

      <h2>One-time payment</h2>
      <CodeBlock
        language="typescript"
        title="headlessCheckout.create through confirm"
        code={`const session = await noderails.headlessCheckout.create({
  successUrl: 'https://yoursite.com/ok',
  cancelUrl: 'https://yoursite.com/cancel',
  items: [{ name: 'Order 123', amount: '49.99', currency: 'USD', quantity: 1 }],
});

const options = await noderails.headlessCheckout.paymentOptions(session.id);
const token = options.acceptedTokens[0];

const prepared = await noderails.headlessCheckout.prepare(session.id, {
  tokenKey: token.tokenKey,
  chainId: token.chainId,
  walletAddress: customerWallet,
});

// Your UI: signTypedData(prepared.userAction.typedData)
// or send prepared.userAction (approve tx)

const result = await noderails.headlessCheckout.confirm(session.id, {
  walletAddress: customerWallet,
  chainId: token.chainId,
  tokenKey: token.tokenKey,
  customerEmail: 'buyer@example.com',
  cryptoAmount: prepared.cryptoAmount,
  exchangeRate: prepared.exchangeRate,
  quoteId: prepared.quoteId ?? undefined,
  permitSignature, // or approvalTxHash
});

if (result.status === 'AWAITING_USER_TX') {
  // Customer sends result.captureData, then:
  await noderails.headlessCheckout.submitUserTx(session.id, {
    intentId: result.intentId,
    txHash,
  });
}`}
      />

      <h2>What prepare returns</h2>
      <p>
        Always: <code>cryptoAmount</code> (this charge, raw units), <code>exchangeRate</code>,
        optional <code>quoteId</code>, and <code>userAction</code>. For subscriptions,
        <code>authAmount</code> is the standing approve or permit (~one year).
        <code>chargeAmount</code> stays one period.
      </p>
      <table>
        <thead>
          <tr>
            <th>userAction.type</th>
            <th>Your UI</th>
            <th>Then confirm with</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>permit</code></td>
            <td><code>signTypedData(userAction.typedData)</code></td>
            <td><code>permitSignature</code> (amount, deadline, v, r, s)</td>
          </tr>
          <tr>
            <td><code>approve</code></td>
            <td>Send <code>to</code> / <code>data</code> on the token</td>
            <td><code>approvalTxHash</code></td>
          </tr>
          <tr>
            <td><code>native_capture</code> / <code>solana_capture</code> / <code>sui_capture</code></td>
            <td>Confirm first. Capture calldata is on the confirm result.</td>
            <td>No extra sig. Then <code>submitUserTx</code>.</td>
          </tr>
          <tr>
            <td><code>sui_wallet_setup</code></td>
            <td>Fund / set up the Sui subscription wallet</td>
            <td>Then confirm. Capture is pulled after setup.</td>
          </tr>
        </tbody>
      </table>

      <h2>Subscription first charge</h2>
      <p>
        Create the subscription, then open a headless session with
        <code> createFromSubscription</code>. Native tokens are not listed. Later renewals
        run on the worker. Listen for <code>subscription.renewed</code> and <code>payment.captured</code>.
        Do not call confirm every cycle.
      </p>
      <CodeBlock
        language="typescript"
        title="headlessCheckout.createFromSubscription"
        code={`const sub = await noderails.subscriptions.create({
  customerAccountId: customer.id,
  productPlanId: plan.id,
  productPlanPriceId: price.id,
});

const session = await noderails.headlessCheckout.createFromSubscription(sub.id);
const options = await noderails.headlessCheckout.paymentOptions(session.id);
const prepared = await noderails.headlessCheckout.prepare(session.id, {
  tokenKey: 'USDC-8453',
  chainId: 8453,
  walletAddress: customerWallet,
});
// prepared.authAmount is the standing allowance
// prepared.chargeAmount is this period

await noderails.headlessCheckout.confirm(session.id, {
  walletAddress: customerWallet,
  chainId: 8453,
  tokenKey: 'USDC-8453',
  customerEmail: customer.email,
  cryptoAmount: prepared.cryptoAmount,
  exchangeRate: prepared.exchangeRate,
  quoteId: prepared.quoteId ?? undefined,
  permitSignature,
  customerName: 'Ada',
  billingAddress: '1 Market St',
  billingCity: 'San Francisco',
  billingState: 'CA',
  billingCountry: 'US',
  billingPostalCode: '94105',
});`}
      />

      <Callout type="info" title="Billing details">
        Subscription sessions require billing fields on confirm. One-time sessions only need
        them when <code>requireBillingDetails</code> is true.
      </Callout>

      <h2>After payment</h2>
      <p>
        Fulfill on <code>payment.captured</code>. Do not treat the success URL as confirmation.
      </p>

      <h2>Methods</h2>
      <table>
        <thead>
          <tr>
            <th>Method</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>create(params)</code></td>
            <td>Create a one-time headless session</td>
          </tr>
          <tr>
            <td><code>createFromSubscription(id)</code></td>
            <td>Create a session for the first subscription charge</td>
          </tr>
          <tr>
            <td><code>paymentOptions(id)</code></td>
            <td>Tokens, chains, and spot quotes</td>
          </tr>
          <tr>
            <td><code>prepare(id, params)</code></td>
            <td>Exact amount and wallet userAction</td>
          </tr>
          <tr>
            <td><code>confirm(id, params)</code></td>
            <td>Authorize and capture when we can pull</td>
          </tr>
          <tr>
            <td><code>submitUserTx(id, params)</code></td>
            <td>Report the capture hash after AWAITING_USER_TX</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
