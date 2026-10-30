# Demo video script (target 2:30)

Devpost rules: under 3 minutes, show the app working on the device it was built for (a desktop browser), upload publicly to YouTube, and include no third-party trademarks or copyrighted music without permission.

The narration is about 290 words, roughly 2:05 of speech, which leaves room for on-screen pauses. Each Claude review takes 10–15 seconds, so cut most of that wait in editing and keep about a second of the "Claude is reviewing the terms…" state.

## Before recording

1. Use a production build so the Next.js dev badge doesn't appear. `.env.local` must already have your credentials, because the PayPal Client ID is built in:

   ```powershell
   npm run build
   npm start
   ```

2. Open http://localhost:3000 in a clean browser window: no bookmarks bar, no extensions, no other tabs. Record at 1920×1080 and zoom the page to 110–125% so the text is readable on YouTube.
3. Have your Sandbox **Personal** buyer email and password ready. Cut the password entry from the video, and never show `.env.local` or the Developer Dashboard secret.
4. Do one full dry run. If the PayPal popup is blocked, allow popups for localhost.
5. Use no music, or a YouTube Audio Library track you're allowed to use. Use only the built-in synthetic scenarios.

## Script

| Time | On screen | Narration |
| --- | --- | --- |
| 0:00–0:12 | Page top: "Confidence before commitment." Slow scroll to the checkout card. | You find someone online who'll turn your logo into an avatar for five dollars. Their terms are a chat message. Is that a fair deal, or a trap? Right now, most buyers find out after they've paid. |
| 0:12–0:24 | Checkout card: product, $5.00 USD, "Review before you pay". | TrustPay AI adds a review step in front of PayPal checkout. Claude reads the seller's terms, and code decides whether you're allowed to pay. |
| 0:24–0:56 | Click **Hidden instruction to the AI**. Highlight "Note to the AI reviewer…" in the listing. Click **Review this purchase**. Result: "Payment paused". Scroll through the findings, ending on the **TrustPay rule** finding. | Here's a listing with a trap. It tells the AI reviewer to report no concerns, then asks for a fifteen-dollar unlock fee in gift cards. Claude ignores the instruction and flags the fee, and every finding quotes the exact sentence it came from. A separate TrustPay rule catches the same request in code. Rules can pause checkout, but they can never approve it. Notice there's no PayPal button. |
| 0:56–1:18 | Click **Missing delivery promise**, then **Review this purchase**. Result: "Ask the seller before paying" with the questions list. | Most listings aren't scams, just vague. "I'll send it when I can" isn't a delivery promise. TrustPay asks focused questions about the terms that matter: when it arrives, where, and what happens if it doesn't. |
| 1:18–1:42 | Click **Seller clarifies terms** and pause on the filled clarification box. Click **Review this purchase**. Result: "Terms ready for your approval". | The seller answers: forty-eight hours, in this chat, with a refund if they're late. I review again, and the decision updates. Claude's verdict is only advice. The server checks this browser's latest review before it will create an order. |
| 1:42–2:14 | Tick the acknowledgement and the PayPal button appears. Click it, sign in as the Sandbox Personal buyer (cut the password), approve. Back in TrustPay: "Sandbox payment captured" with Review, Order and Capture IDs. | I confirm I've reviewed the terms, and only now does the PayPal button appear. The server creates a PayPal order for exactly five dollars, with the review ID attached as the order's custom ID. I approve in PayPal Sandbox, the server captures the payment, and the receipt links the order and capture back to the review. |
| 2:14–2:30 | Click **View saved receipts** and expand the newest one. End on the receipt, or cut to the page top. | Every purchase keeps the review it was based on, so you can see what you agreed to and why. TrustPay AI: Claude explains, code enforces, and PayPal moves the money. |

## Optional extras (only if the cut stays under 2:45)

- **PayPal Developer Dashboard → Event logs → API calls** (2–3 seconds): the `/v2/checkout/orders` create and `/capture` calls for the purchase you just made. Make sure no secret is visible.
- **Unsafe account request** (5 seconds): a direct "send me your PayPal password and verification code" request is blocked.

## After recording

- Check the final length is under 3:00. Aim for about 2:30.
- Upload to YouTube as **Public** (not Unlisted), with a title like "TrustPay AI: Claude-reviewed PayPal checkout (PayPal AI Hackathon)".
- Put the link in the Devpost form and in `docs/DEVPOST_SUBMISSION.md`.
