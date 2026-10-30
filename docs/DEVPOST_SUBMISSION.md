# Devpost submission draft

Copy each block into the matching Devpost field. Replace every `TODO` before submitting, and re-read the text against the build you record: it describes only what the app actually does.

## Project name

TrustPay AI

## Elevator pitch (200 characters max)

Claude reviews a seller's terms before PayPal checkout opens. Missing terms get a question, unsafe requests pause payment, and the approved review is bound to the PayPal order.

## About the project

### Inspiration

People pay strangers online for small digital services all the time: a logo, an avatar, a quick edit. The seller's promise usually lives in a chat message or a listing, and buyers often discover it was vague ("I'll send it when I can"), or a setup for account theft ("send me your verification code"), only after they have paid. I wanted the moment before the PayPal button to do more than show a price. It should help the buyer understand what they are agreeing to.

### What it does

TrustPay AI puts a review step in front of PayPal checkout for a USD 5.00 custom logo avatar.

1. **Review.** The buyer pastes the seller's terms, plus any clarification the seller sent. Claude returns a structured review. Every finding quotes the exact sentence it is based on and is labelled as a stated term, something that needs clarification, or a payment concern.
2. **Decide in code.** The model advises; TypeScript decides. Reviews that quote text not in the evidence are discarded. Deterministic TrustPay rules add findings for password or verification-code requests, payment outside the displayed checkout, and prices that don't match the order. Rules can pause checkout but can never approve it.
3. **Clarify.** When essential terms are missing (delivery window, delivery channel, remedy if it fails), the buyer gets focused questions to ask the seller. They add the seller's answer, review again, and the decision updates.
4. **Approve and pay.** For eligible terms, the buyer ticks an explicit acknowledgement, and only then does the PayPal button appear. The server creates a PayPal Orders v2 order whose `custom_id` is the review ID, and captures it after the buyer approves in PayPal Sandbox.
5. **Receipt.** The capture, the review it was based on, and the time the buyer approved the terms are saved together and can be reopened later.

Five built-in synthetic scenarios show each outcome: clear terms, a missing delivery promise, a seller clarification, an account-credential request, and a listing that hides an instruction telling the AI reviewer to report no concerns.

### How I built it

- **Next.js 16 (App Router), React 19, TypeScript.** All credentialed work happens in Server Actions.
- **PayPal JavaScript SDK v6** (`@paypal/react-paypal-js`) renders the one-time payment button and runs the approval flow in Sandbox.
- **PayPal Orders v2** through `@paypal/paypal-server-sdk`: OAuth client credentials, server-side create and capture, `PayPal-Request-Id` idempotency (the review ID for create, a stable ID per order for capture), and `custom_id` to link each order to its review. The amount is owned by the server, and a capture is accepted only if it is `COMPLETED` for exactly USD 5.00.
- **Claude Sonnet 5.5** through the AI SDK (`ai` + `@ai-sdk/anthropic`) with a Zod output schema. The system prompt treats seller text as untrusted evidence, defines which terms are essential for this purchase, and forbids claims about seller identity or fraud probability.
- **Checkout policy in plain TypeScript:** quote validation, stricter-only rule checks, and an eligibility decision the server re-checks before it will create or capture an order. Each review is bound to an HTTP-only browser session, expires after 30 minutes, and is invalidated by a newer review.
- **Vitest:** 43 unit tests (order construction, capture validation, policy, rules, session binding, receipt storage) and four opt-in live tests against the real model.

### Challenges I ran into

- **Letting an AI gate a payment without trusting it blindly.** Free-text model output can't safely decide checkout, so the review is schema-validated, every finding must quote the evidence, and code makes the final call.
- **Prompt injection from the seller.** The seller writes the text being reviewed, so a listing can try to talk the reviewer into approving. Claude is instructed to treat it as evidence, and independent rules run afterwards that can only make the decision stricter. The "hidden instruction" scenario demonstrates both.
- **Avoiding endless clarification loops.** A cautious reviewer can always find one more question (revision turnaround, file specs), which would keep a clear purchase from ever becoming payable. A bounded materiality rubric in the prompt limits questions to essential terms, and a live test checks that clarified terms become eligible with no further questions.
- **Binding the decision to the money.** The approved review has to be the one that gets paid for. The server ties each order to this browser's latest eligible review, reuses one order for repeated clicks, and refuses to capture an order that doesn't belong to that review.

### Accomplishments that I'm proud of

- A complete review → clarify → approve → capture flow running against PayPal Sandbox, with the review saved next to the PayPal receipt.
- The model can recommend, but cannot unlock checkout by itself, even when the seller's text instructs it to.
- Failure paths that behave honestly. A model error keeps checkout paused. An expired review asks the buyer to review again instead of retrying a payment that can't succeed. A payment that was captured is never reported as failed.

### What I learned

- Grounding every AI finding in a quote from the evidence makes the result easier to check, both for the buyer and for code.
- In payments, the useful split is "AI explains, code enforces." It keeps the experience helpful without handing money movement to a model.
- PayPal's `custom_id` and `PayPal-Request-Id` are simple, effective ways to tie an external decision to an order and to make retries safe.

### What's next

- A hosted demo with rate limiting, so anyone can try it without their own API keys.
- Durable storage and PayPal webhook reconciliation (with signature verification) instead of local files and single-process memory.
- A seller-side view, where sellers fix flagged terms before a buyer ever sees them.
- More purchase types than a single fixed-price item.

### Limitations

TrustPay assesses only the text it is given. It does not verify seller identity, detect fraud, hold funds in escrow, or guarantee delivery, and its review is not financial or legal advice. It runs on PayPal Sandbox only, and no real money moves.

## Built with

nextjs, react, typescript, node.js, paypal, paypal-javascript-sdk, paypal-orders-api, paypal-server-sdk, claude, anthropic-api, ai-sdk, zod, vitest

## Tools used (AI model or service)

- **Claude Sonnet 5.5 (Anthropic API), in the product.** Each review makes one call through the AI SDK with a Zod schema. Claude reads the seller's terms and any clarification, and returns a summary, quoted findings with a severity, and up to three questions for the seller. TrustPay validates the quotes, applies its own rules, and decides checkout eligibility in code. Claude never moves money or authorizes payment.
- **Development assistants.** OpenAI ChatGPT/Codex and Anthropic Claude Code helped write, test, and review the code and documentation. They are not part of the running app.

## Try it out

- Code: https://github.com/mrvk64/trustpay-ai (public, MIT license)
- Setup: the README's "Quick start (judges)" section covers everything needed to run it locally with a free PayPal Sandbox app and a Claude API key.
- Hosted demo: https://trustpay-ai-d73r.onrender.com (first load can take up to a minute while the free server wakes up)

## Testing instructions for judges (Devpost private notes only)

Fill in the test buyer in Devpost itself. Never commit these credentials to the repository.

> Open https://trustpay-ai-d73r.onrender.com (first load can take up to a minute). Try **Missing delivery promise**, then **Seller clarifies terms**, tick the acknowledgement, and pay with this PayPal Sandbox buyer. It's a test account with fake funds: email TODO, password TODO. **Hidden instruction to the AI** shows a blocked payment. Reviews are capped per visitor and per day to protect the API budget; if you hit a cap, the page says when it resets, and the README explains how to run it locally.

## Video

TODO public YouTube link (under 3 minutes). Script: `docs/DEMO_VIDEO_SCRIPT.md`.

## Suggested prize categories

Best Use of PayPal + AI and Best Demo Delivery fit what the build demonstrates. Agentic Commerce is not a fit: no agent acts or pays on the buyer's behalf.

## Gallery images (suggested)

1. Hidden-instruction scenario: "Payment paused" with the Claude finding and the TrustPay rule finding.
2. Missing delivery promise: Claude's questions for the seller.
3. Eligible terms: acknowledgement ticked and the PayPal button visible.
4. Completed Sandbox capture showing order ID, capture ID, and review ID.

Use synthetic scenarios only, and keep `.env.local`, the PayPal Developer Dashboard secret, and Sandbox passwords out of every image.
