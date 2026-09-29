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

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ApiUser {
  id: number;
  full_name: string;
  email: string;
  role: "admin" | "analyst" | "user";
  created_at: string;
}

function mapUser(user: ApiUser): User {
  return {
    id: user.id,
    employee_id: `USR-${String(user.id).padStart(4, "0")}`,
    full_name: user.full_name,
    email: user.email,
    department_id: null,
    department_name: null,
    role:
      user.role === "admin"
        ? "ADMIN"
        : user.role === "user"
          ? "CARD_USER"
          : "FRAUD_ANALYST",
    status: "active",
    created_at: user.created_at,
    updated_at: user.created_at,
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  register: async (full_name: string, email: string, password: string) =>
    mapUser(
      await apiRequest<ApiUser>("/api/auth/register", {
        method: "POST",
        body: { full_name, email, password },
      }),
    ),

  logout: () => apiRequest<void>("/api/auth/logout", { method: "POST" }),

  me: async () => mapUser(await apiRequest<ApiUser>("/api/auth/me")),
};

export const departmentsApi = {
  list: () => apiRequest<Department[]>("/api/departments"),
  get: (id: number) => apiRequest<Department>(`/api/departments/${id}`),
  create: (payload: { department_code: string; name: string; description: string }) =>
    apiRequest<Department>("/api/departments", { method: "POST", body: payload }),
  update: (id: number, payload: Partial<Department>) =>
    apiRequest<Department>(`/api/departments/${id}`, { method: "PUT", body: payload }),
};

export const cardsApi = {
  list: (query: { department_id?: number; status?: string; search?: string } = {}) =>
    apiRequest<Card[]>("/api/cards", { query: query as never }),
  create: (payload: {
    last_four: string;
    department_id: number;
    assigned_user_id: number | null;
    card_type: string;
    issue_date: string;
    expiry_date: string;
  }) => apiRequest<Card>("/api/cards", { method: "POST", body: payload }),
  update: (
    id: number,
    payload: { assigned_user_id?: number | null; status?: "active" | "inactive"; card_type?: string },
  ) => apiRequest<Card>(`/api/cards/${id}`, { method: "PUT", body: payload }),
};

export const usersApi = {
  list: (query: { department_id?: number; search?: string } = {}) =>
    apiRequest<User[]>("/api/users", { query: query as never }),
  get: (id: number) => apiRequest<UserProfile>(`/api/users/${id}`),
  create: (payload: {
    full_name: string;
    email: string;
    employee_id: string;
    department_id: number;
    role: Role;
  }) => apiRequest<User>("/api/users", { method: "POST", body: payload }),
  update: (id: number, payload: Partial<User>) =>
    apiRequest<UserProfile>(`/api/users/${id}`, { method: "PUT", body: payload }),
};

export interface TransactionQuery {
  transaction_reference?: string;
  transaction_type?: string;
  location?: string;
  fraud_status?: "normal" | "suspicious";
  min_amount?: number;
  max_amount?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export const transactionsApi = {
  create: (payload: {
    transaction_reference: string;
    card_reference: string;
    amount: number;
    transaction_type: string;
    location: string;
    transaction_date: string;
  }) =>
    apiRequest<{
      transaction: {
        id: number;
        transaction_reference: string;
        card_reference: string;
        amount: number;
        transaction_type: string;
        location: string;
        transaction_date: string;
        status: string;
        fraud_status: string;
      };
      alert_generated: boolean;
      alert_ids: number[];
      triggered_rules: string[];
    }>("/api/transactions", { method: "POST", body: payload }),
  list: (query: TransactionQuery = {}) =>
    apiRequest<{
      items: Array<{
        id: number;
        transaction_reference: string;
        card_reference: string;
        amount: number;
        transaction_type: string;
        location: string;
        transaction_date: string;
        status: string;
        fraud_status: "normal" | "suspicious";
        created_at: string;
      }>;
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>("/api/transactions", { query: query as never }),
  get: (id: number) =>
    apiRequest<{
      id: number;
      transaction_reference: string;
      card_reference: string;
      amount: number;
      transaction_type: string;
      location: string;
      transaction_date: string;
      status: string;
      fraud_status: "normal" | "suspicious";
      created_at: string;
    }>(`/api/transactions/${id}`),
  simulateBatch: (payload: { transactions: Array<Record<string, unknown>> }) =>
    apiRequest<TransactionResult[]>("/api/simulation/batch", {
      method: "POST",
      body: payload,
    }),
};


export type ApiAlertStatus = "new" | "under_review" | "reviewed" | "resolved";

export interface ApiAlert {
  id: number;
  rule_name: string;
  reason: string;
  alert_status: ApiAlertStatus;
  created_at: string;
  reviewed_at: string | null;
  transaction: {
    id: number;
    transaction_reference: string;
    amount: number;
    transaction_type: string;
    location: string;
    transaction_date: string;
    fraud_status: "normal" | "suspicious";
  };
}
export const alertsApi = {
  list: (
    query: {
      page?: number;
      page_size?: number;
      alert_status?: ApiAlertStatus;
      rule_name?: string;
      transaction_reference?: string;
    } = {},
  ) =>
    apiRequest<{
      items: ApiAlert[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>("/api/alerts", { query: query as never }),

  get: (id: number) => apiRequest<ApiAlert>(`/api/alerts/${id}`),

  update: (id: number, alert_status: ApiAlertStatus) =>
    apiRequest<ApiAlert>(`/api/alerts/${id}`, {
      method: "PUT",
      body: { alert_status },
    }),
};

export const fraudRulesApi = {
  list: () => apiRequest<FraudRule[]>("/api/rules"),
  definitions: () => apiRequest<RuleDefinition[]>("/api/rules/definitions"),
  updateThreshold: (code: string, threshold: number) =>
    apiRequest<FraudRule>(`/api/rules/${code}`, { method: "PUT", body: { threshold } }),
};

export const analysisApi = {
  summary: (query: { days?: number } = {}) =>
    apiRequest<DashboardSummary>("/api/analysis/summary", { query: query as never }),
  trends: (days = 14) => apiRequest<TrendPoint[]>("/api/analysis/trends", { query: { days } }),
  breakdown: (query: { type?: string; limit?: number } = {}) =>
    apiRequest<AnalysisBreakdown>("/api/analysis/breakdown", { query: query as never }),
  byType: () => apiRequest<{ label: string; value: number; count: number; suspicious: number }[]>("/api/analysis/by-type"),
  byLocation: () => apiRequest<{ label: string; value: number; count: number; suspicious: number }[]>("/api/analysis/by-location"),
  rules: () => apiRequest<Record<string, number>>("/api/analysis/rules"),
  fraud: () =>
    apiRequest<{
      suspicious_rate: number;
      suspicious_transactions: number;
      total_transactions: number;
      by_rule: Array<{ rule_name: string; count: number }>;
      by_alert_status: Array<{ alert_status: string; count: number }>;
    }>("/api/analysis/fraud"),
};

export const auditApi = {
  list: (limit = 40) => apiRequest<AuditLog[]>("/api/audit-logs", { query: { limit } }),
};

export interface ApiReport {
  id: number;
  report_type: string;
  start_date: string;
  end_date: string;
  generated_by: number;
  created_at: string;
  report_data: {
    period: {
      start_date: string;
      end_date: string;
    };
    summary: {
      total_transactions: number;
      normal_transactions: number;
      suspicious_transactions: number;
      fraud_alert_count: number;
      total_transaction_value: number;
    };
    daily_trends: Array<{
      date: string;
      transaction_count: number;
      total_value: number;
      suspicious_count: number;
    }>;
    distribution_by_type: Array<{
      category: string;
      transaction_count: number;
      total_value: number;
      suspicious_count: number;
    }>;
    distribution_by_location: Array<{
      category: string;
      transaction_count: number;
      total_value: number;
      suspicious_count: number;
    }>;
    alerts_by_rule: Array<{
      rule_name: string;
      count: number;
    }>;
  };
}

export interface ApiReportListItem {
  id: number;
  report_type: string;
  start_date: string;
  end_date: string;
  generated_by: number;
  created_at: string;
}

export const reportsApi = {
  generate: (payload: {
    report_type: string;
    start_date: string;
    end_date: string;
  }) =>
    apiRequest<ApiReport>("/api/reports/generate", {
      method: "POST",
      body: {
        ...payload,
        start_date: `${payload.start_date}T00:00:00Z`,
        end_date: `${payload.end_date}T23:59:59Z`,
      },
    }),

  list: () =>
    apiRequest<{
      items: ApiReportListItem[];
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
    }>("/api/reports?page=1&page_size=20"),

  get: (id: number) => apiRequest<ApiReport>(`/api/reports/${id}`),
};
