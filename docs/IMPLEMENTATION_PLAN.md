# TrustPay AI solo implementation plan

The build is split into narrow, demoable milestones. Each milestone should end with a working main branch and a short screen recording so a solo builder always has a submission fallback.

## Milestone 1 — PayPal Sandbox payment rail

Status: verified by the user's completed USD 5.00 Sandbox receipt and successful create/capture API logs on October 29, 2026.

Goal: prove that the browser can launch PayPal Sandbox while all credentialed create/capture work and the authoritative price remain on the server.

Acceptance criteria:

- The app builds and explains setup without credentials.
- The secret never enters browser code, logs, Git, or chat.
- A Personal Sandbox buyer can approve a fixed USD 5.00 order.
- The server captures it and the UI shows the order/capture receipt.
- The transaction appears in PayPal Sandbox Event logs.
- Lint, type checks, unit tests, and production build pass.

## Milestone 2 — AI trust decision

Status: complete. On October 29, 2026 a live Claude review made the demo purchase eligible and PayPal Sandbox captured it. On October 30 deterministic rule checks, the expired-review path, and server-side acknowledgement were added; four opt-in live Claude tests pass.

How each step landed:

1. The brief is the seller's listing plus an optional clarification for the fixed USD 5.00 avatar (`briefSchema` in `src/lib/review/service.ts`).
2. Claude returns a schema-validated summary, quoted findings (`info`/`clarify`/`block`) and up to three questions. Quotes not found in the evidence discard the review.
3. Code enforces: `src/lib/review/rules.ts` adds stricter-only findings for credential requests, off-checkout payment and price mismatch; `decideCheckout` maps findings to eligible / clarification required / blocked; Server Actions refuse to create or capture an order unless the session's review is eligible.
4. The UI shows the decision and quotes before checkout and requires an acknowledgement before the PayPal button appears. The server records the acknowledgement time.
5. Only the review, acknowledgement time and reduced PayPal receipt are saved. No PayPal credentials or funding data reach the model.

Original plan:

Time box: one focused day.

Goal: make AI materially affect the transaction experience before checkout rather than adding a decorative chatbot.

1. Define a small structured `TransactionBrief`: item description, amount, delivery promise, counterparty signals, and buyer concern.
2. Add a server-only AI call that returns a schema-validated decision: risk level, evidence, missing information, and recommended safeguards.
3. Add deterministic policy checks around the model output (amount bounds, prohibited categories, missing evidence). The model advises; code enforces.
4. Show the decision and evidence before enabling PayPal checkout. Require explicit buyer acknowledgement for medium risk and block high risk in the demo.
5. Store only the minimal redacted decision record needed for the demo. Never send PayPal credentials, funding data, or unnecessary personal data to a model.

Demo proof: changing the transaction brief produces a traceable assessment that changes whether or how checkout proceeds.

## Milestone 3 — Audit trail and PayPal reconciliation (next)

Status: partly done. Each assessment ID is the PayPal order `custom_id` and `PayPal-Request-Id`, and captured receipts (review, acknowledgement time, order ID, capture ID, timestamps) are saved as local JSON files per browser. Remaining: shared durable storage, a receipt page, and webhook reconciliation.

Time box: half to one day.

- Give each assessment a local transaction ID and attach it to the PayPal order as a safe `custom_id`.
- Persist the assessment, user acknowledgement, order ID, capture ID, and timestamps in a small database.
- Add a receipt page that explains what the AI recommended and what the user approved.
- Add a PayPal webhook only after the core demo works; verify webhook signatures and make handling idempotent.

## Milestone 4 — Submission hardening

Time box: half to one day.

- Add rate limiting and authenticated sessions before any public deployment.
- Test approve, cancel, recoverable failure, duplicate click, and mobile layouts.
- Record a 60–90 second demo using Sandbox accounts only.
- Document the AI model, prompts, evaluation examples, PayPal APIs, limitations, and privacy boundaries.
- Make the distinction between a prototype trust recommendation and financial, fraud, or legal advice explicit.

## Deliberate non-goals for the first build

- No live PayPal transactions.
- No escrow or claims that Standard Checkout holds funds.
- No marketplace/multiparty payouts.
- No card-data collection by TrustPay.
- No autonomous capture based only on model output.
- No webhook, refund, subscription, or dispute workflow until the create/capture path is stable.
