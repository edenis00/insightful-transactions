/**
 * Rule-based detection — DEMONSTRATION STAND-IN ONLY.
 *
 * In the delivered system this logic lives in the Python backend
 * (app/fraud_detection/rules.py). It is reproduced here so the React client
 * can be demonstrated before the API exists, and is only ever called by the
 * mock API layer — never by a component. Setting VITE_API_BASE_URL retires it.
 */
import type { FraudRule, RuleCode, Severity, Transaction } from "./types";

export interface RuleDefinition {
  rule_code: RuleCode;
  rule_name: string;
  description: string;
  threshold: number;
  threshold_label: string;
  severity: Severity;
  logic: string;
}

export const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    rule_code: "HIGH_AMOUNT",
    rule_name: "High Transaction Amount",
    description:
      "Flags a single transaction whose value exceeds the configured expenditure ceiling for a corporate card.",
    threshold: 500_000,
    threshold_label: "₦500,000 per transaction",
    severity: "High",
    logic: "IF transaction amount > configured threshold THEN flag transaction",
  },
  {
    rule_code: "RAPID_TRANSACTIONS",
    rule_name: "Multiple Transactions",
    description:
      "Flags a card used more times than permitted inside a short window, indicating possible card misuse.",
    threshold: 4,
    threshold_label: "more than 4 in 15 minutes",
    severity: "Medium",
    logic: "IF multiple transactions occur within a short period THEN flag transaction",
  },
  {
    rule_code: "UNUSUAL_LOCATION",
    rule_name: "Unusual Location",
    description:
      "Flags expenditure recorded in a location outside the established activity of the card.",
    threshold: 3,
    threshold_label: "after 3 established locations",
    severity: "Medium",
    logic: "IF transaction location differs from expected activity THEN flag transaction",
  },
  {
    rule_code: "UNUSUAL_SPENDING",
    rule_name: "Unusual Spending Pattern",
    description:
      "Compares the transaction against the historical average for the card and flags a substantial departure.",
    threshold: 5,
    threshold_label: "5× the card average",
    severity: "High",
    logic:
      "IF transaction amount/frequency significantly differs from previous transaction behaviour THEN flag transaction",
  },
];

export const FRAUD_RULES: Omit<FraudRule, "alert_count">[] = RULE_DEFINITIONS.map(
  (r, i) => ({
    id: i + 1,
    rule_code: r.rule_code,
    rule_name: r.rule_name,
    description: r.description,
    threshold: r.threshold,
    threshold_label: r.threshold_label,
    severity: r.severity,
    status: "active",
  }),
);

export interface TriggeredRule {
  rule_id: number;
  rule_code: RuleCode;
  rule_name: string;
  severity: Severity;
  reason: string;
}

const RULE_WINDOW_MS = 15 * 60 * 1000;

export function evaluateRules(
  candidate: Transaction,
  history: Transaction[],
): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];
  const def = (code: RuleCode) => RULE_DEFINITIONS.find((r) => r.rule_code === code)!;
  const id = (code: RuleCode) => FRAUD_RULES.find((r) => r.rule_code === code)!.id;
  const push = (code: RuleCode, reason: string) => {
    const d = def(code);
    triggered.push({
      rule_id: id(code),
      rule_code: code,
      rule_name: d.rule_name,
      severity: d.severity,
      reason,
    });
  };

  const amountRule = def("HIGH_AMOUNT");
  if (candidate.amount > amountRule.threshold) {
    push(
      "HIGH_AMOUNT",
      `Amount ₦${candidate.amount.toLocaleString()} exceeds the configured ceiling of ₦${amountRule.threshold.toLocaleString()}.`,
    );
  }

  const cardHistory = history.filter(
    (t) => t.id !== candidate.id && t.card_id === candidate.card_id,
  );
  const candidateTime = new Date(candidate.transaction_time).getTime();

  const rapidRule = def("RAPID_TRANSACTIONS");
  const recent = cardHistory.filter(
    (t) => Math.abs(new Date(t.transaction_time).getTime() - candidateTime) <= RULE_WINDOW_MS,
  );
  if (recent.length + 1 > rapidRule.threshold) {
    push(
      "RAPID_TRANSACTIONS",
      `${recent.length + 1} transactions recorded on ${candidate.masked_card_number} within 15 minutes.`,
    );
  }

  const locationRule = def("UNUSUAL_LOCATION");
  if (cardHistory.length >= locationRule.threshold) {
    const known = new Set(cardHistory.map((t) => t.location));
    if (!known.has(candidate.location)) {
      push(
        "UNUSUAL_LOCATION",
        `${candidate.location} is outside the established activity for this card (${[...known].join(", ")}).`,
      );
    }
  }

  const spendRule = def("UNUSUAL_SPENDING");
  if (cardHistory.length >= 5) {
    const average =
      cardHistory.reduce((s, t) => s + t.amount, 0) / cardHistory.length;
    if (average > 0 && candidate.amount > average * spendRule.threshold) {
      push(
        "UNUSUAL_SPENDING",
        `Amount ₦${candidate.amount.toLocaleString()} is more than ${spendRule.threshold}× the card average of ₦${Math.round(average).toLocaleString()}.`,
      );
    }
  }

  return triggered;
}

export function highestSeverity(rules: TriggeredRule[]): Severity {
  if (rules.some((r) => r.severity === "High")) return "High";
  if (rules.some((r) => r.severity === "Medium")) return "Medium";
  return "Low";
}
