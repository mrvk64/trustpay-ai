import { DEMO_PRODUCT } from "@/lib/demo-product";
import type { ReviewFinding, TransactionReview } from "./policy";

/**
 * Deterministic checks that run after Claude. They only ever add findings, so code can pause a
 * checkout the model would allow but can never approve one the model paused.
 * Rules favour precision: a missed phrase still has Claude's review in front of it, while a
 * false alarm would block an honest seller.
 */
type Rule = {
  severity: "clarify" | "block";
  explanation: string;
  pattern: RegExp;
  /** When set, this must also appear in the same sentence. */
  context?: RegExp;
};

const RULES: Rule[] = [
  {
    severity: "block",
    explanation: "The terms mention account passwords or verification codes. Delivering this purchase never requires them.",
    pattern: /\b(?:pass ?words?(?!-protected)|passcodes?|verification codes?|security codes?|one[- ]time (?:pass)?codes?|otps?|2fa codes?|login (?:details|credentials)|account credentials)\b/gi,
  },
  {
    severity: "block",
    explanation: "The terms mention paying through something other than the displayed PayPal checkout.",
    pattern: /\b(?:gift ?cards?|wire transfers?|western union|moneygram|zelle|venmo|cash ?app|crypto(?:currency)?|bitcoin|usdt|friends (?:and|&) family)\b/gi,
  },
  {
    severity: "block",
    explanation: "The terms ask for a payment outside the displayed PayPal checkout.",
    pattern: /\b(?:outside (?:of )?(?:paypal|the checkout|this checkout)|off[- ]platform|directly to (?:me|my)|(?:this|my|a separate) (?:payment )?link)\b/gi,
    context: /\b(?:pay|paid|paying|payment|fee|deposit|tip|transfer|unlock|charge|money|funds|usd)\b|\$/i,
  },
];

const NEGATION = /\b(?:no|not|never|without|nor|don't|doesn't|won't|isn't|aren't|do not|does not|will not)\b/i;
// Negation carries across commas ("not Zelle, Venmo, or crypto") but not into a new clause.
const CLAUSE_BREAK = /[;:()–—]|\s-\s|\b(?:but|just|however|instead|then|so)\b/i;
const NEGATED_AFTER = /^[\s,]*(?:(?:is|are|was|were|will be)\s+(?:never|not)\b|isn't|aren't|won't be)/i;
const AMOUNT = /(?:US\$|\$|\bUSD ?)(\d[\d,]*(?:\.\d{1,2})?)|\b(\d[\d,]*(?:\.\d{1,2})?) ?(?:USD|dollars?)\b/gi;

function isNegated(sentence: string, index: number, length: number) {
  const clause = sentence.slice(0, index).split(CLAUSE_BREAK).at(-1) ?? "";
  return NEGATION.test(clause) || NEGATED_AFTER.test(sentence.slice(index + length));
}

/** A short exact excerpt, so rule findings carry evidence the same way Claude's must. */
function quoteAround(sentence: string, index: number) {
  if (sentence.length <= 300) return sentence.trim();
  const start = Math.max(0, index - 120);
  return sentence.slice(start, start + 300).trim();
}

function ruleFinding(rule: Rule, sentences: string[]): ReviewFinding | null {
  for (const sentence of sentences) {
    const plain = sentence.replace(/[‘’]/g, "'");
    if (rule.context && !rule.context.test(plain)) continue;
    for (const match of plain.matchAll(rule.pattern)) {
      if (!isNegated(plain, match.index, match[0].length)) {
        return { severity: rule.severity, explanation: rule.explanation, evidenceQuote: quoteAround(sentence, match.index), source: "rule" };
      }
    }
  }
  return null;
}

/** Stated prices must include the amount PayPal will actually charge. */
function priceFinding(sentences: string[]): ReviewFinding | null {
  const price = Number(DEMO_PRODUCT.price);
  let first: { sentence: string; index: number } | null = null;
  for (const sentence of sentences) {
    for (const match of sentence.matchAll(AMOUNT)) {
      if (Number((match[1] ?? match[2]).replace(/,/g, "")) === price) return null;
      first ??= { sentence, index: match.index };
    }
  }
  return first && {
    severity: "clarify",
    explanation: `The terms state a price that doesn't match the ${DEMO_PRODUCT.currency} ${DEMO_PRODUCT.price} charged at checkout. Ask the seller to confirm the price.`,
    evidenceQuote: quoteAround(first.sentence, first.index),
    source: "rule",
  };
}

export function applyRuleChecks(evidence: string, review: TransactionReview): TransactionReview {
  const sentences = evidence.split(/(?<=[.!?])\s+|\n+/).filter((sentence) => sentence.trim());
  const found = [...RULES.map((rule) => ruleFinding(rule, sentences)), priceFinding(sentences)];
  return {
    ...review,
    findings: [
      ...review.findings.map((finding) => ({ ...finding, source: finding.source ?? "claude" as const })),
      ...found.filter((finding) => finding !== null),
    ],
  };
}
