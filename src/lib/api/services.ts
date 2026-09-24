import { apiRequest } from "./client";
import type { RuleDefinition } from "./rules";
import type {
  AlertStatus,
  AnalysisBreakdown,
  AuditLog,
  Card,
  DashboardSummary,
  Department,
  FraudAlert,
  FraudRule,
  Paginated,
  Report,
  Role,
  Transaction,
  TransactionDetail,
  TransactionResult,
  TrendPoint,
  User,
  UserProfile,
} from "./types";

export interface AuthPayload {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthPayload>("/api/v1/auth/login", { method: "POST", body: { email, password } }),
  logout: () => apiRequest<void>("/api/v1/auth/logout", { method: "POST" }),
  me: () => apiRequest<User>("/api/v1/auth/me"),
};

export const departmentsApi = {
  list: () => apiRequest<Department[]>("/api/v1/departments"),
  get: (id: number) => apiRequest<Department>(`/api/v1/departments/${id}`),
  create: (payload: { department_code: string; name: string; description: string }) =>
    apiRequest<Department>("/api/v1/departments", { method: "POST", body: payload }),
  update: (id: number, payload: Partial<Department>) =>
    apiRequest<Department>(`/api/v1/departments/${id}`, { method: "PUT", body: payload }),
};

export const cardsApi = {
  list: (query: { department_id?: number; status?: string; search?: string } = {}) =>
    apiRequest<Card[]>("/api/v1/cards", { query: query as never }),
  create: (payload: {
    last_four: string;
    department_id: number;
    assigned_user_id: number | null;
    card_type: string;
    issue_date: string;
    expiry_date: string;
  }) => apiRequest<Card>("/api/v1/cards", { method: "POST", body: payload }),
  update: (
    id: number,
    payload: { assigned_user_id?: number | null; status?: "active" | "inactive"; card_type?: string },
  ) => apiRequest<Card>(`/api/v1/cards/${id}`, { method: "PUT", body: payload }),
};

export const usersApi = {
  list: (query: { department_id?: number; search?: string } = {}) =>
    apiRequest<User[]>("/api/v1/users", { query: query as never }),
  get: (id: number) => apiRequest<UserProfile>(`/api/v1/users/${id}`),
  create: (payload: {
    full_name: string;
    email: string;
    employee_id: string;
    department_id: number;
    role: Role;
  }) => apiRequest<User>("/api/v1/users", { method: "POST", body: payload }),
  update: (id: number, payload: Partial<User>) =>
    apiRequest<UserProfile>(`/api/v1/users/${id}`, { method: "PUT", body: payload }),
};

export interface TransactionQuery {
  search?: string;
  department_id?: number | string;
  card_id?: number | string;
  user_id?: number | string;
  transaction_type?: string;
  location?: string;
  status?: string;
  min_amount?: string;
  max_amount?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface NewTransaction {
  card_id: number;
  user_id: number;
  amount: number;
  merchant: string;
  location: string;
  transaction_type: string;
  transaction_time: string;
  description: string;
}

export const transactionsApi = {
  create: (payload: NewTransaction) =>
    apiRequest<TransactionResult>("/api/v1/transactions", { method: "POST", body: payload }),
  list: (query: TransactionQuery = {}) =>
    apiRequest<Paginated<Transaction>>("/api/v1/transactions", { query: query as never }),
  get: (id: number) => apiRequest<TransactionDetail>(`/api/v1/transactions/${id}`),
  simulateBatch: (scenario: "normal" | "suspicious") =>
    apiRequest<TransactionResult[]>("/api/v1/simulation/batch", {
      method: "POST",
      body: { scenario },
    }),
};

export const alertsApi = {
  list: (
    query: {
      status?: string;
      severity?: string;
      department_id?: number | string;
      search?: string;
      page?: number;
      page_size?: number;
    } = {},
  ) => apiRequest<Paginated<FraudAlert>>("/api/v1/alerts", { query: query as never }),
  get: (id: number) => apiRequest<FraudAlert>(`/api/v1/alerts/${id}`),
  updateStatus: (id: number, status: AlertStatus, resolution_note?: string) =>
    apiRequest<FraudAlert>(`/api/v1/alerts/${id}`, {
      method: "PATCH",
      body: { status, resolution_note },
    }),
};

export const rulesApi = {
  list: () => apiRequest<FraudRule[]>("/api/v1/rules"),
  definitions: () => apiRequest<RuleDefinition[]>("/api/v1/rules/definitions"),
};

export const analysisApi = {
  summary: (query: TransactionQuery = {}) =>
    apiRequest<DashboardSummary>("/api/v1/analysis/summary", { query: query as never }),
  trends: (days = 14) => apiRequest<TrendPoint[]>("/api/v1/analysis/trends", { query: { days } }),
  breakdown: (query: TransactionQuery = {}) =>
    apiRequest<AnalysisBreakdown>("/api/v1/analysis/breakdown", { query: query as never }),
};

export const auditApi = {
  list: (limit = 40) => apiRequest<AuditLog[]>("/api/v1/audit-logs", { query: { limit } }),
};

export const reportsApi = {
  generate: (payload: { report_type: string; start_date: string; end_date: string }) =>
    apiRequest<Report>("/api/v1/reports/generate", { method: "POST", body: payload }),
  list: () => apiRequest<Report[]>("/api/v1/reports"),
  get: (id: number) => apiRequest<Report>(`/api/v1/reports/${id}`),
};
