import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading, StatusPill } from "@/components/ui-states";
import { alertsApi, analysisApi, transactionsApi } from "@/lib/api/services";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTime,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Control Dashboard — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Live overview of transaction volume, suspicious activity and fraud alerts in the Vantage fraud console.",
      },
      { property: "og:title", content: "Control Dashboard — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Live overview of transaction volume, suspicious activity and fraud alerts.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const summary = useQuery({ queryKey: ["analysis", "summary", {}], queryFn: () => analysisApi.summary() });
  const trends = useQuery({ queryKey: ["analysis", "trends", 14], queryFn: () => analysisApi.trends(14) });
  const fraud = useQuery({ queryKey: ["analysis", "fraud"], queryFn: () => analysisApi.fraud() });
  const recent = useQuery({
    queryKey: ["transactions", { page_size: 6 }],
    queryFn: () => transactionsApi.list({ page: 1, page_size: 6 }),
  });
  const alerts = useQuery({
    queryKey: ["alerts", { page_size: 3 }],
    queryFn: () => alertsApi.list({ page: 1, page_size: 3 }),
  });

  const peak = trends.data ? Math.max(...trends.data.map((p) => p.count), 1) : 1;
  const s = summary.data;
  const normalShare = s && s.total_transactions ? (s.normal_transactions / s.total_transactions) * 100 : 0;
  const suspiciousShare =
    s && s.total_transactions ? (s.suspicious_transactions / s.total_transactions) * 100 : 0;

  return (
    <AppShell title="Control Dashboard" subtitle={`Fraud monitoring · ${formatDate(new Date().toISOString())}`}>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summary.isLoading || !s ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[92px] animate-pulse rounded-lg bg-surface ring-1 ring-inset ring-line" />
          ))
        ) : (
          <>
            <Kpi label="Total Transactions" value={formatNumber(s.total_transactions)} note="all recorded" />
            <Kpi
              label="Normal"
              value={formatNumber(s.normal_transactions)}
              note={`${normalShare.toFixed(1)}% of volume`}
              tone="clear"
            />
            <Kpi
              label="Suspicious"
              value={formatNumber(s.suspicious_transactions)}
              note={`${suspiciousShare.toFixed(1)}% of volume`}
              tone="alarm"
              highlight
            />
            <Kpi
              label="Active Alerts"
              value={formatNumber(s.alert_count)}
              note={`${s.new_alerts} need review`}
              noteTone="warn"
            />
            <Kpi label="Total Value" value={formatCompactCurrency(s.total_value)} note="aggregate" small />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Transaction Volume"
          subtitle="Last 14 days · count"
          action={<span className="text-[10px] text-faint">peak {peak}</span>}
        >
          <div className="p-4">
            {trends.isLoading ? (
              <PanelLoading label="Loading trend" />
            ) : trends.isError ? (
              <PanelError message="Trend data could not be loaded." onRetry={() => void trends.refetch()} />
            ) : (
              <>
                <div className="flex h-36 items-end gap-1.5">
                  {trends.data!.map((p, i) => {
                    const isPeak = p.count === peak;
                    return (
                      <div
                        key={p.date}
                        title={`${formatDate(p.date)} · ${p.count} txns · ${p.suspicious} suspicious`}
                        className={`bar-rise flex-1 rounded-sm ${
                          isPeak ? "bg-alarm/70" : "bg-panel ring-1 ring-inset ring-line/60"
                        }`}
                        style={{
                          height: `${Math.max(6, (p.count / peak) * 100)}%`,
                          animationDelay: `${i * 30}ms`,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between text-[9px] text-faint">
                  <span>{formatDate(trends.data![0]!.date)}</span>
                  <span>{formatDate(trends.data![trends.data!.length - 1]!.date)}</span>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-2" title="Fraud Split" subtitle="Normal vs suspicious">
          <div className="p-4">
            {!s || !fraud.data ? (
              <PanelLoading label="Loading split" />
            ) : (
              <>
                <div className="space-y-4">
                  <Meter label="Normal" value={formatNumber(s.normal_transactions)} pct={normalShare} tone="clear" />
                  <Meter
                    label="Suspicious"
                    value={formatNumber(s.suspicious_transactions)}
                    pct={Math.max(suspiciousShare, 2)}
                    tone="alarm"
                  />
                </div>
                <div className="mt-5 border-t border-line/70 pt-4">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-faint">
                    Top triggered rules
                  </div>
                  {fraud.data.by_rule.length === 0 ? (
                    <div className="text-[11px] text-mut">No rules triggered yet.</div>
                  ) : (
                    fraud.data.by_rule.map((r) => (
                      <div
                        key={r.rule_name}
                        className="flex justify-between border-b border-line/50 py-1.5 text-[11px] last:border-0"
                      >
                        <span className="text-mut">{r.rule_name}</span>
                        <span className="text-ink">{r.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Recent Transactions"
          subtitle="Latest 6 records"
          action={
            <Link to="/transactions" className="text-[10px] text-faint transition-colors hover:text-ink">
              view all
            </Link>
          }
        >
          {recent.isLoading ? (
            <PanelLoading label="Loading transactions" />
          ) : recent.isError ? (
            <PanelError message="Transactions could not be loaded." onRetry={() => void recent.refetch()} />
          ) : recent.data!.items.length === 0 ? (
            <PanelEmpty message="No transactions recorded yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line/50 text-[9px] uppercase tracking-[0.12em] text-faint">
                    <th className="px-4 py-2 text-left font-medium">Ref</th>
                    <th className="px-2 py-2 text-left font-medium">Card</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="px-2 py-2 text-left font-medium">Location</th>
                    <th className="px-2 py-2 text-left font-medium">Time</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.data!.items.map((t) => (
                    <tr key={t.id} className="border-b border-line/40 transition-colors last:border-0 hover:bg-panel/50">
                      <td className="px-4 py-2.5 text-mut">{t.transaction_reference}</td>
                      <td className="px-2 py-2.5 text-mut">{t.card_reference.slice(-9)}</td>
                      <td className="px-2 py-2.5 text-right">{formatCurrency(t.amount)}</td>
                      <td className="px-2 py-2.5 text-ink">{t.location}</td>
                      <td className="px-2 py-2.5 text-faint">{formatTime(t.transaction_date)}</td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={t.fraud_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title="Fraud Alerts"
          action={<span className="text-[10px] text-alarm">{s?.new_alerts ?? 0} new</span>}
        >
          {alerts.isLoading ? (
            <PanelLoading label="Loading alerts" />
          ) : alerts.isError ? (
            <PanelError message="Alerts could not be loaded." onRetry={() => void alerts.refetch()} />
          ) : alerts.data!.items.length === 0 ? (
            <PanelEmpty message="No fraud alerts recorded." />
          ) : (
            <div className="space-y-3 p-3">
              {alerts.data!.items.map((a) => (
                <div
                  key={a.id}
                  className={`rounded-md p-3 ring-1 ring-inset ${
                    a.alert_status === "New" ? "bg-panel/70 ring-alarm/25" : "bg-panel/40 ring-line/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-ink">
                      ALR-{String(a.id).padStart(4, "0")}
                    </span>
                    <StatusPill status={a.alert_status} />
                  </div>
                  <div className="mt-1 text-[10px] text-faint">
                    {a.transaction_reference} · {formatCurrency(a.amount)}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {a.triggered_rules.map((r) => (
                      <span
                        key={r}
                        className={`rounded px-1.5 py-0.5 text-[10px] ring-1 ring-inset ${
                          a.alert_status === "New"
                            ? "bg-alarm/10 text-alarm ring-alarm/20"
                            : "bg-panel text-mut ring-line"
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2.5 text-[10px] text-mut">{a.reason}</div>
                </div>
              ))}
              <Link
                to="/alerts"
                className="block rounded-md bg-panel py-1.5 text-center text-[11px] text-mut ring-1 ring-inset ring-line transition-colors hover:text-ink"
              >
                Open alert queue
              </Link>
            </div>
          )}
        </Panel>
      </section>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  note,
  tone,
  noteTone,
  highlight,
  small,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "clear" | "alarm";
  noteTone?: "warn";
  highlight?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rise rounded-lg p-4 ring-1 ring-inset ${
        highlight ? "bg-alarm/8 ring-alarm/30" : "bg-surface ring-line"
      }`}
    >
      <div
        className={`text-[10px] uppercase tracking-[0.14em] ${highlight ? "text-alarm/80" : "text-faint"}`}
      >
        {label}
      </div>
      <div
        className={`mt-2 font-display font-semibold tracking-tight ${small ? "text-[20px]" : "text-[24px]"} ${
          tone === "clear" ? "text-clear" : tone === "alarm" ? "text-alarm" : ""
        }`}
      >
        {value}
      </div>
      <div className={`mt-1 text-[10px] ${noteTone === "warn" ? "text-warn" : "text-faint"}`}>{note}</div>
    </div>
  );
}

function Meter({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "clear" | "alarm";
}) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[11px]">
        <span className="text-mut">{label}</span>
        <span className={tone === "clear" ? "text-clear" : "text-alarm"}>{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel ring-1 ring-inset ring-line/50">
        <div
          className={`h-full rounded-full ${tone === "clear" ? "bg-clear/80" : "bg-alarm/80"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
