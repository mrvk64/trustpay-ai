import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustPay AI | Review before you pay",
  description:
    "Claude reviews a seller's terms, code-owned rules decide checkout eligibility, and PayPal Sandbox captures the approved purchase.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
