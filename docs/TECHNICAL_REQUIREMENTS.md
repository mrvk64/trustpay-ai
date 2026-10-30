# Technical build requirements

Verified against official PayPal documentation on October 29, 2026.

## Stack

- Node.js 24+ and npm
- Next.js 16 App Router, React 19, TypeScript, responsive CSS
- `@paypal/react-paypal-js` 10.6.x, using the `/sdk-v6` entry point
- `@paypal/paypal-server-sdk` 2.5.x
- Claude (`claude-sonnet-5-5` by default) through the AI SDK (`ai` 7.x, `@ai-sdk/anthropic` 4.x) with Zod 4 output schemas
- Vitest for unit tests, plus opt-in live Claude tests

`package-lock.json` is the reproducible source of exact dependency versions.

## PayPal flow

1. `PayPalProvider` loads JavaScript SDK v6 in explicit `sandbox` mode with the public Client ID.
2. The button calls a Next.js Server Action to create an order.
3. The server SDK gets an OAuth 2.0 access token and calls Orders v2 with a server-owned item and amount.
4. The buyer approves in PayPal's Sandbox experience.
5. The button's `onApprove` callback awaits a second Server Action that captures the approved order.
6. TrustPay returns only a reduced receipt to the browser.

The server SDK manages token acquisition and refresh. Underneath it, the verified Sandbox REST interfaces are:

- Base URL: `https://api-m.sandbox.paypal.com`
- OAuth: `POST /v1/oauth2/token` using Client ID/Secret Basic authentication and `grant_type=client_credentials`
- Create: `POST /v2/checkout/orders`
- Capture: `POST /v2/checkout/orders/{order_id}/capture`

The implementation uses the assessment ID as the create `PayPal-Request-Id` and as the order `custom_id`, so repeated clicks for one review return the same order. Capture retries use a stable `capture-{orderId}` request ID. Assessments live in single-process memory, so this idempotency does not survive a restart or span instances. `return=representation` makes the completed capture receipt available for verification.

## Review flow

1. The browser sends the seller's listing and optional clarification to the `assessPurchase` Server Action. Each new review invalidates the browser's earlier ones.
2. The server calls Claude with a system prompt that treats the evidence as untrusted and asks for a structured review. Output must match the Zod schema, and every finding's quote must occur in the evidence, or the review is discarded.
3. Deterministic rules (`src/lib/review/rules.ts`) append stricter-only findings for credential requests, off-checkout payment, and price mismatch.
4. `decideCheckout` turns the merged findings into `eligible`, `clarification_required`, or `blocked`. The assessment is stored for 30 minutes, bound to an HTTP-only `trustpay-session` cookie.
5. `createOrder` and `captureOrder` refuse to proceed unless that session's assessment is eligible. `createOrder` also requires the buyer's acknowledgement, records its time, and extends the review while PayPal approval is in progress. A missing or expired review returns `REVIEW_REQUIRED`, and the UI asks the buyer to review again.
6. After capture, the receipt, review and acknowledgement time are saved atomically under `.trustpay-data/receipts/<sha256(session)>/`. A failure to save is logged and never reported to the buyer as a failed payment.

## Environment variables

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PAYPAL_ENVIRONMENT` | Browser + server | Must be `sandbox`; Milestone 1 rejects every other value. |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Browser + server | Public identifier used to initialize the PayPal browser SDK. |
| `PAYPAL_CLIENT_SECRET` | Server only | Authenticates the merchant app through the server SDK. |
| `ANTHROPIC_API_KEY` | Server only | Authenticates Claude API calls for the transaction review. |
| `CLAUDE_MODEL` | Server only | Optional model ID; defaults to `claude-sonnet-5-5`. |
| `REVIEW_LIMIT_PER_SESSION_HOUR`, `REVIEW_LIMIT_PER_IP_HOUR`, `REVIEW_LIMIT_PER_DAY` | Server only | Optional review caps; defaults 20, 40, and 100. |

`.env.local`, `.env`, and environment-specific variants are ignored. `.env.example` is deliberately committed with placeholders.

The public Client ID is embedded by `next build`. Credentials must exist before a production build; adding them only at `next start` will leave the prebuilt setup state in place.

## Security requirements

- Treat price, currency, SKU, and capture eligibility as server-owned values.
- Never accept an authoritative amount from the browser.
- Keep the secret out of `NEXT_PUBLIC_*`, client components, URLs, analytics, screenshots, and logs.
- Validate order IDs before passing them to capture.
- Do not return raw PayPal errors to the browser; log only a local reference, HTTP status, and PayPal `debug_id` when available.
- Do not collect or store card numbers or buyer funding details.
- Use only Sandbox Personal-account credentials and synthetic data during development.
- Before public deployment, add authentication, rate limiting, CSRF/origin review, durable idempotency, and abuse monitoring.
- Bind each capturable order to the authenticated user/session and expected product before exposing the Server Actions publicly.
- Before enabling live mode, add webhook reconciliation and verify PayPal webhook signatures.

## Automated checks

`npm run check` must pass:

- ESLint
- TypeScript with no emit
- Vitest unit tests
- Next.js production build

Unit tests prove that the amount comes from the server catalog, unsafe order IDs are rejected, a PayPal response is reduced to a safe receipt, invented evidence quotes are rejected, rules block credential and off-checkout payment requests without flagging negated wording, rules never loosen a decision, reviews are bound to one browser and expire, and saved receipts survive a restart.

`claude-live.test.ts` runs only with `TRUSTPAY_LIVE_TEST=1` and real credentials (see the README); it calls the model four times.

## Manual Sandbox acceptance test

- Business Sandbox app credentials exist locally in `.env.local`.
- A separate Personal Sandbox buyer account is available.
- PayPal button renders at `http://localhost:3000`.
- Buyer approves USD 5.00.
- Create returns an order ID; capture returns status `COMPLETED` and a capture ID.
- The same calls appear under Developer Dashboard → Event logs → API calls.
- Cancel leaves the checkout retryable and captures nothing.

## Official sources

- [Build a checkout with Next.js](https://developer.paypal.com/guides/nextjs-checkout)
- [PayPal React SDK v6 reference](https://developer.paypal.com/sdk/react/reference)
- [PayPal REST authentication](https://developer.paypal.com/api/rest/authentication)
- [Making REST API requests](https://developer.paypal.com/api/make-api-requests)
- [Orders v2 API](https://developer.paypal.com/api/orders/v2/)
- [Sandbox accounts](https://developer.paypal.com/sandbox-testing/accounts)
