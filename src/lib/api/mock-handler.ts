/**
 * Mock REST layer. Mirrors the API contract of the Python backend so the
 * React application can be demonstrated without it. Deleting this file and
 * setting VITE_API_BASE_URL is all that is required to switch over.
 */
import { ApiError } from "./client";
import { getDb, persist } from "./mockDb";
import { RULE_CONFIG, evaluateRules } from "./rules";
import type {
  AlertStatus,
  AnalysisSummary,
  FraudAlert,
  FraudStats,
  GroupBucket,
  Paginated,
  Report,
  Transaction,
  TransactionResult,
  TrendPoint,
  User,
} from "./types";

const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms));

type Query = Record<string, string | number | undefined | null>;

interface Ctx {
  method: string;
  body?: unknown | undefined;
  query?: Query | undefined;
  token: string | null;
}

function requireAuth(ctx: Ctx) {
  const db = getDb();
  const user = db.users.find((u) => `demo-token-${u.id}` === ctx.token);
  if (!user) throw new ApiError(401, "Your session is no longer valid. Please sign in again.");
  return user;
}

function publicUser(u: User): User {
  return {
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
  };
}

const q = (query: Query | undefined, key: string) => {
  const v = query?.[key];
  return v === undefined || v === null || v === "" ? undefined : String(v);
};

function filterTransactions(query: Query | undefined): Transaction[] {
  const db = getDb();
  const ref = q(query, "reference")?.toLowerCase();
  const type = q(query, "transaction_type");
  const location = q(query, "location");
  const status = q(query, "status");
  const fraud = q(query, "fraud_status");
  const min = q(query, "min_amount");
  const max = q(query, "max_amount");
  const from = q(query, "start_date");
  const to = q(query, "end_date");

  return db.transactions.filter((t) => {
    if (ref && !t.transaction_reference.toLowerCase().includes(ref) && !t.card_reference.includes(ref))
      return false;
    if (type && t.transaction_type !== type) return false;
    if (location && t.location !== location) return false;
    if (status && t.status !== status) return false;
    if (fraud && t.fraud_status !== fraud) return false;
    if (min && t.amount < Number(min)) return false;
    if (max && t.amount > Number(max)) return false;
    if (from && new Date(t.transaction_date) < new Date(from)) return false;
    if (to && new Date(t.transaction_date) > new Date(`${to}T23:59:59`)) return false;
    return true;
  });
}

function paginate<T>(items: T[], query: Query | undefined): Paginated<T> {
  const page = Number(q(query, "page") ?? 1);
  const pageSize = Number(q(query, "page_size") ?? 10);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
  };
}

function group(items: Transaction[], key: "transaction_type" | "location"): GroupBucket[] {
  const map = new Map<string, GroupBucket>();
  for (const t of items) {
    const label = t[key];
    const bucket = map.get(label) ?? { label, count: 0, value: 0, suspicious: 0 };
    bucket.count += 1;
    bucket.value += t.amount;
    if (t.fraud_status === "suspicious") bucket.suspicious += 1;
    map.set(label, bucket);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export async function mockHandler<T>(path: string, ctx: Ctx): Promise<T> {
  await delay();
  const db = getDb();
  const { method, body, query } = ctx;

  // ---- Authentication ----
  if (path === "/api/auth/register" && method === "POST") {
    const input = body as { full_name: string; email: string; password: string };
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase()))
      throw new ApiError(409, "An account with that email already exists.");
    const user = {
      id: ++db.sequences.user,
      full_name: input.full_name,
      email: input.email,
      password: input.password,
      role: "analyst" as const,
      created_at: new Date().toISOString(),
    };
    db.users.push(user);
    persist();
    return { token: `demo-token-${user.id}`, user: publicUser(user) } as T;
  }

  if (path === "/api/auth/login" && method === "POST") {
    const input = body as { email: string; password: string };
    const user = db.users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase() && u.password === input.password,
    );
    if (!user) throw new ApiError(401, "Incorrect email or password.");
    return { token: `demo-token-${user.id}`, user: publicUser(user) } as T;
  }

  if (path === "/api/auth/logout" && method === "POST") return undefined as T;

  if (path === "/api/auth/me") return publicUser(requireAuth(ctx)) as T;

  const user = requireAuth(ctx);

  // ---- Transactions ----
  if (path === "/api/transactions" && method === "POST") {
    const input = body as Omit<Transaction, "id" | "user_id" | "status" | "fraud_status" | "created_at">;
    if (!input.transaction_reference || !input.card_reference || !input.amount)
      throw new ApiError(422, "Some of the information entered is not valid.");
    if (db.transactions.some((t) => t.transaction_reference === input.transaction_reference))
      throw new ApiError(409, "That transaction reference has already been recorded.");

    const tx: Transaction = {
      id: ++db.sequences.transaction,
      transaction_reference: input.transaction_reference,
      user_id: user.id,
      card_reference: input.card_reference,
      amount: Number(input.amount),
      transaction_type: input.transaction_type,
      location: input.location,
      transaction_date: input.transaction_date,
      status: "processed",
      fraud_status: "normal",
      created_at: new Date().toISOString(),
    };

    const outcome = evaluateRules(tx, db.transactions);
    let alertId: number | null = null;
    if (outcome.triggered_rules.length > 0) {
      tx.fraud_status = "suspicious";
      alertId = ++db.sequences.alert;
      const alert: FraudAlert = {
        id: alertId,
        transaction_id: tx.id,
        transaction_reference: tx.transaction_reference,
        amount: tx.amount,
        location: tx.location,
        transaction_date: tx.transaction_date,
        rule_name: outcome.triggered_rules[0]!,
        triggered_rules: outcome.triggered_rules,
        reason: outcome.reasons.join(" "),
        alert_status: "New",
        created_at: new Date().toISOString(),
        reviewed_at: null,
      };
      db.alerts.unshift(alert);
    }
    db.transactions.unshift(tx);
    persist();

    const result: TransactionResult = {
      transaction_id: tx.id,
      transaction_reference: tx.transaction_reference,
      status: tx.status,
      fraud_status: tx.fraud_status,
      alert_generated: alertId !== null,
      alert_id: alertId,
      triggered_rules: outcome.triggered_rules,
    };
    return result as T;
  }

  if ((path === "/api/transactions" || path === "/api/transactions/search") && method === "GET") {
    return paginate(filterTransactions(query), query) as T;
  }

  const txMatch = path.match(/^\/api\/transactions\/(\d+)$/);
  if (txMatch) {
    const tx = db.transactions.find((t) => t.id === Number(txMatch[1]));
    if (!tx) throw new ApiError(404, "The requested record could not be found.");
    return tx as T;
  }

  // ---- Alerts ----
  if (path === "/api/alerts" && method === "GET") {
    const status = q(query, "alert_status");
    const search = q(query, "search")?.toLowerCase();
    const items = db.alerts.filter((a) => {
      if (status && a.alert_status !== status) return false;
      if (search && !a.transaction_reference.toLowerCase().includes(search)) return false;
      return true;
    });
    return paginate(items, query) as T;
  }

  const alertMatch = path.match(/^\/api\/alerts\/(\d+)$/);
  if (alertMatch) {
    const alert = db.alerts.find((a) => a.id === Number(alertMatch[1]));
    if (!alert) throw new ApiError(404, "The requested record could not be found.");
    if (method === "PUT") {
      const input = body as { alert_status: AlertStatus };
      alert.alert_status = input.alert_status;
      alert.reviewed_at = input.alert_status === "New" ? null : new Date().toISOString();
      persist();
    }
    return alert as T;
  }

  // ---- Analysis ----
  if (path === "/api/analysis/summary") {
    const items = filterTransactions(query);
    const suspicious = items.filter((t) => t.fraud_status === "suspicious").length;
    const total_value = items.reduce((s, t) => s + t.amount, 0);
    const summary: AnalysisSummary = {
      total_transactions: items.length,
      normal_transactions: items.length - suspicious,
      suspicious_transactions: suspicious,
      alert_count: db.alerts.length,
      new_alerts: db.alerts.filter((a) => a.alert_status === "New").length,
      total_value,
      average_value: items.length ? Math.round(total_value / items.length) : 0,
    };
    return summary as T;
  }

  if (path === "/api/analysis/trends") {
    const days = Number(q(query, "days") ?? 14);
    const points: TrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day.getTime() + 86400000);
      const items = db.transactions.filter((t) => {
        const d = new Date(t.transaction_date);
        return d >= day && d < next;
      });
      points.push({
        date: day.toISOString(),
        count: items.length,
        suspicious: items.filter((t) => t.fraud_status === "suspicious").length,
        value: items.reduce((s, t) => s + t.amount, 0),
      });
    }
    return points as T;
  }

  if (path === "/api/analysis/by-type") return group(filterTransactions(query), "transaction_type") as T;
  if (path === "/api/analysis/by-location") return group(filterTransactions(query), "location") as T;

  if (path === "/api/analysis/fraud") {
    const ruleCounts = new Map<string, number>();
    for (const a of db.alerts)
      for (const r of a.triggered_rules) ruleCounts.set(r, (ruleCounts.get(r) ?? 0) + 1);
    const statuses: AlertStatus[] = ["New", "Under Review", "Reviewed", "Resolved"];
    const stats: FraudStats = {
      by_rule: [...ruleCounts.entries()]
        .map(([rule_name, count]) => ({ rule_name, count }))
        .sort((a, b) => b.count - a.count),
      by_alert_status: statuses.map((s) => ({
        alert_status: s,
        count: db.alerts.filter((a) => a.alert_status === s).length,
      })),
      suspicious_rate: db.transactions.length
        ? db.transactions.filter((t) => t.fraud_status === "suspicious").length /
          db.transactions.length
        : 0,
    };
    return stats as T;
  }

  if (path === "/api/analysis/rules") return RULE_CONFIG as T;

  // ---- Reports ----
  if (path === "/api/reports/generate" && method === "POST") {
    const input = body as { report_type: string; start_date: string; end_date: string };
    const items = db.transactions.filter((t) => {
      const d = new Date(t.transaction_date);
      return d >= new Date(input.start_date) && d <= new Date(`${input.end_date}T23:59:59`);
    });
    const suspicious = items.filter((t) => t.fraud_status === "suspicious");
    const report: Report = {
      id: ++db.sequences.report,
      report_type: input.report_type,
      start_date: input.start_date,
      end_date: input.end_date,
      generated_by: user.id,
      report_data: {
        total_transactions: items.length,
        total_value: items.reduce((s, t) => s + t.amount, 0),
        normal_transactions: items.length - suspicious.length,
        suspicious_transactions: suspicious.length,
        alert_count: db.alerts.filter((a) =>
          items.some((t) => t.id === a.transaction_id),
        ).length,
        by_type: group(items, "transaction_type").map((b) => ({
          label: b.label,
          count: b.count,
          value: b.value,
        })),
        by_location: group(items, "location").map((b) => ({
          label: b.label,
          count: b.count,
          value: b.value,
        })),
      },
      created_at: new Date().toISOString(),
    };
    db.reports.unshift(report);
    persist();
    return report as T;
  }

  if (path === "/api/reports" && method === "GET") return db.reports as T;

  const reportMatch = path.match(/^\/api\/reports\/(\d+)$/);
  if (reportMatch) {
    const report = db.reports.find((r) => r.id === Number(reportMatch[1]));
    if (!report) throw new ApiError(404, "The requested record could not be found.");
    return report as T;
  }

  throw new ApiError(404, "The requested record could not be found.");
}
