/**
 * Domain model for the corporate card transaction monitoring and
 * accountability system. Mirrors the Python/FastAPI + MySQL schema so the
 * React client can switch to the real backend without type changes.
 *
 * Accountability chain: Department → Card → User → Transaction → Alert.
 */

export type Role = "ADMIN" | "FRAUD_ANALYST" | "CARD_USER";
export type RecordStatus = "active" | "inactive";

export type TransactionStatus =
  | "Normal"
  | "Suspicious"
  | "Flagged"
  | "Reviewed"
  | "Resolved"
  | "Blocked";

export type AlertStatus =
  | "New"
  | "Under Review"
  | "Confirmed"
  | "False Positive"
  | "Resolved";

export type Severity = "Low" | "Medium" | "High";

export type RuleCode =
  | "HIGH_AMOUNT"
  | "RAPID_TRANSACTIONS"
  | "UNUSUAL_LOCATION"
  | "UNUSUAL_SPENDING";

export interface Department {
  id: number;
  department_code: string;
  name: string;
  description: string;
  status: RecordStatus;
  card_count: number;
  user_count: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  employee_id: string;
  full_name: string;
  email: string;
  department_id: number | null;
  department_name: string | null;
  role: Role;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  assigned_cards: Card[];
  transaction_count: number;
  total_spending: number;
  suspicious_transactions: number;
  alert_count: number;
}

export interface Card {
  id: number;
  card_reference: string;
  masked_card_number: string;
  department_id: number;
  department_name: string;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  card_type: string;
  issue_date: string;
  expiry_date: string;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  transaction_reference: string;
  card_id: number;
  card_reference: string;
  masked_card_number: string;
  user_id: number;
  user_name: string;
  department_id: number;
  department_name: string;
  amount: number;
  currency: string;
  merchant: string;
  location: string;
  transaction_type: string;
  transaction_time: string;
  description: string;
  status: TransactionStatus;
  authorised: boolean;
  created_at: string;
  updated_at: string;
}

export interface FraudRule {
  id: number;
  rule_code: RuleCode;
  rule_name: string;
  description: string;
  threshold: number;
  threshold_label: string;
  severity: Severity;
  status: RecordStatus;
  alert_count: number;
}

export interface FraudAlert {
  id: number;
  alert_reference: string;
  transaction_id: number;
  transaction_reference: string;
  rule_id: number;
  rule_code: RuleCode;
  rule_name: string;
  triggered_rules: string[];
  card_id: number;
  masked_card_number: string;
  user_id: number;
  user_name: string;
  department_id: number;
  department_name: string;
  amount: number;
  location: string;
  reason: string;
  severity: Severity;
  status: AlertStatus;
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolution_note: string | null;
}

export interface TimelineEvent {
  event: string;
  timestamp: string;
  detail?: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  timestamp: string;
  details: string;
}

export interface TransactionDetail {
  transaction: Transaction;
  card: Card | null;
  user: User | null;
  department: Department | null;
  alerts: FraudAlert[];
  timeline: TimelineEvent[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface TransactionResult {
  transaction: Transaction;
  alert_generated: boolean;
  alerts: FraudAlert[];
  triggered_rules: string[];
  timeline: TimelineEvent[];
}

export interface DashboardSummary {
  total_transactions: number;
  normal_transactions: number;
  suspicious_transactions: number;
  total_amount: number;
  active_cards: number;
  active_users: number;
  departments: number;
  active_alerts: number;
  total_alerts: number;
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

export interface AnalysisBreakdown {
  by_department: GroupBucket[];
  by_user: GroupBucket[];
  by_card: GroupBucket[];
  by_type: GroupBucket[];
  by_location: GroupBucket[];
  by_rule: Array<{ rule_name: string; severity: Severity; count: number }>;
  by_alert_status: Array<{ alert_status: AlertStatus; count: number }>;
  suspicious_rate: number;
}

export interface Report {
  id: number;
  report_reference: string;
  report_type: string;
  start_date: string;
  end_date: string;
  generated_by: string;
  created_at: string;
  report_data: {
    total_transactions: number;
    total_value: number;
    normal_transactions: number;
    suspicious_transactions: number;
    alert_count: number;
    by_department: GroupBucket[];
    by_user: GroupBucket[];
    by_card: GroupBucket[];
    by_type: GroupBucket[];
    by_location: GroupBucket[];
    alerts_by_severity: Array<{ severity: Severity; count: number }>;
  };
}
