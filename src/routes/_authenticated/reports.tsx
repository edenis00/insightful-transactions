import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading } from "@/components/ui-states";
import { reportsApi } from "@/lib/api/services";
import type { Report } from "@/lib/api/types";
import { formatCompactCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";

const REPORT_TYPES = ["Transaction Summary", "Fraud Alert Report", "Location Analysis"];

export const Route = createFileRoute("/_authenticated/reports")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reports — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Generate and review transaction and fraud alert reports for any date range, with breakdowns by type and location.",
      },
      { property: "og:title", content: "Reports — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Generate transaction and fraud reports for any date range.",
      },
    ],
  }),
  component: ReportsPage,
});

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function ReportsPage() {
  const qc = useQueryClient();
  const [type, setType] = useState(REPORT_TYPES[0]!);
  const [start, setStart] = useState(isoDaysAgo(30));
  const [end, setEnd] = useState(isoDaysAgo(0));
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

  const list = useQuery({ queryKey: ["reports"], queryFn: () => reportsApi.list() });

  const generate = useMutation({
    mutationFn: () => reportsApi.generate({ report_type: type, start_date: start, end_date: end }),
    onSuccess: (r) => {
      setSelected(r);
      void qc.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const view = selected ?? list.data?.[0] ?? null;

  return (
    <AppShell title="Reports" subtitle="Generate transaction and fraud reports">
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Generate Report" subtitle="Select a type and date range">
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">Report type</span>
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">Start date</span>
              <input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">End date</span>
              <input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            {error ? <div className="text-[11px] text-alarm">{error}</div> : null}
            <button
              onClick={() => {
                setError("");
                if (start > end) return setError("The start date must fall before the end date.");
                generate.mutate();
              }}
              disabled={generate.isPending}
              className="w-full rounded-md bg-alarm/15 py-2 text-[12px] font-semibold text-alarm ring-1 ring-inset ring-alarm/30 transition-colors hover:bg-alarm/20 disabled:opacity-60"
            >
              {generate.isPending ? "Generating…" : "Generate report"}
            </button>

            <div className="border-t border-line/60 pt-3">
              <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-faint">Generated reports</div>
              {list.isLoading ? (
                <PanelLoading label="Loading reports" />
              ) : list.isError ? (
                <PanelError message="Reports could not be loaded." onRetry={() => void list.refetch()} />
              ) : list.data!.length === 0 ? (
                <div className="text-[11px] text-mut">No reports generated yet.</div>
              ) : (
                <div className="space-y-1.5">
                  {list.data!.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`block w-full rounded-md px-2.5 py-2 text-left text-[11.5px] ring-1 ring-inset transition-colors ${
                        view?.id === r.id
                          ? "bg-panel text-ink ring-line"
                          : "text-mut ring-transparent hover:bg-panel/50 hover:text-ink"
                      }`}
                    >
                      <div>{r.report_type}</div>
                      <div className="text-[10px] text-faint">
                        {formatDate(r.start_date)} – {formatDate(r.end_date)} · {formatDateTime(r.created_at)}
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
          title={view ? view.report_type : "Report Preview"}
          subtitle={view ? `${formatDate(view.start_date)} – ${formatDate(view.end_date)}` : "Nothing selected"}
          action={
            view ? (
              <button
                onClick={() => window.print()}
                className="rounded-md bg-panel px-2.5 py-1 text-[11px] text-mut ring-1 ring-inset ring-line transition-colors hover:text-ink"
              >
                Print
              </button>
            ) : null
          }
        >
          {!view ? (
            <PanelEmpty message="Generate or select a report to view its contents." />
          ) : (
            <div className="space-y-5 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Cell label="Transactions" value={formatNumber(view.report_data.total_transactions)} />
                <Cell label="Total value" value={formatCompactCurrency(view.report_data.total_value)} />
                <Cell label="Normal" value={formatNumber(view.report_data.normal_transactions)} />
                <Cell label="Suspicious" value={formatNumber(view.report_data.suspicious_transactions)} alarm />
                <Cell label="Alerts" value={formatNumber(view.report_data.alert_count)} alarm />
              </div>

              <Table title="By transaction type" rows={view.report_data.by_type} />
              <Table title="By location" rows={view.report_data.by_location} />
            </div>
          )}
        </Panel>
      </section>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-md bg-panel px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-inset ring-line outline-none transition-colors focus:ring-alarm/40";

function Cell({ label, value, alarm }: { label: string; value: string; alarm?: boolean }) {
  return (
    <div className="rounded-md bg-panel/60 p-3 ring-1 ring-inset ring-line/70">
      <div className="text-[9px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={`mt-1.5 font-display text-[18px] font-semibold ${alarm ? "text-alarm" : ""}`}>{value}</div>
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: Array<{ label: string; count: number; value: number }> }) {
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
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line/40 last:border-0">
                <td className="py-2 text-mut">{r.label}</td>
                <td className="py-2 text-right">{formatNumber(r.count)}</td>
                <td className="py-2 text-right">{formatCompactCurrency(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
