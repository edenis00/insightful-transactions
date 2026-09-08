import { apiRequest } from "./client";
import type {
  AnalysisSummary,
  AlertStatus,
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

export interface AuthPayload {
  token: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthPayload>("/api/auth/login", { method: "POST", body: { email, password } }),
  register: (full_name: string, email: string, password: string) =>
    apiRequest<AuthPayload>("/api/auth/register", {
      method: "POST",
      body: { full_name, email, password },
    }),
  logout: () => apiRequest<void>("/api/auth/logout", { method: "POST" }),
  me: () => apiRequest<User>("/api/auth/me"),
};

export interface TransactionQuery {
  reference?: string;
  transaction_type?: string;
  location?: string;
  status?: string;
  fraud_status?: string;
  min_amount?: string;
  max_amount?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface NewTransaction {
  transaction_reference: string;
  card_reference: string;
  amount: number;
  transaction_type: string;
  location: string;
  transaction_date: string;
}

export const transactionsApi = {
  create: (payload: NewTransaction) =>
    apiRequest<TransactionResult>("/api/transactions", { method: "POST", body: payload }),
  list: (query: TransactionQuery = {}) =>
    apiRequest<Paginated<Transaction>>("/api/transactions", { query: query as never }),
  search: (query: TransactionQuery = {}) =>
    apiRequest<Paginated<Transaction>>("/api/transactions/search", { query: query as never }),
  get: (id: number) => apiRequest<Transaction>(`/api/transactions/${id}`),
};

export const alertsApi = {
  list: (query: { alert_status?: string; search?: string; page?: number; page_size?: number } = {}) =>
    apiRequest<Paginated<FraudAlert>>("/api/alerts", { query: query as never }),
  get: (id: number) => apiRequest<FraudAlert>(`/api/alerts/${id}`),
  updateStatus: (id: number, alert_status: AlertStatus) =>
    apiRequest<FraudAlert>(`/api/alerts/${id}`, { method: "PUT", body: { alert_status } }),
};

export const analysisApi = {
  summary: (query: TransactionQuery = {}) =>
    apiRequest<AnalysisSummary>("/api/analysis/summary", { query: query as never }),
  trends: (days = 14) => apiRequest<TrendPoint[]>("/api/analysis/trends", { query: { days } }),
  byType: (query: TransactionQuery = {}) =>
    apiRequest<GroupBucket[]>("/api/analysis/by-type", { query: query as never }),
  byLocation: (query: TransactionQuery = {}) =>
    apiRequest<GroupBucket[]>("/api/analysis/by-location", { query: query as never }),
  fraud: () => apiRequest<FraudStats>("/api/analysis/fraud"),
  rules: () =>
    apiRequest<{ amountThreshold: number; frequencyLimit: number; frequencyWindowMinutes: number }>(
      "/api/analysis/rules",
    ),
};

export const reportsApi = {
  generate: (payload: { report_type: string; start_date: string; end_date: string }) =>
    apiRequest<Report>("/api/reports/generate", { method: "POST", body: payload }),
  list: () => apiRequest<Report[]>("/api/reports"),
  get: (id: number) => apiRequest<Report>(`/api/reports/${id}`),
};
