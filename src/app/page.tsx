import TransactionReview from "@/components/transaction-review";
import { DEMO_PRODUCT } from "@/lib/demo-product";
import { getPublicPayPalConfig } from "@/lib/paypal/config";

const flow = [
  {
    step: "01",
    title: "Review",
    copy: "Claude reviews the seller’s terms and asks for missing details.",
    state: "active",
  },
  {
    step: "02",
    title: "Approve",
    copy: "The buyer approves a real order inside PayPal Sandbox.",
    state: "active",
  },
  {
    step: "03",
    title: "Capture",
    copy: "The server captures the approved order and returns a receipt.",
    state: "active",
  },
] as const;

export default function Home() {
  const payPalConfig = getPublicPayPalConfig();

  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="TrustPay AI home">
          <span className="brand-mark" aria-hidden="true">
            T
          </span>
          <span>TrustPay AI</span>
        </a>
        <div className="build-badge">
          <span className="status-dot" aria-hidden="true" />
          Sandbox build 0.2
        </div>
      </nav>

      <div id="top" className="hero-grid">
        <section className="hero-copy" aria-labelledby="hero-title">
          <div className="eyebrow">
            <span>Review → Clarify → Pay</span>
            <span aria-hidden="true">·</span>
            <span>Powered by Claude</span>
          </div>
          <h1 id="hero-title">
            Confidence before <span>commitment.</span>
          </h1>
          <p className="hero-lede">
            Buying a digital service from someone new? Understand the seller’s
            promise, resolve missing terms, and approve your purchase through
            PayPal once you have reviewed the evidence.
          </p>

          <div className="promise-row" aria-label="Milestone guarantees">
            <div>
              <strong>Sandbox only</strong>
              <span>No real money moves</span>
            </div>
            <div>
              <strong>Server verified</strong>
              <span>Price never comes from the browser</span>
            </div>
          </div>

          <ol className="flow-list" aria-label="TrustPay transaction flow">
            {flow.map((item) => (
              <li key={item.step}>
                <span className="flow-step">{item.step}</span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.copy}</p>
                </div>
                <span className="flow-state">
                  Ready
                </span>
              </li>
            ))}
          </ol>
        </section>

        <aside className="checkout-card" aria-labelledby="checkout-title">
          <div className="card-topline">
            <span className="sandbox-pill">PayPal Sandbox</span>
            <span className="secure-label">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10V8a5 5 0 0 1 10 0v2m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z" />
              </svg>
              Server secured
            </span>
          </div>

          <div className="product-block">
            <div className="product-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <path d="M24 5 39 11v11c0 10-6.4 17.2-15 21-8.6-3.8-15-11-15-21V11l15-6Z" />
                <path d="m17.5 24 4.2 4.2 9.2-9.4" />
              </svg>
            </div>
            <div>
              <p className="product-kicker">Demo purchase</p>
              <h2 id="checkout-title">{DEMO_PRODUCT.name}</h2>
              <p>{DEMO_PRODUCT.description}</p>
            </div>
          </div>

          <div className="order-line">
            <span>One-time sandbox charge</span>
            <strong>
              ${DEMO_PRODUCT.price} {DEMO_PRODUCT.currency}
            </strong>
          </div>

          <div className="checkout-area">
            {payPalConfig ? (
              <TransactionReview
                clientId={payPalConfig.clientId}
              />
            ) : (
              <div className="setup-panel" role="status">
                <span className="setup-number">1</span>
                <div>
                  <strong>Connect your Sandbox app</strong>
                  <p>
                    Copy <code>.env.example</code> to <code>.env.local</code>,
                    then add your own PayPal Sandbox client ID and secret.
                  </p>
                  <p className="setup-note">
                    Keep the secret local—never paste it into chat or commit it.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card-footer">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 4.5 6v5.5c0 5 3.2 8.6 7.5 10.5 4.3-1.9 7.5-5.5 7.5-10.5V6L12 3Z" />
                <path d="m8.5 12 2.2 2.2 4.8-4.9" />
              </svg>
              Credentials stay server-side
            </span>
            <span>Orders API v2</span>
          </div>
        </aside>
      </div>

      <footer className="site-footer">
        <span>TrustPay AI · Hackathon prototype</span>
        <a href="https://github.com/mrvk64/trustpay-ai">Source on GitHub</a>
      </footer>
    </main>
  );
}
