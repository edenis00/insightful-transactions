/**
 * In-memory demonstration data store. Stands in for the MySQL database
 * accessed by the Python backend until the REST API is available.
 */
import type {
  AlertStatus,
  FraudAlert,
  Report,
  Transaction,
  User,
} from "./types";
import { evaluateRules } from "./rules";

const STORAGE_KEY = "vantage_demo_db_v1";

interface DbShape {
  users: Array<User & { password: string }>;
  transactions: Transaction[];
  alerts: FraudAlert[];
  reports: Report[];
  sequences: { user: number; transaction: number; alert: number; report: number };
}

const TYPES = ["Online Purchase", "ATM Withdrawal", "In-Store", "Transfer"];
const LOCATIONS = ["Lagos", "Abuja", "Kano", "Enugu", "Port Harcourt", "Ibadan"];
const CARDS = [
  "**** **** **** 1234",
  "**** **** **** 8890",
  "**** **** **** 4471",
  "**** **** **** 3320",
  "**** **** **** 9012",
  "**** **** **** 6645",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function buildSeed(): DbShape {
  const rand = seededRandom(20260908);
  const db: DbShape = {
    users: [
      {
        id: 1,
        full_name: "A. Okafor",
        email: "analyst@vantage.demo",
        password: "vantage123",
        role: "admin",
        created_at: new Date("2026-01-12T09:00:00").toISOString(),
      },
    ],
    transactions: [],
    alerts: [],
    reports: [],
    sequences: { user: 1, transaction: 10000, alert: 500, report: 0 },
  };

  const now = Date.now();
  for (let i = 0; i < 220; i++) {
    const daysAgo = Math.floor(rand() * 14);
    const date = new Date(now - daysAgo * 86400000 - Math.floor(rand() * 86400000));
    const big = rand() > 0.9;
    const amount = big
      ? Math.round((200000 + rand() * 1200000) / 500) * 500
      : Math.round((1500 + rand() * 150000) / 100) * 100;
    const id = ++db.sequences.transaction;
    const tx: Transaction = {
      id,
      transaction_reference: `TXN-${id}`,
      user_id: 1,
      card_reference: CARDS[Math.floor(rand() * CARDS.length)],
      amount,
      transaction_type: TYPES[Math.floor(rand() * TYPES.length)],
      location: LOCATIONS[Math.floor(rand() * LOCATIONS.length)],
      transaction_date: date.toISOString(),
      status: "processed",
      fraud_status: "normal",
      created_at: date.toISOString(),
    };
    db.transactions.push(tx);
  }

  db.transactions.sort(
    (a, b) => +new Date(a.transaction_date) - +new Date(b.transaction_date),
  );

  const processed: Transaction[] = [];
  for (const tx of db.transactions) {
    const outcome = evaluateRules(tx, processed);
    if (outcome.triggered_rules.length > 0) {
      tx.fraud_status = "suspicious";
      const alertId = ++db.sequences.alert;
      const statuses: AlertStatus[] = ["New", "Under Review", "Reviewed", "Resolved"];
      const status = statuses[Math.floor(rand() * statuses.length)];
      db.alerts.push({
        id: alertId,
        transaction_id: tx.id,
        transaction_reference: tx.transaction_reference,
        amount: tx.amount,
        location: tx.location,
        transaction_date: tx.transaction_date,
        rule_name: outcome.triggered_rules[0],
        triggered_rules: outcome.triggered_rules,
        reason: outcome.reasons.join(" "),
        alert_status: status,
        created_at: tx.transaction_date,
        reviewed_at: status === "New" ? null : tx.transaction_date,
      });
    }
    processed.push(tx);
  }

  db.transactions.sort(
    (a, b) => +new Date(b.transaction_date) - +new Date(a.transaction_date),
  );
  db.alerts.sort((a, b) => b.id - a.id);
  return db;
}

let cache: DbShape | null = null;

export function getDb(): DbShape {
  if (cache) return cache;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        cache = JSON.parse(raw) as DbShape;
        return cache;
      } catch {
        /* fall through to reseed */
      }
    }
  }
  cache = buildSeed();
  persist();
  return cache;
}

export function persist() {
  if (typeof window === "undefined" || !cache) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}
