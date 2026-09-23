/**
 * In-memory demonstration data store. Stands in for the MySQL database
 * accessed by the Python backend until the REST API is available.
 *
 * Seeds a small organisation: departments, issued corporate cards,
 * authorised users, simulated transactions, detection alerts and audit logs.
 */
import type {
  AlertStatus,
  AuditLog,
  Card,
  Department,
  FraudAlert,
  Report,
  Severity,
  TimelineEvent,
  Transaction,
  User,
} from "./types";
import { evaluateRules, highestSeverity } from "./rules";

const STORAGE_KEY = "vantage_corporate_db_v1";

export interface DbShape {
  departments: Department[];
  users: Array<User & { password: string }>;
  cards: Card[];
  transactions: Transaction[];
  alerts: FraudAlert[];
  auditLogs: AuditLog[];
  reports: Report[];
  timelines: Record<number, TimelineEvent[]>;
  sequences: {
    department: number;
    user: number;
    card: number;
    transaction: number;
    alert: number;
    report: number;
    audit: number;
  };
}

const LOCATIONS = ["Lagos", "Abuja", "Kano", "Enugu", "Port Harcourt", "Ibadan"];
const TYPES = ["Purchase", "Online Payment", "ATM Withdrawal", "Transfer", "Fuel", "Travel"];
const MERCHANTS = [
  "ABC Equipment Ltd.",
  "Tridax Office Supplies",
  "Zenith Logistics",
  "Nexus Fuel Stations",
  "Cavendish Travel",
  "Grid Technologies",
  "Marion Catering Services",
  "Bluepoint Stationers",
];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const iso = (d: Date) => d.toISOString();

function buildSeed(): DbShape {
  const rand = seededRandom(20260923);
  const createdAt = iso(new Date("2026-01-12T09:00:00"));

  const departmentSeed = [
    ["FIN", "Finance", "Treasury, payments and expenditure control."],
    ["PRC", "Procurement", "Supplier purchasing and equipment acquisition."],
    ["ADM", "Administration", "Facilities, logistics and office operations."],
    ["ICT", "ICT", "Systems, hardware and technical services."],
    ["HRM", "Human Resources", "Staffing, welfare and training expenditure."],
    ["OPS", "Operations", "Field operations and service delivery."],
  ] as const;

  const departments: Department[] = departmentSeed.map(([code, name, description], i) => ({
    id: i + 1,
    department_code: code,
    name,
    description,
    status: "active",
    card_count: 0,
    user_count: 0,
    created_at: createdAt,
    updated_at: createdAt,
  }));

  const userSeed: Array<[string, string, string, number, User["role"]]> = [
    ["EMP-0001", "A. Okafor", "admin@vantage.demo", 1, "ADMIN"],
    ["EMP-0002", "T. Balogun", "analyst@vantage.demo", 1, "FRAUD_ANALYST"],
    ["EMP-0003", "John A. Eze", "john.eze@vantage.demo", 2, "CARD_USER"],
    ["EMP-0004", "M. Adeyemi", "m.adeyemi@vantage.demo", 2, "CARD_USER"],
    ["EMP-0005", "C. Nwankwo", "c.nwankwo@vantage.demo", 3, "CARD_USER"],
    ["EMP-0006", "S. Lawal", "s.lawal@vantage.demo", 4, "CARD_USER"],
    ["EMP-0007", "K. Danjuma", "k.danjuma@vantage.demo", 5, "CARD_USER"],
    ["EMP-0008", "R. Obi", "r.obi@vantage.demo", 6, "CARD_USER"],
    ["EMP-0009", "F. Yusuf", "f.yusuf@vantage.demo", 6, "CARD_USER"],
  ];

  const users: DbShape["users"] = userSeed.map(
    ([employee_id, full_name, email, department_id, role], i) => ({
      id: i + 1,
      employee_id,
      full_name,
      email,
      password: "vantage123",
      department_id,
      department_name: departments.find((d) => d.id === department_id)!.name,
      role,
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
    }),
  );

  const cardSeed: Array<[string, number, number | null, string]> = [
    ["4521", 1, 1, "Corporate Purchase"],
    ["8890", 2, 3, "Corporate Purchase"],
    ["4471", 2, 4, "Procurement"],
    ["3320", 3, 5, "Administration"],
    ["9012", 4, 6, "Technical Services"],
    ["6645", 5, 7, "Welfare"],
    ["7718", 6, 8, "Field Operations"],
    ["2204", 6, 9, "Field Operations"],
    ["5590", 1, 2, "Treasury"],
    ["1187", 4, null, "Technical Services"],
  ];

  const cards: Card[] = cardSeed.map(([last4, department_id, assigned_user_id, card_type], i) => {
    const dept = departments.find((d) => d.id === department_id)!;
    const holder = users.find((u) => u.id === assigned_user_id) ?? null;
    return {
      id: i + 1,
      card_reference: `CARD-${1000 + i + 1}`,
      masked_card_number: `**** **** **** ${last4}`,
      department_id,
      department_name: dept.name,
      assigned_user_id: holder?.id ?? null,
      assigned_user_name: holder?.full_name ?? null,
      card_type,
      issue_date: "2025-11-01",
      expiry_date: "2028-10-31",
      status: assigned_user_id === null ? "inactive" : "active",
      created_at: createdAt,
      updated_at: createdAt,
    };
  });

  const db: DbShape = {
    departments,
    users,
    cards,
    transactions: [],
    alerts: [],
    auditLogs: [],
    reports: [],
    timelines: {},
    sequences: {
      department: departments.length,
      user: users.length,
      card: cards.length,
      transaction: 10000,
      alert: 500,
      report: 0,
      audit: 0,
    },
  };

  const activeCards = cards.filter((c) => c.status === "active" && c.assigned_user_id);
  const now = Date.now();

  for (let i = 0; i < 260; i++) {
    const card = activeCards[Math.floor(rand() * activeCards.length)]!;
    const holder = users.find((u) => u.id === card.assigned_user_id)!;
    const daysAgo = Math.floor(rand() * 21);
    const when = new Date(now - daysAgo * 86400000 - Math.floor(rand() * 86400000));
    const big = rand() > 0.9;
    const amount = big
      ? Math.round((500_000 + rand() * 900_000) / 500) * 500
      : Math.round((8_000 + rand() * 180_000) / 100) * 100;
    const id = ++db.sequences.transaction;
    db.transactions.push({
      id,
      transaction_reference: `TXN-${id}`,
      card_id: card.id,
      card_reference: card.card_reference,
      masked_card_number: card.masked_card_number,
      user_id: holder.id,
      user_name: holder.full_name,
      department_id: card.department_id,
      department_name: card.department_name,
      amount,
      currency: "NGN",
      merchant: MERCHANTS[Math.floor(rand() * MERCHANTS.length)]!,
      location: LOCATIONS[Math.floor(rand() * LOCATIONS.length)]!,
      transaction_type: TYPES[Math.floor(rand() * TYPES.length)]!,
      transaction_time: iso(when),
      description: "Official departmental expenditure.",
      status: "Normal",
      authorised: true,
      created_at: iso(when),
      updated_at: iso(when),
    });
  }

  db.transactions.sort(
    (a, b) => +new Date(a.transaction_time) - +new Date(b.transaction_time),
  );

  const alertStatuses: AlertStatus[] = [
    "New",
    "Under Review",
    "Confirmed",
    "False Positive",
    "Resolved",
  ];

  const processed: Transaction[] = [];
  for (const tx of db.transactions) {
    const triggered = evaluateRules(tx, processed);
    const base = new Date(tx.transaction_time).getTime();
    const timeline: TimelineEvent[] = [
      { event: "Transaction Submitted", timestamp: iso(new Date(base)) },
      { event: "Transaction Recorded", timestamp: iso(new Date(base + 1000)) },
      { event: "Rule Evaluation Started", timestamp: iso(new Date(base + 1500)) },
    ];

    if (triggered.length > 0) {
      const severity: Severity = highestSeverity(triggered);
      const status = alertStatuses[Math.floor(rand() * alertStatuses.length)]!;
      tx.status = status === "False Positive" ? "Reviewed" : status === "Resolved" ? "Resolved" : "Suspicious";
      const alertId = ++db.sequences.alert;
      const primary = triggered[0]!;
      const reviewed = status === "New" ? null : iso(new Date(base + 180000));
      db.alerts.push({
        id: alertId,
        alert_reference: `ALT-${alertId}`,
        transaction_id: tx.id,
        transaction_reference: tx.transaction_reference,
        rule_id: primary.rule_id,
        rule_code: primary.rule_code,
        rule_name: primary.rule_name,
        triggered_rules: triggered.map((r) => r.rule_name),
        card_id: tx.card_id,
        masked_card_number: tx.masked_card_number,
        user_id: tx.user_id,
        user_name: tx.user_name,
        department_id: tx.department_id,
        department_name: tx.department_name,
        amount: tx.amount,
        location: tx.location,
        reason: triggered.map((r) => r.reason).join(" "),
        severity,
        status,
        detected_at: iso(new Date(base + 2000)),
        reviewed_at: reviewed,
        reviewed_by: reviewed ? "T. Balogun" : null,
        resolution_note:
          status === "Resolved"
            ? "Expenditure confirmed against departmental approval record."
            : status === "False Positive"
              ? "Reviewed and cleared — authorised departmental purchase."
              : null,
      });
      timeline.push(
        {
          event: "Suspicious Pattern Detected",
          timestamp: iso(new Date(base + 1800)),
          detail: primary.rule_name,
        },
        {
          event: "Fraud Alert Generated",
          timestamp: iso(new Date(base + 2000)),
          detail: `ALT-${alertId} · ${severity} severity`,
        },
      );
      if (reviewed) {
        timeline.push({ event: "Transaction Reviewed", timestamp: reviewed, detail: "T. Balogun" });
      }
      if (status === "Resolved") {
        timeline.push({ event: "Alert Resolved", timestamp: iso(new Date(base + 360000)) });
      }
    } else {
      timeline.push({
        event: "Rule Evaluation Completed",
        timestamp: iso(new Date(base + 1800)),
        detail: "No rule triggered",
      });
    }

    db.timelines[tx.id] = timeline;
    processed.push(tx);
  }

  db.transactions.sort(
    (a, b) => +new Date(b.transaction_time) - +new Date(a.transaction_time),
  );
  db.alerts.sort((a, b) => b.id - a.id);

  for (const d of db.departments) {
    d.card_count = db.cards.filter((c) => c.department_id === d.id).length;
    d.user_count = db.users.filter((u) => u.department_id === d.id).length;
  }

  db.auditLogs = [
    { action: "Departments initialised", entity_type: "Department", details: "6 departments created." },
    { action: "Cards issued", entity_type: "Card", details: `${db.cards.length} corporate cards issued.` },
    { action: "Users registered", entity_type: "User", details: `${db.users.length} authorised users registered.` },
    {
      action: "Simulation batch recorded",
      entity_type: "Transaction",
      details: `${db.transactions.length} simulated transactions recorded.`,
    },
    {
      action: "Detection run completed",
      entity_type: "FraudAlert",
      details: `${db.alerts.length} fraud alerts generated.`,
    },
  ].map((entry, i) => ({
    id: ++db.sequences.audit,
    user_id: 1,
    user_name: "A. Okafor",
    action: entry.action,
    entity_type: entry.entity_type,
    entity_id: null,
    timestamp: iso(new Date(Date.now() - (5 - i) * 60000)),
    details: entry.details,
  }));
  db.auditLogs.reverse();

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

export function audit(
  action: string,
  entity_type: string,
  entity_id: number | null,
  details: string,
  user: { id: number; full_name: string } | null,
) {
  const db = getDb();
  db.auditLogs.unshift({
    id: ++db.sequences.audit,
    user_id: user?.id ?? null,
    user_name: user?.full_name ?? "System",
    action,
    entity_type,
    entity_id,
    timestamp: new Date().toISOString(),
    details,
  });
  db.auditLogs = db.auditLogs.slice(0, 200);
}
