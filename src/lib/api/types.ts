export type Role = "admin" | "analyst" | "user";

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
}

export type FraudStatus = "normal" | "suspicious";
export type TransactionStatus = "processed" | "pending" | "rejected";
export type AlertStatus = "New" | "Under Review" | "Reviewed" | "Resolved";

export interface Transaction {
  id: number;
  transaction_reference: string;
  user_id: number;
  card_reference: string;
  amount: number;
  transaction_type: string;
  location: string;
  transaction_date: string;
  status: TransactionStatus;
  fraud_status: FraudStatus;
  created_at: string;
}

export interface FraudAlert {
  id: number;
  transaction_id: number;
  transaction_reference: string;
  amount: number;
  location: string;
  transaction_date: string;
  rule_name: string;
  triggered_rules: string[];
  reason: string;
  alert_status: AlertStatus;
  created_at: string;
  reviewed_at: string | null;
}

export interface Report {
  id: number;
  report_type: string;
  start_date: string;
  end_date: string;
  generated_by: number;
  report_data: {
    total_transactions: number;
    total_value: number;
    normal_transactions: number;
    suspicious_transactions: number;
    alert_count: number;
    by_type: Array<{ label: string; count: number; value: number }>;
    by_location: Array<{ label: string; count: number; value: number }>;
  };
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransactionResult {
  transaction_id: number;
  transaction_reference: string;
  status: TransactionStatus;
  fraud_status: FraudStatus;
  alert_generated: boolean;
  alert_id: number | null;
  triggered_rules: string[];
}

export interface AnalysisSummary {
  total_transactions: number;
  normal_transactions: number;
  suspicious_transactions: number;
  alert_count: number;
  new_alerts: number;
  total_value: number;
  average_value: number;
}

export interface TrendPoint {
  date: string;
  count: number;
  suspicious: number;
  value: number;
}

export interface GroupBucket {
  label: string;
  count: number;
  value: number;
  suspicious: number;
}

export interface FraudStats {
  by_rule: Array<{ rule_name: string; count: number }>;
  by_alert_status: Array<{ alert_status: AlertStatus; count: number }>;
  suspicious_rate: number;
}
