# Hackathon readiness and judging plan

Reviewed October 29, 2026 against the supplied challenge text and official pages:
- https://paypalaihackathon.devpost.com/
- https://paypalaihackathon.devpost.com/rules

Submission deadline: November 12, 2026 at noon PST (2 p.m. America/Chicago). Target submission: November 10, leaving a buffer. Free judge access must remain available through the judging period ending December 15, 2026 at 8 a.m. Pacific.

## Required deliverables

| Requirement | Current evidence or remaining work |
| --- | --- |
| Central PayPal Sandbox integration | Verified create and capture, completed USD 5.00 receipt, user-provided API logs. |
| Meaningful AI functionality | Done. Claude reviews the supplied seller terms; quoted findings, plus deterministic rule checks, decide whether the server will create a PayPal order. Four opt-in live tests cover clarify, block, prompt-injection, and eligible cases. |
| Working prototype | Review → clarify → acknowledge → PayPal Sandbox capture verified end to end on October 29, 2026, with the review saved alongside the receipt. |
| Public open-source repository | Done. Published October 30, 2026 at https://github.com/mrvk64/trustpay-ai; GitHub detects the MIT license in the About section. |
| Complete source, assets, setup | README has a judge quick start, AI model/service disclosure, demo sequence, and troubleshooting. Template Next.js/Vercel logos removed; app icon is original. Fresh-clone build verified locally on October 30, 2026. |
| Judge access | Hosted demo live on Render at https://trustpay-ai-d73r.onrender.com (verified October 30, 2026: blocked, clarify, and eligible reviews, plus PayPal order creation). Remaining: Claude Console spend limit, a dedicated Sandbox test buyer, and its login in Devpost private notes. Free plan sleeps after 15 idle minutes. |
| Project description | Draft in `docs/DEVPOST_SUBMISSION.md`: pitch, problem, workflow, PayPal APIs, tools, challenges, limitations. Remaining: fill in the repository and video links, then paste into Devpost. |
| Public YouTube video under 3 minutes | Script and recording setup in `docs/DEMO_VIDEO_SCRIPT.md` (target 2:30, production build, synthetic scenarios, no third-party brands). Remaining: record, upload as Public, and add the link. |
| Rights and English materials | Review assets/dependency licenses and permission for included third-party marks/media; use English throughout. |
| Registration and eligibility | User must confirm Devpost registration, age/residency eligibility, ownership, and absence of excluded affiliations/conflicts under the rules. |

## Product direction for judging

Proposed audience: buyers paying unfamiliar sellers for small digital services. Demonstrate a transaction review that identifies contradictions or missing delivery terms from provided evidence, asks a useful clarification, and updates the checkout decision after the answer.

Avoid claiming independent seller verification, proven fraud detection, escrow, or guaranteed safety. Label user-supplied evidence and model inferences clearly. Keep the user in control of payment approval.

The purchased item, reviewed terms, server-owned amount, PayPal order, and saved receipt now describe one purchase: a USD 5.00 custom logo avatar.

## Five equally weighted judging criteria

- Technological implementation: real model output validated against a schema; server-enforced checkout policy; PayPal create/capture and traceable receipt; meaningful failure-path tests.
- Design: one coherent review-to-payment experience with accessible states, clear evidence, and useful next actions.
- Potential impact: one specific audience and credible example; document any actual user feedback without invented metrics.
- Innovation: demonstrate clarification that changes the decision and binds that decision to the payment; research alternatives before claiming novelty.
- Presentation: show the problem, risky example, clarification, permissible purchase, and completed Sandbox capture in under three minutes.

Prioritize overall prizes, Best Use of PayPal + AI, and Best Demo Delivery. Pursue Agentic Commerce only if the finished behavior substantiates the claim. Sponsor tools are optional; add one only when it materially improves the product and meets that prize's specific rules.

## Release gates

1. Real AI review and server-side policy integrated with the actual purchase.
2. Safe, clarification-required, and blocked scenarios plus model failure and payment cancellation verified.
3. Assessment tied to the order/session; capture authorization and idempotency checked.
4. Public repository, root LICENSE, reproducible setup, tool disclosures, and judge access verified.
5. English description and public YouTube video reviewed against the exact working build.
6. Submission finalized before deadline; access maintained through judging.

Current status: gates 1 and 3 are met locally. For gate 2, the safe, clarification, blocked, and prompt-injection scenarios are verified with live Claude; the model-failure message and PayPal cancel path still need a manual recheck on the current build. Gates 4–6 (public repository and LICENSE, judge access, description, video, submission) remain. Winning is not guaranteed.
