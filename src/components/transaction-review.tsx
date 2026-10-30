"use client";
import { useState } from "react";
import { assessPurchase } from "@/app/review-actions";
import { REVIEW_EXAMPLES } from "@/lib/review/examples";
import PayPalCheckout from "./paypal-checkout";
import { receiptHistory } from "@/app/actions";
import type { SavedReceipt } from "@/lib/review/receipts";

type Result = Awaited<ReturnType<typeof assessPurchase>>;

export default function TransactionReview({ clientId }: { clientId: string }) {
  const [listing, setListing] = useState<string>(REVIEW_EXAMPLES[1].listing);
  const [clarification, setClarification] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [history, setHistory] = useState<SavedReceipt[] | null>(null);
  const [historyMessage, setHistoryMessage] = useState("");
  function reset() { setResult(null); setAcknowledged(false); }

  return <div className="review-workspace">
    <p className="product-kicker">01 · Understand the terms</p>
    <h3>Review before you pay</h3>
    <p className="review-caption">Try a synthetic seller scenario, or edit the terms for this $5 avatar purchase.</p>
    <div className="scenario-buttons" aria-label="Example seller terms">
      {REVIEW_EXAMPLES.map((example) => <button key={example.id} type="button" disabled={pending} onClick={() => {
        setListing(example.listing); setClarification(example.clarification); reset();
      }}>{example.label}</button>)}
    </div>
    <form onSubmit={async (event) => {
      event.preventDefault(); reset(); setPending(true);
      try { setResult(await assessPurchase({ listing, clarification })); }
      catch { setResult({ ok: false, message: "Connection interrupted. Please retry the review." }); }
      finally { setPending(false); }
    }}>
      <label htmlFor="seller-listing">Seller’s listing · supplied evidence</label>
      <textarea id="seller-listing" value={listing} minLength={30} maxLength={4000} required disabled={pending} onChange={(event) => { setListing(event.target.value); reset(); }} />
      <label htmlFor="seller-clarification">Seller’s clarification · optional</label>
      <textarea id="seller-clarification" value={clarification} maxLength={2000} disabled={pending} placeholder="Add the seller’s answer, then review again." onChange={(event) => { setClarification(event.target.value); reset(); }} />
      <button className="review-submit" disabled={pending} type="submit">{pending ? "Claude is reviewing the terms…" : "Review this purchase"}</button>
    </form>
    {pending && <p role="status" className="review-caption">Checking the terms and their supporting evidence. Payment stays paused during review.</p>}
    {result && !result.ok && <p role="alert" className="checkout-message error">{result.message}</p>}
    {result?.ok && <section className={`review-result ${result.decision}`} aria-live="polite">
      <p className="product-kicker">02 · Claude assessment</p>
      <h3>{result.decision === "eligible" ? "Terms ready for your approval" : result.decision === "blocked" ? "Payment paused: address these concerns" : "Ask the seller before paying"}</h3>
      {result.ruleOverride && <p className="rule-note">TrustPay’s built-in rules found a concern Claude didn’t flag, so the stricter result applies. Rules can pause checkout but never approve it.</p>}
      <p>{result.review.summary}</p>
      <details className="evidence-details" open={result.decision !== "eligible"}><summary>View {result.review.findings.length} findings and supporting quotes</summary>
      {result.review.findings.map((finding, index) => <div className={`review-finding ${finding.severity}`} key={index}>
        <strong>{finding.source === "rule" ? "TrustPay rule · " : ""}{finding.severity === "info" ? "Stated term" : finding.severity === "clarify" ? "Needs clarification" : "Payment concern"}</strong>
        <blockquote>“{finding.evidenceQuote}”</blockquote>
        <p>{finding.explanation}</p>
      </div>)}
      </details>
      {result.review.questions.length > 0 && <><h4>Questions for the seller</h4><ul>{result.review.questions.map((question) => <li key={question}>{question}</li>)}</ul><p>Add the answer above and review again.</p></>}
      <p className="review-caption">Model: {result.model}. Based on supplied text; seller identity and delivery have not been independently verified.</p>
      {result.decision === "eligible" && <>
        <label className="review-ack"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /> I reviewed the terms and want to approve this $5 Sandbox purchase.</label>
        {acknowledged && <PayPalCheckout key={result.assessmentId} clientId={clientId} assessmentId={result.assessmentId} onReviewExpired={(message) => { setResult({ ok: false, message }); setAcknowledged(false); }} />}
      </>}
    </section>}
    <section className="receipt-history">
      <button type="button" className="history-button" onClick={async () => {
        setHistoryMessage("Loading receipts…");
        try { const receipts = await receiptHistory(); setHistory(receipts); setHistoryMessage(receipts.length ? "" : "No saved receipts for this browser yet."); }
        catch { setHistoryMessage("Receipts could not be loaded. Please retry."); }
      }}>View saved receipts</button>
      <p role="status" className="review-caption">{historyMessage}</p>
      {history?.map((receipt) => <details key={receipt.assessmentId} className="evidence-details">
        <summary>{receipt.payment.amount} {receipt.payment.currency} · {receipt.payment.status} · {new Date(receipt.capturedAt).toLocaleDateString()}</summary>
        <p>{receipt.review.summary}</p>
        <dl className="saved-receipt"><dt>Review</dt><dd>{receipt.assessmentId}</dd>{receipt.acknowledgedAt && <><dt>Terms approved</dt><dd>{receipt.acknowledgedAt}</dd></>}<dt>Order</dt><dd>{receipt.payment.orderId}</dd><dt>Capture</dt><dd>{receipt.payment.captureId}</dd><dt>Captured</dt><dd>{receipt.capturedAt}</dd></dl>
      </details>)}
    </section>
  </div>;
}
