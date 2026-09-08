/**
 * Rule-based fraud detection — DEMO STAND-IN ONLY.
 *
 * In the production system this logic lives in the Python backend
 * (app/fraud_detection/rules.py). It is duplicated here purely so the
 * React frontend can be demonstrated before the API exists. It is kept
 * out of components: only the mock API layer calls it, and it disappears
 * entirely once VITE_API_BASE_URL points at the real backend.
 */
import type { Transaction } from "./types";

export const RULE_CONFIG = {
  amountThreshold: 200_000,
  frequencyLimit: 5,
  frequencyWindowMinutes: 15,
};

export const RULE_NAMES = {
  amount: "High Transaction Amount",
  frequency: "High Transaction Frequency",
  location: "Unusual Location",
} as const;

export interface RuleOutcome {
  triggered_rules: string[];
  reasons: string[];
}

export function evaluateRules(
  candidate: Transaction,
  history: Transaction[],
): RuleOutcome {
  const triggered: string[] = [];
  const reasons: string[] = [];

  if (candidate.amount > RULE_CONFIG.amountThreshold) {
    triggered.push(RULE_NAMES.amount);
    reasons.push(
      `Amount ${candidate.amount.toLocaleString()} exceeds the configured threshold of ${RULE_CONFIG.amountThreshold.toLocaleString()}.`,
    );
  }

  const windowMs = RULE_CONFIG.frequencyWindowMinutes * 60 * 1000;
  const candidateTime = new Date(candidate.transaction_date).getTime();
  const recent = history.filter(
    (t) =>
      t.id !== candidate.id &&
      t.card_reference === candidate.card_reference &&
      Math.abs(new Date(t.transaction_date).getTime() - candidateTime) <= windowMs,
  );
  if (recent.length + 1 > RULE_CONFIG.frequencyLimit) {
    triggered.push(RULE_NAMES.frequency);
    reasons.push(
      `${recent.length + 1} transactions on ${candidate.card_reference} within ${RULE_CONFIG.frequencyWindowMinutes} minutes.`,
    );
  }

  const cardHistory = history.filter(
    (t) => t.id !== candidate.id && t.card_reference === candidate.card_reference,
  );
  if (cardHistory.length >= 3) {
    const known = new Set(cardHistory.map((t) => t.location));
    if (!known.has(candidate.location)) {
      triggered.push(RULE_NAMES.location);
      reasons.push(
        `Location ${candidate.location} differs from the established locations for this card.`,
      );
    }
  }

  return { triggered_rules: triggered, reasons };
}
