import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { alertsApi, analysisApi, transactionsApi } from "@/lib/api/services";
import { formatCompactCurrency, formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { Panel, PanelEmpty, PanelError, PanelLoading, Stat, StatusPill, Td, Th } from "@/components/ui-states";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — Vantage Card Monitoring" },
      { name: "description", content: "Overview of corporate card activity, suspicious transactions and open alerts by department." },
      { property: "og:title", content: "Dashboard — Vantage Card Monitoring" },
      { property: "og:description", content: "Corporate card activity, suspicious transactions and open alerts at a glance." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const staff = user?.role !== "CARD_USER";
  const summary = useQuery({ queryKey: ["analysis", "summary", {}], queryFn: () => analysisApi.summary() });
  const trends = useQuery({ queryKey: ["analysis", "trends", 14], queryFn: () => analysisApi.trends(14) });
  const breakdown = useQuery({ queryKey: ["analysis", "breakdown"], queryFn: () => analysisApi.breakdown(), enabled: staff });
  const recent = useQuery({ queryKey: ["transactions", "recent"], queryFn: () => transactionsApi.list({ page_size: 8 }) });
  const alerts = useQuery({
    queryKey: ["alerts", "open"],
    queryFn: () => alertsApi.list({ alert_status: "new", page_size: 5 }),
  });
  const s = summary.data;
  const peak = trends.data ? Math.max(...trends.data.map((p) => p.count), 1) : 1;

  return (
    <AppShell title="Dashboard" subtitle="Department → Card → User → Transaction → Alert">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Transactions" value={s ? formatNumber(s.total_transactions) : "—"} hint={s ? `${formatCompactCurrency(s.total_amount)} total spend` : undefined} />
        <Stat label="Suspicious" value={s ? formatNumber(s.suspicious_transactions) : "—"} alarm hint={s ? `${formatNumber(s.normal_transactions)} normal` : undefined} />
        <Stat label="Open alerts" value={s ? formatNumber(s.active_alerts) : "—"} alarm hint={s ? `${formatNumber(s.total_alerts)} raised in total` : undefined} />
        <Stat label="Active cards" value={s ? formatNumber(s.active_cards) : "—"} hint={s ? `${s.departments} departments · ${s.active_users} users` : undefined} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Activity, last 14 days" subtitle="Suspicious share in red" className="lg:col-span-2">
          <div className="p-4">
            {trends.isLoading ? (
              <PanelLoading label="Loading activity" />
            ) : trends.isError ? (
              <PanelError
                message={trends.error instanceof Error ? trends.error.message : "Could not load activity."}
                onRetry={() => void trends.refetch()}
              />
            ) : trends.data?.length ? (
              <div className="flex h-40 items-end gap-1.5">
                {trends.data.map((point) => (
                  <div
                    key={point.date}
                    className="flex h-full flex-1 flex-col justify-end gap-0.5"
                    title={`${point.date}: ${point.count} transactions, ${point.suspicious} suspicious`}
                  >
                    <div
                      className="rounded-sm bg-alarm/70"
                      style={{ height: `${(point.suspicious / peak) * 100}%` }}
                    />
                    <div
                      className="rounded-sm bg-panel ring-1 ring-inset ring-line/60"
                      style={{ height: `${Math.max(4, ((point.count - point.suspicious) / peak) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <PanelEmpty message="No transaction activity in the last 14 days." />
            )}
          </div>
        </Panel>
        <Panel title="New alerts" subtitle="Awaiting investigation" action={<Link to="/alerts" className="text-[11px] text-mut hover:text-ink">View all</Link>}>
          <div className="divide-y divide-line/40">
            {!alerts.data ? <PanelLoading /> : alerts.data.items.length === 0 ? (
              <div className="p-4 text-[11px] text-mut">No new alerts.</div>
            ) : alerts.data.items.map((alert) => (
              <Link
                key={alert.id}
                to="/transactions/$id"
                params={{ id: String(alert.transaction.id) }}
                className="block p-3 hover:bg-panel/40"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11.5px] text-ink">Alert {alert.id}</span>
                  <StatusPill status={alert.alert_status} />
                  <span className="ml-auto text-[11px]">
                    {formatCurrency(Number(alert.transaction.amount))}
                  </span>
                </div>
                <div className="mt-1 text-[10.5px] text-mut">
                  {alert.transaction.transaction_reference} · {alert.transaction.location}
                </div>
                <div className="text-[10px] text-faint">{alert.rule_name}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </section>

      {staff ? (
        <Panel title="Spending by department" subtitle="Accountability by cost centre">
          <div className="space-y-3 p-4">
            {!breakdown.data ? <PanelLoading /> : breakdown.data.by_department.map((d) => {
              const max = Math.max(...breakdown.data!.by_department.map((x) => x.value), 1);
              return (
                <div key={d.label}>
                  <div className="mb-1 flex justify-between text-[11.5px]">
                    <span className="text-mut">{d.label}</span>
                    <span>{formatCompactCurrency(d.value)} · {d.count} tx · <span className="text-alarm">{d.suspicious} suspicious</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-panel ring-1 ring-inset ring-line/50">
                    <div className="h-full bg-clear/50" style={{ width: `${(d.value / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      <Panel title="Recent transactions" action={<Link to="/transactions" className="text-[11px] text-mut hover:text-ink">View all</Link>}>
        {!recent.data ? <PanelLoading /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Card reference</Th>
                  <Th>Type</Th>
                  <Th>Location</Th>
                  <Th right>Amount</Th>
                  <Th>Time</Th>
                  <Th>Fraud status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {recent.data.items.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-panel/40">
                    <Td>
                      <Link
                        to="/transactions/$id"
                        params={{ id: String(transaction.id) }}
                        className="text-ink hover:underline"
                      >
                        {transaction.transaction_reference}
                      </Link>
                    </Td>
                    <Td className="text-mut">{transaction.card_reference}</Td>
                    <Td className="text-mut">{transaction.transaction_type}</Td>
                    <Td className="text-mut">{transaction.location}</Td>
                    <Td right>{formatCurrency(Number(transaction.amount))}</Td>
                    <Td className="text-faint">{formatDateTime(transaction.transaction_date)}</Td>
                    <Td><StatusPill status={transaction.fraud_status} /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
