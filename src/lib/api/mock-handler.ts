/**
 * Mock REST layer. Mirrors the /api/v1 contract of the Python/FastAPI backend
 * so the React application can be demonstrated without it. Deleting this file
 * and setting VITE_API_BASE_URL is all that is required to switch over.
 */
import { ApiError } from "./client";
import { audit, getDb, persist } from "./mockDb";
import { FRAUD_RULES, RULE_DEFINITIONS, evaluateRules, highestSeverity } from "./rules";
import type {
  AlertStatus,
  AnalysisBreakdown,
  AuditLog,
  Card,
  DashboardSummary,
  Department,
  FraudAlert,
  FraudRule,
  GroupBucket,
  Paginated,
  Report,
  Severity,
  TimelineEvent,
  Transaction,
  TransactionDetail,
  TransactionResult,
  TrendPoint,
  User,
  UserProfile,
} from "./types";

const delay = (ms = 240) => new Promise((r) => setTimeout(r, ms));

type Query = Record<string, string | number | undefined | null>;

interface Ctx {
  method: string;
  body?: unknown | undefined;
  query?: Query | undefined;
  token: string | null;
}

type StoredUser = User & { password: string };

function requireAuth(ctx: Ctx): StoredUser {
  const db = getDb();
  const user = db.users.find((u) => `demo-token-${u.id}` === ctx.token);
  if (!user) throw new ApiError(401, "Your session is no longer valid. Please sign in again.");
  if (user.status !== "active") throw new ApiError(403, "This account has been deactivated.");
  return user;
}

function requireAdmin(user: StoredUser) {
  if (user.role === "CARD_USER")
    throw new ApiError(403, "You do not have permission to perform this action.");
}

function publicUser(u: StoredUser | User): User {
  const { id, employee_id, full_name, email, department_id, department_name, role, status, created_at, updated_at } = u;
  return { id, employee_id, full_name, email, department_id, department_name, role, status, created_at, updated_at };
}

const q = (query: Query | undefined, key: string) => {
  const v = query?.[key];
  return v === undefined || v === null || v === "" ? undefined : String(v);
};

/** Card users only ever see their own activity. */
function scopeTransactions(user: StoredUser, items: Transaction[]): Transaction[] {
  if (user.role !== "CARD_USER") return items;
  return items.filter((t) => t.user_id === user.id);
}

function filterTransactions(user: StoredUser, query: Query | undefined): Transaction[] {
  const db = getDb();
  const search = q(query, "search")?.toLowerCase();
  const department = q(query, "department_id");
  const cardId = q(query, "card_id");
  const userId = q(query, "user_id");
  const type = q(query, "transaction_type");
  const location = q(query, "location");
  const status = q(query, "status");
  const min = q(query, "min_amount");
  const max = q(query, "max_amount");
  const from = q(query, "start_date");
  const to = q(query, "end_date");

  return scopeTransactions(user, db.transactions).filter((t) => {
    if (search) {
      const haystack = [
        t.transaction_reference,
        t.masked_card_number,
        t.card_reference,
        t.user_name,
        t.department_name,
        t.merchant,
        t.location,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (department && t.department_id !== Number(department)) return false;
    if (cardId && t.card_id !== Number(cardId)) return false;
    if (userId && t.user_id !== Number(userId)) return false;
    if (type && t.transaction_type !== type) return false;
    if (location && t.location !== location) return false;
    if (status && t.status !== status) return false;
    if (min && t.amount < Number(min)) return false;
    if (max && t.amount > Number(max)) return false;
    if (from && new Date(t.transaction_time) < new Date(from)) return false;
    if (to && new Date(t.transaction_time) > new Date(`${to}T23:59:59`)) return false;
    return true;
  });
}

function paginate<T>(items: T[], query: Query | undefined): Paginated<T> {
  const page = Number(q(query, "page") ?? 1);
  const pageSize = Number(q(query, "page_size") ?? 10);
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, page_size: pageSize };
}

function group(items: Transaction[], key: (t: Transaction) => string): GroupBucket[] {
  const map = new Map<string, GroupBucket>();
  for (const t of items) {
    const label = key(t);
    const bucket = map.get(label) ?? { label, count: 0, value: 0, suspicious: 0 };
    bucket.count += 1;
    bucket.value += t.amount;
    if (t.status !== "Normal") bucket.suspicious += 1;
    map.set(label, bucket);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

function rulesWithCounts(): FraudRule[] {
  const db = getDb();
  return FRAUD_RULES.map((r) => ({
    ...r,
    threshold: RULE_DEFINITIONS.find((d) => d.rule_code === r.rule_code)!.threshold,
    threshold_label: RULE_DEFINITIONS.find((d) => d.rule_code === r.rule_code)!.threshold_label,
    alert_count: db.alerts.filter((a) => a.triggered_rules.includes(r.rule_name)).length,
  }));
}

function recordTransaction(
  input: {
    card_id: number;
    user_id: number;
    amount: number;
    merchant: string;
    location: string;
    transaction_type: string;
    transaction_time: string;
    description: string;
  },
  actor: StoredUser,
): TransactionResult {
  const db = getDb();
  const card = db.cards.find((c) => c.id === Number(input.card_id));
  if (!card) throw new ApiError(422, "The selected card could not be found.");
  if (card.status !== "active") throw new ApiError(422, "That card is not active and cannot be used.");
  const holder = db.users.find((u) => u.id === Number(input.user_id));
  if (!holder) throw new ApiError(422, "The selected user could not be found.");
  if (holder.status !== "active") throw new ApiError(422, "That user account is not active.");
  if (!(input.amount > 0)) throw new ApiError(422, "The amount must be greater than zero.");
  if (!input.merchant || !input.location || !input.transaction_time)
    throw new ApiError(422, "Merchant, location and transaction time are required.");
  if (Number.isNaN(new Date(input.transaction_time).getTime()))
    throw new ApiError(422, "The transaction date and time is not valid.");

  const authorised = card.assigned_user_id === holder.id;
  const id = ++db.sequences.transaction;
  const when = new Date(input.transaction_time);
  const base = when.getTime();
  const nowIso = new Date().toISOString();

  const tx: Transaction = {
    id,
    transaction_reference: `TXN-${id}`,
    card_id: card.id,
    card_reference: card.card_reference,
    masked_card_number: card.masked_card_number,
    user_id: holder.id,
    user_name: holder.full_name,
    department_id: card.department_id,
    department_name: card.department_name,
    amount: Number(input.amount),
    currency: "NGN",
    merchant: input.merchant,
    location: input.location,
    transaction_type: input.transaction_type,
    transaction_time: when.toISOString(),
    description: input.description,
    status: "Normal",
    authorised,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const triggered = evaluateRules(tx, db.transactions);
  if (!authorised) {
    triggered.push({
      rule_id: 0,
      rule_code: "UNUSUAL_SPENDING",
      rule_name: "Unauthorised Card Use",
      severity: "High",
      reason: `${holder.full_name} is not the authorised holder of ${card.masked_card_number}.`,
    });
  }

  const timeline: TimelineEvent[] = [
    { event: "Transaction Submitted", timestamp: new Date(base).toISOString() },
    { event: "Card Verified", timestamp: new Date(base + 500).toISOString(), detail: card.masked_card_number },
    { event: "User Verified", timestamp: new Date(base + 800).toISOString(), detail: holder.full_name },
    { event: "Transaction Recorded", timestamp: new Date(base + 1000).toISOString() },
    { event: "Rule Evaluation Started", timestamp: new Date(base + 1500).toISOString() },
  ];

  const alerts: FraudAlert[] = [];
  if (triggered.length > 0) {
    const severity: Severity = highestSeverity(triggered);
    tx.status = "Suspicious";
    const alertId = ++db.sequences.alert;
    const primary = triggered[0]!;
    const alert: FraudAlert = {
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
      status: "New",
      detected_at: new Date(base + 2000).toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      resolution_note: null,
    };
    db.alerts.unshift(alert);
    alerts.push(alert);
    timeline.push(
      {
        event: "Suspicious Pattern Detected",
        timestamp: new Date(base + 1800).toISOString(),
        detail: triggered.map((r) => r.rule_name).join(", "),
      },
      {
        event: "Fraud Alert Generated",
        timestamp: new Date(base + 2000).toISOString(),
        detail: `${alert.alert_reference} · ${severity} severity`,
      },
    );
    audit("Fraud alert generated", "FraudAlert", alertId, alert.reason, actor);
  } else {
    timeline.push({
      event: "Rule Evaluation Completed",
      timestamp: new Date(base + 1800).toISOString(),
      detail: "No rule triggered",
    });
  }

  db.transactions.unshift(tx);
  db.transactions.sort((a, b) => +new Date(b.transaction_time) - +new Date(a.transaction_time));
  db.timelines[tx.id] = timeline;
  audit(
    "Transaction submitted",
    "Transaction",
    tx.id,
    `${tx.transaction_reference} · ₦${tx.amount.toLocaleString()} · ${tx.user_name} · ${tx.department_name}`,
    actor,
  );
  persist();

  return {
    transaction: tx,
    alert_generated: alerts.length > 0,
    alerts,
    triggered_rules: triggered.map((r) => r.rule_name),
    timeline,
  };
}

export async function mockHandler<T>(path: string, ctx: Ctx): Promise<T> {
  await delay();
  const db = getDb();
  const { method, body, query } = ctx;

  // ---- Authentication ----
  if (path === "/api/v1/auth/login" && method === "POST") {
    const input = body as { email: string; password: string };
    const found = db.users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase() && u.password === input.password,
    );
    if (!found) throw new ApiError(401, "Incorrect email or password.");
    if (found.status !== "active") throw new ApiError(403, "This account has been deactivated.");
    audit("User logged in", "User", found.id, `${found.full_name} signed in.`, found);
    persist();
    return { token: `demo-token-${found.id}`, user: publicUser(found) } as T;
  }

  if (path === "/api/v1/auth/logout" && method === "POST") return undefined as T;
  if (path === "/api/v1/auth/me") return publicUser(requireAuth(ctx)) as T;

  const actor = requireAuth(ctx);

  // ---- Departments ----
  if (path === "/api/v1/departments" && method === "GET") {
    const items = db.departments.map((d) => ({
      ...d,
      card_count: db.cards.filter((c) => c.department_id === d.id).length,
      user_count: db.users.filter((u) => u.department_id === d.id).length,
    }));
    return items as T;
  }

  if (path === "/api/v1/departments" && method === "POST") {
    requireAdmin(actor);
    const input = body as { department_code: string; name: string; description: string };
    if (!input.name || !input.department_code)
      throw new ApiError(422, "A department code and name are required.");
    if (db.departments.some((d) => d.department_code.toLowerCase() === input.department_code.toLowerCase()))
      throw new ApiError(409, "A department with that code already exists.");
    const now = new Date().toISOString();
    const dept: Department = {
      id: ++db.sequences.department,
      department_code: input.department_code.toUpperCase(),
      name: input.name,
      description: input.description ?? "",
      status: "active",
      card_count: 0,
      user_count: 0,
      created_at: now,
      updated_at: now,
    };
    db.departments.push(dept);
    audit("Department created", "Department", dept.id, `${dept.department_code} — ${dept.name}`, actor);
    persist();
    return dept as T;
  }

  const deptMatch = path.match(/^\/api\/v1\/departments\/(\d+)$/);
  if (deptMatch) {
    const dept = db.departments.find((d) => d.id === Number(deptMatch[1]));
    if (!dept) throw new ApiError(404, "The requested record could not be found.");
    if (method === "PUT") {
      requireAdmin(actor);
      const input = body as Partial<Department>;
      Object.assign(dept, input, { updated_at: new Date().toISOString() });
      audit("Department updated", "Department", dept.id, dept.name, actor);
      persist();
    }
    return dept as T;
  }

  // ---- Cards ----
  if (path === "/api/v1/cards" && method === "GET") {
    const department = q(query, "department_id");
    const status = q(query, "status");
    const search = q(query, "search")?.toLowerCase();
    let items = db.cards;
    if (actor.role === "CARD_USER") items = items.filter((c) => c.assigned_user_id === actor.id);
    items = items.filter((c) => {
      if (department && c.department_id !== Number(department)) return false;
      if (status && c.status !== status) return false;
      if (search && !`${c.masked_card_number} ${c.card_reference} ${c.assigned_user_name ?? ""}`.toLowerCase().includes(search))
        return false;
      return true;
    });
    return items as T;
  }

  if (path === "/api/v1/cards" && method === "POST") {
    requireAdmin(actor);
    const input = body as {
      last_four: string;
      department_id: number;
      assigned_user_id: number | null;
      card_type: string;
      issue_date: string;
      expiry_date: string;
    };
    const dept = db.departments.find((d) => d.id === Number(input.department_id));
    if (!dept) throw new ApiError(422, "Select a valid department.");
    if (!/^\d{4}$/.test(input.last_four ?? ""))
      throw new ApiError(422, "Enter the last four digits of the card.");
    const holder = db.users.find((u) => u.id === Number(input.assigned_user_id)) ?? null;
    const now = new Date().toISOString();
    const card: Card = {
      id: ++db.sequences.card,
      card_reference: `CARD-${1000 + db.sequences.card}`,
      masked_card_number: `**** **** **** ${input.last_four}`,
      department_id: dept.id,
      department_name: dept.name,
      assigned_user_id: holder?.id ?? null,
      assigned_user_name: holder?.full_name ?? null,
      card_type: input.card_type || "Corporate Purchase",
      issue_date: input.issue_date,
      expiry_date: input.expiry_date,
      status: "active",
      created_at: now,
      updated_at: now,
    };
    db.cards.push(card);
    audit("Card created", "Card", card.id, `${card.masked_card_number} → ${dept.name}`, actor);
    persist();
    return card as T;
  }

  const cardMatch = path.match(/^\/api\/v1\/cards\/(\d+)$/);
  if (cardMatch) {
    const card = db.cards.find((c) => c.id === Number(cardMatch[1]));
    if (!card) throw new ApiError(404, "The requested record could not be found.");
    if (method === "PUT") {
      requireAdmin(actor);
      const input = body as { assigned_user_id?: number | null; status?: Card["status"]; card_type?: string };
      if (input.assigned_user_id !== undefined) {
        const holder = db.users.find((u) => u.id === Number(input.assigned_user_id)) ?? null;
        card.assigned_user_id = holder?.id ?? null;
        card.assigned_user_name = holder?.full_name ?? null;
        audit("Card assigned", "Card", card.id, `${card.masked_card_number} → ${holder?.full_name ?? "unassigned"}`, actor);
      }
      if (input.status) {
        card.status = input.status;
        audit(input.status === "active" ? "Card activated" : "Card deactivated", "Card", card.id, card.masked_card_number, actor);
      }
      if (input.card_type) card.card_type = input.card_type;
      card.updated_at = new Date().toISOString();
      persist();
    }
    return card as T;
  }

  // ---- Users ----
  if (path === "/api/v1/users" && method === "GET") {
    requireAdmin(actor);
    const department = q(query, "department_id");
    const search = q(query, "search")?.toLowerCase();
    const items = db.users
      .filter((u) => {
        if (department && u.department_id !== Number(department)) return false;
        if (search && !`${u.full_name} ${u.email} ${u.employee_id}`.toLowerCase().includes(search)) return false;
        return true;
      })
      .map(publicUser);
    return items as T;
  }

  if (path === "/api/v1/users" && method === "POST") {
    requireAdmin(actor);
    const input = body as {
      full_name: string;
      email: string;
      employee_id: string;
      department_id: number;
      role: User["role"];
      password?: string;
    };
    if (!input.full_name || !input.email || !input.employee_id)
      throw new ApiError(422, "Name, email and employee identifier are required.");
    if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase()))
      throw new ApiError(409, "An account with that email already exists.");
    const dept = db.departments.find((d) => d.id === Number(input.department_id)) ?? null;
    const now = new Date().toISOString();
    const user: StoredUser = {
      id: ++db.sequences.user,
      employee_id: input.employee_id,
      full_name: input.full_name,
      email: input.email,
      password: input.password || "vantage123",
      department_id: dept?.id ?? null,
      department_name: dept?.name ?? null,
      role: input.role ?? "CARD_USER",
      status: "active",
      created_at: now,
      updated_at: now,
    };
    db.users.push(user);
    audit("User created", "User", user.id, `${user.full_name} · ${user.role}`, actor);
    persist();
    return publicUser(user) as T;
  }

  const userMatch = path.match(/^\/api\/v1\/users\/(\d+)$/);
  if (userMatch) {
    const target = db.users.find((u) => u.id === Number(userMatch[1]));
    if (!target) throw new ApiError(404, "The requested record could not be found.");
    if (actor.role === "CARD_USER" && target.id !== actor.id)
      throw new ApiError(403, "You do not have permission to view this record.");
    if (method === "PUT") {
      requireAdmin(actor);
      const input = body as Partial<User>;
      if (input.department_id !== undefined) {
        const dept = db.departments.find((d) => d.id === Number(input.department_id)) ?? null;
        target.department_id = dept?.id ?? null;
        target.department_name = dept?.name ?? null;
      }
      if (input.full_name) target.full_name = input.full_name;
      if (input.role) target.role = input.role;
      if (input.status) target.status = input.status;
      target.updated_at = new Date().toISOString();
      audit("User updated", "User", target.id, target.full_name, actor);
      persist();
    }
    const txs = db.transactions.filter((t) => t.user_id === target.id);
    const profile: UserProfile = {
      ...publicUser(target),
      assigned_cards: db.cards.filter((c) => c.assigned_user_id === target.id),
      transaction_count: txs.length,
      total_spending: txs.reduce((s, t) => s + t.amount, 0),
      suspicious_transactions: txs.filter((t) => t.status !== "Normal").length,
      alert_count: db.alerts.filter((a) => a.user_id === target.id).length,
    };
    return profile as T;
  }

  // ---- Transactions ----
  if (path === "/api/v1/transactions" && method === "POST") {
    requireAdmin(actor);
    return recordTransaction(body as never, actor) as T;
  }

  if (path === "/api/v1/transactions" && method === "GET") {
    return paginate(filterTransactions(actor, query), query) as T;
  }

  if (path === "/api/v1/simulation/batch" && method === "POST") {
    requireAdmin(actor);
    const input = (body as { scenario?: string }) ?? {};
    const card = db.cards.find((c) => c.status === "active" && c.assigned_user_id) ?? db.cards[0]!;
    const holder = db.users.find((u) => u.id === card.assigned_user_id)!;
    const start = Date.now();
    const runs =
      input.scenario === "suspicious"
        ? [
            { amount: 45_000, location: "Abuja", offset: 0, merchant: "Tridax Office Supplies" },
            { amount: 850_000, location: "Lagos", offset: 2, merchant: "ABC Equipment Ltd." },
            { amount: 700_000, location: "Kano", offset: 4, merchant: "Grid Technologies" },
          ]
        : [
            { amount: 32_000, location: card.department_name === "ICT" ? "Lagos" : "Abuja", offset: 0, merchant: "Bluepoint Stationers" },
            { amount: 58_500, location: "Abuja", offset: 45, merchant: "Nexus Fuel Stations" },
          ];
    const results = runs.map((r) =>
      recordTransaction(
        {
          card_id: card.id,
          user_id: holder.id,
          amount: r.amount,
          merchant: r.merchant,
          location: r.location,
          transaction_type: "Purchase",
          transaction_time: new Date(start + r.offset * 60000).toISOString(),
          description: `Simulation batch — ${input.scenario ?? "normal"} scenario.`,
        },
        actor,
      ),
    );
    audit("Simulation batch recorded", "Transaction", null, `${results.length} simulated transactions.`, actor);
    persist();
    return results as T;
  }

  const txMatch = path.match(/^\/api\/v1\/transactions\/(\d+)$/);
  if (txMatch) {
    const tx = db.transactions.find((t) => t.id === Number(txMatch[1]));
    if (!tx) throw new ApiError(404, "The requested record could not be found.");
    if (actor.role === "CARD_USER" && tx.user_id !== actor.id)
      throw new ApiError(403, "You do not have permission to view this transaction.");
    const detail: TransactionDetail = {
      transaction: tx,
      card: db.cards.find((c) => c.id === tx.card_id) ?? null,
      user: db.users.find((u) => u.id === tx.user_id) ? publicUser(db.users.find((u) => u.id === tx.user_id)!) : null,
      department: db.departments.find((d) => d.id === tx.department_id) ?? null,
      alerts: db.alerts.filter((a) => a.transaction_id === tx.id),
      timeline: db.timelines[tx.id] ?? [],
    };
    return detail as T;
  }

  // ---- Alerts ----
  if (path === "/api/v1/alerts" && method === "GET") {
    const status = q(query, "status");
    const severity = q(query, "severity");
    const department = q(query, "department_id");
    const search = q(query, "search")?.toLowerCase();
    let items = db.alerts;
    if (actor.role === "CARD_USER") items = items.filter((a) => a.user_id === actor.id);
    items = items.filter((a) => {
      if (status && a.status !== status) return false;
      if (severity && a.severity !== severity) return false;
      if (department && a.department_id !== Number(department)) return false;
      if (search && !`${a.alert_reference} ${a.transaction_reference} ${a.user_name} ${a.masked_card_number}`.toLowerCase().includes(search))
        return false;
      return true;
    });
    return paginate(items, query) as T;
  }

  const alertMatch = path.match(/^\/api\/v1\/alerts\/(\d+)$/);
  if (alertMatch) {
    const alert = db.alerts.find((a) => a.id === Number(alertMatch[1]));
    if (!alert) throw new ApiError(404, "The requested record could not be found.");
    if (method === "PATCH" || method === "PUT") {
      requireAdmin(actor);
      const input = body as { status: AlertStatus; resolution_note?: string };
      alert.status = input.status;
      alert.reviewed_at = input.status === "New" ? null : new Date().toISOString();
      alert.reviewed_by = input.status === "New" ? null : actor.full_name;
      if (input.resolution_note !== undefined) alert.resolution_note = input.resolution_note || null;
      const tx = db.transactions.find((t) => t.id === alert.transaction_id);
      if (tx) {
        tx.status =
          input.status === "Resolved"
            ? "Resolved"
            : input.status === "False Positive"
              ? "Reviewed"
              : input.status === "Confirmed"
                ? "Blocked"
                : input.status === "Under Review"
                  ? "Flagged"
                  : "Suspicious";
        tx.updated_at = new Date().toISOString();
        const line = db.timelines[tx.id] ?? [];
        line.push({
          event: input.status === "Resolved" ? "Alert Resolved" : `Alert marked ${input.status}`,
          timestamp: new Date().toISOString(),
          detail: actor.full_name,
        });
        db.timelines[tx.id] = line;
      }
      audit(`Alert marked ${input.status}`, "FraudAlert", alert.id, alert.alert_reference, actor);
      persist();
    }
    return alert as T;
  }

  // ---- Rules ----
  if (path === "/api/v1/rules") {
    return rulesWithCounts() as T;
  }
  if (path === "/api/v1/rules/definitions") return RULE_DEFINITIONS as T;
  const ruleMatch = path.match(/^\/api\/v1\/rules\/([A-Z_]+)$/);
  if (ruleMatch && method === "PUT") {
    requireAdmin(actor);
    const def = RULE_DEFINITIONS.find((r) => r.rule_code === ruleMatch[1]);
    if (!def) throw new ApiError(404, "The requested record could not be found.");
    const input = body as { threshold?: number };
    if (input.threshold === undefined || !(Number(input.threshold) > 0))
      throw new ApiError(422, "Threshold must be a positive number.");
    def.threshold = Number(input.threshold);
    def.threshold_label = def.threshold_label.replace(/[₦\d,.]+/, def.rule_code === "HIGH_AMOUNT" ? `₦${def.threshold.toLocaleString()}` : String(def.threshold));
    try {
      const saved = JSON.parse(localStorage.getItem("vantage_rule_overrides") ?? "{}");
      saved[def.rule_code] = def.threshold;
      localStorage.setItem("vantage_rule_overrides", JSON.stringify(saved));
    } catch { /* ignore */ }
    audit(`Rule threshold changed to ${def.threshold}`, "FraudRule", null, def.rule_code, actor);
    persist();
    return rulesWithCounts().find((r) => r.rule_code === def.rule_code) as T;
  }

  // ---- Analysis ----
  if (path === "/api/v1/analysis/summary") {
    const items = filterTransactions(actor, query);
    const suspicious = items.filter((t) => t.status !== "Normal").length;
    const alerts = actor.role === "CARD_USER" ? db.alerts.filter((a) => a.user_id === actor.id) : db.alerts;
    const summary: DashboardSummary = {
      total_transactions: items.length,
      normal_transactions: items.length - suspicious,
      suspicious_transactions: suspicious,
      total_amount: items.reduce((s, t) => s + t.amount, 0),
      active_cards: db.cards.filter((c) => c.status === "active").length,
      active_users: db.users.filter((u) => u.status === "active").length,
      departments: db.departments.length,
      active_alerts: alerts.filter((a) => a.status === "New" || a.status === "Under Review").length,
      total_alerts: alerts.length,
    };
    return summary as T;
  }

  if (path === "/api/v1/analysis/trends") {
    const days = Number(q(query, "days") ?? 14);
    const scoped = scopeTransactions(actor, db.transactions);
    const points: TrendPoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day.getTime() + 86400000);
      const items = scoped.filter((t) => {
        const d = new Date(t.transaction_time);
        return d >= day && d < next;
      });
      points.push({
        date: day.toISOString(),
        count: items.length,
        suspicious: items.filter((t) => t.status !== "Normal").length,
        value: items.reduce((s, t) => s + t.amount, 0),
      });
    }
    return points as T;
  }

  if (path === "/api/v1/analysis/breakdown") {
    const items = filterTransactions(actor, query);
    const ruleCounts = new Map<string, number>();
    for (const a of db.alerts) for (const r of a.triggered_rules) ruleCounts.set(r, (ruleCounts.get(r) ?? 0) + 1);
    const statuses: AlertStatus[] = ["New", "Under Review", "Confirmed", "False Positive", "Resolved"];
    const breakdown: AnalysisBreakdown = {
      by_department: group(items, (t) => t.department_name),
      by_user: group(items, (t) => t.user_name),
      by_card: group(items, (t) => t.masked_card_number),
      by_type: group(items, (t) => t.transaction_type),
      by_location: group(items, (t) => t.location),
      by_rule: [...ruleCounts.entries()]
        .map(([rule_name, count]) => ({
          rule_name,
          severity: (RULE_DEFINITIONS.find((r) => r.rule_name === rule_name)?.severity ?? "High") as Severity,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      by_alert_status: statuses.map((s) => ({
        alert_status: s,
        count: db.alerts.filter((a) => a.status === s).length,
      })),
      suspicious_rate: items.length ? items.filter((t) => t.status !== "Normal").length / items.length : 0,
    };
    return breakdown as T;
  }

  // ---- Audit log ----
  if (path === "/api/v1/audit-logs") {
    requireAdmin(actor);
    return db.auditLogs.slice(0, Number(q(query, "limit") ?? 40)) as T;
  }

  // ---- Reports ----
  if (path === "/api/v1/reports/generate" && method === "POST") {
    requireAdmin(actor);
    const input = body as { report_type: string; start_date: string; end_date: string };
    const items = db.transactions.filter((t) => {
      const d = new Date(t.transaction_time);
      return d >= new Date(input.start_date) && d <= new Date(`${input.end_date}T23:59:59`);
    });
    const suspicious = items.filter((t) => t.status !== "Normal");
    const relatedAlerts = db.alerts.filter((a) => items.some((t) => t.id === a.transaction_id));
    const severities: Severity[] = ["High", "Medium", "Low"];
    const report: Report = {
      id: ++db.sequences.report,
      report_reference: `RPT-${1000 + db.sequences.report}`,
      report_type: input.report_type,
      start_date: input.start_date,
      end_date: input.end_date,
      generated_by: actor.full_name,
      created_at: new Date().toISOString(),
      report_data: {
        total_transactions: items.length,
        total_value: items.reduce((s, t) => s + t.amount, 0),
        normal_transactions: items.length - suspicious.length,
        suspicious_transactions: suspicious.length,
        alert_count: relatedAlerts.length,
        by_department: group(items, (t) => t.department_name),
        by_user: group(items, (t) => t.user_name),
        by_card: group(items, (t) => t.masked_card_number),
        by_type: group(items, (t) => t.transaction_type),
        by_location: group(items, (t) => t.location),
        alerts_by_severity: severities.map((s) => ({
          severity: s,
          count: relatedAlerts.filter((a) => a.severity === s).length,
        })),
      },
    };
    db.reports.unshift(report);
    audit("Report generated", "Report", report.id, `${report.report_reference} · ${report.report_type}`, actor);
    persist();
    return report as T;
  }

  if (path === "/api/v1/reports" && method === "GET") return db.reports as T;

  const reportMatch = path.match(/^\/api\/v1\/reports\/(\d+)$/);
  if (reportMatch) {
    const report = db.reports.find((r) => r.id === Number(reportMatch[1]));
    if (!report) throw new ApiError(404, "The requested record could not be found.");
    return report as T;
  }

  throw new ApiError(404, "The requested record could not be found.");
}

export type { AuditLog };
