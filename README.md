# TrustPay AI

**Review before you pay.** TrustPay AI checks a seller's terms with Claude before PayPal checkout opens, then binds that review to the PayPal order and receipt.

Built solo for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). Runs entirely on PayPal Sandbox, so no real money moves.

## The problem

People pay strangers online for small digital services every day: a logo, an avatar, a quick edit. The seller's promise sits in a chat message or listing, and the buyer often finds out it was vague ("I'll send it when I can"), or a setup for a scam ("send your verification code"), only after paying. TrustPay puts a review step in front of the payment button. Missing terms get a question for the seller, unsafe requests pause checkout, and acceptable terms are shown to the buyer for an explicit approval before PayPal opens.

## How it works

1. **Review.** The buyer pastes the seller's terms (or picks one of five synthetic scenarios). Claude returns a structured review where every finding quotes the exact sentence it is based on. Reviews quoting text that isn't in the evidence are thrown away.
2. **Enforce.** Code, not the model, decides checkout. Deterministic rules add findings for password/code requests, off-checkout payment, and price mismatches. A finding can pause checkout, never approve it. The server refuses to create a PayPal order unless this browser's latest review is eligible.
3. **Clarify.** If terms are missing, the buyer adds the seller's answer and reviews again. The decision updates.
4. **Approve and pay.** The buyer ticks an acknowledgement, and the PayPal button appears. The server creates a USD 5.00 Orders v2 order whose `custom_id` is the review ID, then captures it after PayPal approval.
5. **Receipt.** The capture, review, and acknowledgement time are saved together and can be reopened from the same browser.

## PayPal integration

- **PayPal JavaScript SDK v6** (`@paypal/react-paypal-js/sdk-v6`): the one-time payment button and approval flow, Sandbox only.
- **Orders v2 API** via `@paypal/paypal-server-sdk`: OAuth client credentials, server-side order create and capture, `PayPal-Request-Id` idempotency, and `custom_id` linking each order to its review.
- **Server-owned amount and capture validation**: the browser never sends a price, and a capture is accepted only if it is `COMPLETED` for exactly USD 5.00.

## AI and tools used

- **Claude Sonnet 5.5** (`claude-sonnet-5-5`, Anthropic API) is the transaction reviewer. It is called once per review through the [AI SDK](https://ai-sdk.dev/) (`ai` with `@ai-sdk/anthropic`) using a Zod output schema. The system prompt (`src/lib/review/prompt.ts`) treats seller text as untrusted evidence, defines which terms are essential for this purchase, and forbids claims about seller identity or fraud probability. Claude's output is advisory: quote validation, rule checks, and the checkout policy are plain TypeScript.
- **Development assistants:** OpenAI ChatGPT/Codex and Anthropic Claude Code helped write and review the code and docs. They are not part of the running app.

## Quick start (judges)

You need Node.js 24+, a free [PayPal Developer](https://developer.paypal.com/dashboard/) account, and a [Claude Console](https://platform.claude.com/) API key. Each review makes one Claude API call billed to that key.

```powershell
git clone https://github.com/mrvk64/trustpay-ai.git
cd trustpay-ai
npm install
Copy-Item .env.example .env.local   # macOS/Linux: cp .env.example .env.local
```

Fill `.env.local` with your Sandbox app's Client ID and Secret (Developer Dashboard → Apps & Credentials → Sandbox) and your Claude API key, then run:

```powershell
npm run dev
```

Open http://localhost:3000 and try this sequence:

1. **Missing delivery promise** → Review: Claude asks the seller a question and checkout stays paused.
2. **Seller clarifies terms** → Review: the terms become eligible. Tick the acknowledgement and pay with your Sandbox **Personal** buyer account (Sandbox → Accounts).
3. **Unsafe account request** and **Hidden instruction to the AI** → Review: payment is paused, with the quoted reason.
4. **View saved receipts** shows the captured order with its review.

Without credentials the app still builds and shows setup instructions. Details and troubleshooting are below.

## Claude transaction review

Add these server-only settings to your existing `.env.local` without replacing your PayPal settings:

```dotenv
ANTHROPIC_API_KEY=your_claude_api_key_here
CLAUDE_MODEL=claude-sonnet-5-5
```

Create your API key in the [Claude Console](https://platform.claude.com/). API access/billing is configured separately from using the Claude chat app. Keep the key local, and restart `npm run dev` after configuring it. The integration calls Anthropic directly through `@ai-sdk/anthropic`; it does not require a Vercel Gateway account.

The five example buttons use synthetic seller evidence. Review missing delivery terms, add the seller clarification, review again, then explicitly acknowledge the terms to reveal PayPal checkout. Unsafe terms, including a listing that hides an instruction to the AI reviewer, should leave checkout paused. Model findings must include quotes found in the supplied evidence. A model failure never silently permits checkout.

After Claude answers, deterministic TrustPay rules in `src/lib/review/rules.ts` scan the same evidence for account-credential requests, payment outside the displayed PayPal checkout, and stated prices that don't match the USD 5.00 order. Rules can only add findings, so code can pause a checkout Claude would allow but can never approve one Claude paused. Rule findings are labelled **TrustPay rule** and quote the exact passage that triggered them. They favour precision over recall: negated wording such as "I will never ask for your password" is left to Claude.

If a review expires (30 minutes without starting payment), is replaced by a newer review, or the server restarts, the PayPal button disappears and the buyer is asked to review again instead of retrying a payment that cannot succeed. Starting PayPal checkout records when the buyer approved the reviewed terms; the saved receipt keeps that time.

The purchased item is a USD 5.00 custom logo avatar; review and PayPal checkout refer to the same item. The server binds an eligible assessment to an HTTP-only browser session and stores its ID in the PayPal order `custom_id`.

Pending assessments use an expiring single-process memory store; restarting the server invalidates unfinished checkouts. New completed purchases and their assessment summaries are saved atomically under `.trustpay-data/receipts/`, which Git ignores. Use **View saved receipts** from the same browser to retrieve them after a restart. Browser access uses an HTTP-only cookie lasting 30 days; clearing cookies loses that browser's access. Purchases completed before this storage feature are not backfilled. Receipts contain no API keys or funding details, but do retain review text, so use synthetic evidence for demos. Hosted multi-instance deployments still require shared durable storage and abuse controls. The AI assesses supplied text; it does not verify the seller or guarantee delivery.

## What works now

- Next.js 16 App Router with TypeScript and responsive CSS
- Claude review of seller terms with schema-validated output and quote-checked evidence
- Code-owned checkout policy: deterministic rules plus eligibility enforced on the server, bound to the browser session
- PayPal JavaScript SDK v6 through `@paypal/react-paypal-js`
- PayPal server SDK for OAuth and Orders v2 create/capture calls
- Server-owned USD 5.00 demo price (the browser cannot choose the amount)
- The review ID travels in the PayPal order `custom_id`; captured receipts are saved with the review and the buyer's approval time
- Setup, cancel, error, expired-review, processing, and captured-receipt UI states
- Safe environment template and ignored local credentials
- Unit tests for order construction, receipt shaping, checkout policy, rule checks, session binding, and receipt storage; opt-in live Claude tests
- Clean build without credentials; the UI shows setup instructions until configured

## Run locally

Requirements: Node.js 24+ and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Add your own PayPal Sandbox credentials

1. Sign in to the [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/).
2. Open **Apps & Credentials**, select **Sandbox**, and create or choose an app.
3. Put its Client ID and Secret in `.env.local` on your machine.
4. Under **Sandbox → Accounts**, open the generated **Personal** buyer account and use that account to test checkout.

Never paste the secret into chat, expose it with a `NEXT_PUBLIC_` prefix, use real payment details in Sandbox, or commit `.env.local`.

```dotenv
NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
```

The client ID is public by PayPal's design. `PAYPAL_CLIENT_SECRET` is read only by server code.

Milestone 1 is hard-locked to Sandbox in both browser and server code; `production` is rejected. In development, Next.js reloads after `.env.local` changes. For `npm run build`, add the variables first because the public Client ID is embedded at build time.

## Verify the milestone

Automated checks:

```powershell
npm run check
```

Live Claude tests (opt-in, needs `ANTHROPIC_API_KEY` in `.env.local`, makes four small paid API calls):

```powershell
$env:TRUSTPAY_LIVE_TEST = "1"; node --env-file=.env.local node_modules/vitest/vitest.mjs run src/lib/review/claude-live.test.ts; Remove-Item Env:TRUSTPAY_LIVE_TEST
```

They check that missing delivery terms ask for clarification, a password request and a hidden instruction to the reviewer are blocked, and clarified terms become eligible without extra questions.

Manual Sandbox smoke test:

1. Start the app and click the PayPal button.
2. Sign in with the generated Sandbox **Personal** buyer, not the Business merchant.
3. Approve the USD 5.00 test order.
4. Confirm that TrustPay shows `COMPLETED`, an order ID, and a capture ID.
5. In the PayPal Developer Dashboard, open **Event logs → API calls** and verify the create and capture calls.

No live credentials or real money are needed. Keep the app local/private until authentication and rate limiting are added.

## Deploy a hosted demo (Render)

`render.yaml` is a [Render Blueprint](https://render.com/docs/blueprint-spec) for a single free web service. Render fits this app because assessments live in one long-running Node process. Serverless platforms that spread requests across short-lived functions would lose reviews between requests.

1. In Render, choose **New → Blueprint** and connect this GitHub repository.
2. When prompted, enter `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `ANTHROPIC_API_KEY`. These are your Sandbox app and Claude key; they stay in Render, never in Git. The Client ID is built into the page, so change it only with a redeploy.
3. Deploy. The build runs `npm ci --include=dev && npm run build` on Node 24 (`.node-version`), then `npm start` serves on Render's `PORT`.
4. In the Claude Console, set a monthly spend limit on the workspace that owns the key as a hard backstop.

Claude review caps protect a public demo's API budget. Each review is one Claude call; a measured review of the demo scenario used about 1,400 input and 600 output tokens. The defaults are 20 reviews per browser per hour, 40 per IP per hour, and 100 per UTC day across all visitors; override them with `REVIEW_LIMIT_PER_SESSION_HOUR`, `REVIEW_LIMIT_PER_IP_HOUR`, and `REVIEW_LIMIT_PER_DAY`. The daily cap is the real cost guard: browser and IP caps can be sidestepped by clearing cookies or rotating addresses. Token usage for every review is written to the server log.

Free-plan caveats: the service sleeps after 15 minutes without traffic and takes about a minute to wake, and its filesystem is wiped on every restart, so saved receipts, pending reviews, and limit counters reset. Render's free plan also allows one instance only, which is what the in-memory session store requires.

## Repository map

```text
src/app/review-actions.ts             Server Action: Claude review, rules, session-bound assessment
src/app/actions.ts                    Server Actions: create/capture boundary and saved receipts
src/components/transaction-review.tsx Review form, findings, acknowledgement, receipt history
src/components/paypal-checkout.tsx    PayPal button and checkout states
src/lib/review/service.ts             Claude call, output schema, evidence check
src/lib/review/prompt.ts              Reviewer system prompt
src/lib/review/rules.ts               Deterministic rule checks (stricter-only)
src/lib/review/policy.ts              Checkout decision and quote validation
src/lib/review/session.ts             Expiring in-memory assessments bound to a browser cookie
src/lib/review/receipts.ts            Saved receipts under .trustpay-data/
src/lib/review/limits.ts              Per-browser, per-IP, and daily review caps
src/lib/review/examples.ts            Synthetic demo scenarios
src/lib/demo-product.ts               Server-owned product and amount
src/lib/paypal/config.ts              Credential validation and SDK environment
src/lib/paypal/orders.ts              Orders controller create/capture calls
src/lib/paypal/order-data.ts          Pure request/receipt helpers
docs/IMPLEMENTATION_PLAN.md           Solo milestone plan
docs/TECHNICAL_REQUIREMENTS.md        Verified API and security requirements
docs/HACKATHON_READINESS.md           Submission checklist and judging plan
docs/DEVPOST_SUBMISSION.md            Devpost form text draft
docs/DEMO_VIDEO_SCRIPT.md             2:30 demo video script and recording setup
render.yaml                           Render Blueprint for the hosted demo
```

## Verified PayPal references

The implementation was checked on October 29, 2026 against PayPal's current [Next.js checkout guide](https://developer.paypal.com/guides/nextjs-checkout), [React SDK reference](https://developer.paypal.com/sdk/react/reference), [REST authentication guide](https://developer.paypal.com/api/rest/authentication), [Orders v2 API](https://developer.paypal.com/api/orders/v2/), and [Sandbox account guide](https://developer.paypal.com/sandbox-testing/accounts).

See [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the path from this payment foundation to a hackathon-ready PayPal + AI demo.
