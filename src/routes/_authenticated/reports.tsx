import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Panel,
  PanelEmpty,
  PanelError,
  PanelLoading,
} from "@/components/ui-states";
import { reportsApi, type ApiReport } from "@/lib/api/services";
import {
  formatCompactCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/format";

const REPORT_TYPES = [
  "Transaction Summary",
  "Fraud Alert Report",
  "Location Analysis",
];

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  component: ReportsPage,
});

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function ReportsPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState(REPORT_TYPES[0]!);
  const [start, setStart] = useState(isoDaysAgo(30));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const list = useQuery({
    queryKey: ["reports"],
    queryFn: () => reportsApi.list(),
  });

  const reportId = selectedId ?? list.data?.items[0]?.id;

  const detail = useQuery({
    queryKey: ["reports", reportId],
    queryFn: () => reportsApi.get(reportId!),
    enabled: reportId !== undefined,
  });

  const generate = useMutation({
    mutationFn: () =>
      reportsApi.generate({
        report_type: type,
        start_date: start,
        end_date: end,
      }),
    onSuccess: (report) => {
      setSelectedId(report.id);
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : "Report generation failed.");
    },
  });

  const report: ApiReport | null = detail.data ?? null;

  return (
    <AppShell title="Reports" subtitle="Generate transaction and fraud reports">
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Generate report" subtitle="Choose a report type and date range">
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">
                Report type
              </span>
              <select
                className={inputCls}
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {REPORT_TYPES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">
                Start date
              </span>
              <input
                type="date"
                className={inputCls}
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">
                End date
              </span>
              <input
                type="date"
                className={inputCls}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>

            {error ? <div className="text-[11px] text-alarm">{error}</div> : null}

            <button
              type="button"
              onClick={() => {
                setError("");
                if (start > end) {
                  setError("The start date must be on or before the end date.");
                  return;
                }
                generate.mutate();
              }}
              disabled={generate.isPending}
              className="w-full rounded-md bg-alarm/15 py-2 text-[12px] font-semibold text-alarm ring-1 ring-inset ring-alarm/30 disabled:opacity-60"
            >
              {generate.isPending ? "Generating…" : "Generate report"}
            </button>

            <div className="border-t border-line/60 pt-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-faint">
                Generated reports
              </div>

              {list.isLoading ? (
                <PanelLoading label="Loading reports" />
              ) : list.isError ? (
                <PanelError
                  message="Reports could not be loaded."
                  onRetry={() => void list.refetch()}
                />
              ) : list.data.items.length === 0 ? (
                <div className="text-[11px] text-mut">No reports generated yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {list.data.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`block w-full rounded-md px-2.5 py-2 text-left text-[11.5px] ring-1 ring-inset ${
                        reportId === item.id
                          ? "bg-panel text-ink ring-line"
                          : "text-mut ring-transparent hover:bg-panel/50"
                      }`}
                    >
                      <div>{item.report_type}</div>
                      <div className="text-[10px] text-faint">
                        {formatDate(item.start_date)} – {formatDate(item.end_date)} ·{" "}
                        {formatDateTime(item.created_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          className="lg:col-span-2"
          title={report?.report_type ?? "Report preview"}
          subtitle={
            report
              ? `${formatDate(report.start_date)} – ${formatDate(report.end_date)}`
              : "Select or generate a report"
          }
          action={
            report ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-md bg-panel px-2.5 py-1 text-[11px] text-mut ring-1 ring-inset ring-line"
              >
                Print
              </button>
            ) : null
          }
        >
          {detail.isLoading ? (
            <PanelLoading label="Loading report" />
          ) : detail.isError ? (
            <PanelError message="The selected report could not be loaded." />
          ) : !report ? (
            <PanelEmpty message="Generate or select a report to view it." />
          ) : (
            <div className="space-y-5 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Cell
                  label="Transactions"
                  value={formatNumber(report.report_data.summary.total_transactions)}
                />
                <Cell
                  label="Total value"
                  value={formatCompactCurrency(
                    Number(report.report_data.summary.total_transaction_value),
                  )}
                />
                <Cell
                  label="Normal"
                  value={formatNumber(report.report_data.summary.normal_transactions)}
                />
                <Cell
                  label="Suspicious"
                  value={formatNumber(report.report_data.summary.suspicious_transactions)}
                  alarm
                />
                <Cell
                  label="Alerts"
                  value={formatNumber(report.report_data.summary.fraud_alert_count)}
                  alarm
                />
              </div>

              <Table
                title="By transaction type"
                rows={report.report_data.distribution_by_type.map((row) => ({
                  label: row.category,
                  count: row.transaction_count,
                  value: Number(row.total_value),
                }))}
              />

              <Table
                title="By location"
                rows={report.report_data.distribution_by_location.map((row) => ({
                  label: row.category,
                  count: row.transaction_count,
                  value: Number(row.total_value),
                }))}
              />
            </div>
          )}
        </Panel>
      </section>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-md bg-panel px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-inset ring-line outline-none focus:ring-alarm/40";

function Cell({
  label,
  value,
  alarm,
}: {
  label: string;
  value: string;
  alarm?: boolean;
}) {
  return (
    <div className="rounded-md bg-panel/60 p-3 ring-1 ring-inset ring-line/70">
      <div className="text-[9px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={`mt-1.5 font-display text-[18px] font-semibold ${alarm ? "text-alarm" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Table({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; count: number; value: number }>;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-faint">{title}</div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-mut">No records in this period.</div>
      ) : (
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-line/50 text-[9px] uppercase tracking-[0.12em] text-faint">
              <th className="py-2 text-left font-medium">Group</th>
              <th className="py-2 text-right font-medium">Count</th>
              <th className="py-2 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-line/40 last:border-0">
                <td className="py-2 text-mut">{row.label}</td>
                <td className="py-2 text-right">{formatNumber(row.count)}</td>
                <td className="py-2 text-right">{formatCompactCurrency(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}