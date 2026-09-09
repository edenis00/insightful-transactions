import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelLoading } from "@/components/ui-states";
import { analysisApi } from "@/lib/api/services";
import type { GroupBucket } from "@/lib/api/types";
import { formatCompactCurrency, formatDate, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/analysis")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transaction Analysis — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Analyse transaction volume and value by type, location and time, alongside fraud rule and alert status distributions.",
      },
      { property: "og:title", content: "Transaction Analysis — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Volume and value analysis by type, location and time with fraud distributions.",
      },
    ],
  }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const [days, setDays] = useState(14);

  const summary = useQuery({ queryKey: ["analysis", "summary", {}], queryFn: () => analysisApi.summary() });
  const trends = useQuery({ queryKey: ["analysis", "trends", days], queryFn: () => analysisApi.trends(days) });
  const byType = useQuery({ queryKey: ["analysis", "by-type"], queryFn: () => analysisApi.byType() });
  const byLocation = useQuery({ queryKey: ["analysis", "by-location"], queryFn: () => analysisApi.byLocation() });
  const fraud = useQuery({ queryKey: ["analysis", "fraud"], queryFn: () => analysisApi.fraud() });

  const peak = trends.data ? Math.max(...trends.data.map((p) => p.count), 1) : 1;
  const s = summary.data;

  return (
    <AppShell title="Transaction Analysis" subtitle="Patterns across volume, value and fraud outcomes">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Transactions" value={s ? formatNumber(s.total_transactions) : "—"} />
        <Stat label="Total value" value={s ? formatCompactCurrency(s.total_value) : "—"} />
        <Stat label="Average value" value={s ? formatCompactCurrency(s.average_value) : "—"} />
        <Stat
          label="Suspicious rate"
          value={fraud.data ? `${(fraud.data.suspicious_rate * 100).toFixed(1)}%` : "—"}
          alarm
        />
      </section>

      <Panel
        title="Volume and Value Over Time"
        subtitle={`Last ${days} days`}
        action={
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded px-2 py-1 text-[10px] ring-1 ring-inset transition-colors ${
                  days === d ? "bg-panel text-ink ring-line" : "text-faint ring-transparent hover:text-ink"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        }
      >
        <div className="p-4">
          {trends.isLoading || !trends.data ? (
            <PanelLoading label="Loading trend" />
          ) : (
            <>
              <div className="flex h-44 items-end gap-1.5">
                {trends.data.map((p, i) => (
                  <div key={p.date} className="flex flex-1 flex-col justify-end gap-0.5">
                    <div
                      title={`${formatDate(p.date)} · ${p.suspicious} suspicious`}
                      className="bar-rise rounded-sm bg-alarm/70"
                      style={{
                        height: `${(p.suspicious / peak) * 100}%`,
                        animationDelay: `${i * 25}ms`,
                      }}
                    />
                    <div
                      title={`${formatDate(p.date)} · ${p.count} transactions`}
                      className="bar-rise rounded-sm bg-panel ring-1 ring-inset ring-line/60"
                      style={{
                        height: `${Math.max(6, ((p.count - p.suspicious) / peak) * 100)}%`,
                        animationDelay: `${i * 25}ms`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-[10px] text-faint">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-panel ring-1 ring-inset ring-line" /> Normal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-sm bg-alarm/70" /> Suspicious
                </span>
                <span className="ml-auto">peak {peak} per day</span>
              </div>
            </>
          )}
        </div>
      </Panel>

      <section className="grid gap-4 lg:grid-cols-2">
        <Buckets title="By Transaction Type" data={byType.data} />
        <Buckets title="By Location" data={byLocation.data} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Triggered Rules" subtitle="Alert count per rule">
          <div className="p-4">
            {!fraud.data ? (
              <PanelLoading label="Loading rules" />
            ) : fraud.data.by_rule.length === 0 ? (
              <div className="text-[11px] text-mut">No rules triggered yet.</div>
            ) : (
              fraud.data.by_rule.map((r) => (
                <Row key={r.rule_name} label={r.rule_name} value={formatNumber(r.count)} />
              ))
            )}
          </div>
        </Panel>
        <Panel title="Alert Status Distribution" subtitle="Review progress">
          <div className="p-4">
            {!fraud.data ? (
              <PanelLoading label="Loading statuses" />
            ) : (
              fraud.data.by_alert_status.map((r) => (
                <Row key={r.alert_status} label={r.alert_status} value={formatNumber(r.count)} />
              ))
            )}
          </div>
        </Panel>
      </section>
    </AppShell>
  );
}

function Stat({ label, value, alarm }: { label: string; value: string; alarm?: boolean }) {
  return (
    <div className="rise rounded-lg bg-surface p-4 ring-1 ring-inset ring-line">
      <div className="text-[10px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={`mt-2 font-display text-[22px] font-semibold tracking-tight ${alarm ? "text-alarm" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line/50 py-2 text-[11.5px] last:border-0">
      <span className="text-mut">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function Buckets({ title, data }: { title: string; data: GroupBucket[] | undefined }) {
  const max = data ? Math.max(...data.map((d) => d.count), 1) : 1;
  return (
    <Panel title={title} subtitle="Count, value and suspicious share">
      <div className="space-y-3 p-4">
        {!data ? (
          <PanelLoading label="Loading breakdown" />
        ) : (
          data.map((d) => (
            <div key={d.label}>
              <div className="mb-1 flex justify-between text-[11.5px]">
                <span className="text-mut">{d.label}</span>
                <span className="text-ink">
                  {formatNumber(d.count)} · {formatCompactCurrency(d.value)}
                </span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-panel ring-1 ring-inset ring-line/50">
                <div
                  className="h-full bg-alarm/70"
                  style={{ width: `${(d.suspicious / max) * 100}%` }}
                />
                <div
                  className="h-full bg-clear/50"
                  style={{ width: `${((d.count - d.suspicious) / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
