import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading, StatusPill } from "@/components/ui-states";
import { alertsApi } from "@/lib/api/services";
import type { AlertStatus } from "@/lib/api/types";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

const STATUSES: AlertStatus[] = ["New", "Under Review", "Reviewed", "Resolved"];

export const Route = createFileRoute("/_authenticated/alerts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Alert Queue — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Review fraud alerts raised by the rule engine, inspect triggered rules and move each alert through its review lifecycle.",
      },
      { property: "og:title", content: "Alert Queue — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Review fraud alerts and progress them through the review lifecycle.",
      },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const list = useQuery({
    queryKey: ["alerts", { status, search, page }],
    queryFn: () =>
      alertsApi.list({ alert_status: status, search, page, page_size: pageSize }),
  });

  const update = useMutation({
    mutationFn: ({ id, next }: { id: number; next: AlertStatus }) => alertsApi.updateStatus(id, next),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["analysis"] });
    },
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell title="Alert Queue" subtitle="Fraud alerts raised by the rule engine">
      <Panel title="Alerts" subtitle={`${formatNumber(total)} alerts in the current view`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line/60 p-3">
          <input
            className="w-52 rounded-md bg-panel px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-inset ring-line outline-none focus:ring-alarm/40"
            placeholder="Search reference or rule"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <div className="flex gap-1">
            {["", ...STATUSES].map((s) => (
              <button
                key={s || "all"}
                onClick={() => {
                  setPage(1);
                  setStatus(s);
                }}
                className={`rounded-md px-2.5 py-1.5 text-[11px] ring-1 ring-inset transition-colors ${
                  status === s
                    ? "bg-panel text-ink ring-line"
                    : "text-mut ring-transparent hover:text-ink"
                }`}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>

        {list.isLoading ? (
          <PanelLoading label="Loading alerts" />
        ) : list.isError ? (
          <PanelError message="Alerts could not be loaded." onRetry={() => void list.refetch()} />
        ) : list.data!.items.length === 0 ? (
          <PanelEmpty message="No alerts match the current view." />
        ) : (
          <>
            <div className="divide-y divide-line/40">
              {list.data!.items.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-[13px] font-semibold text-ink">
                      ALR-{String(a.id).padStart(4, "0")}
                    </span>
                    <StatusPill status={a.alert_status} />
                    <span className="text-[11px] text-mut">{a.transaction_reference}</span>
                    <span className="text-[11px] text-ink">{formatCurrency(a.amount)}</span>
                    <span className="text-[11px] text-faint">{a.location}</span>
                    <span className="ml-auto text-[10px] text-faint">
                      raised {formatDateTime(a.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.triggered_rules.map((r) => (
                      <span
                        key={r}
                        className="rounded bg-alarm/10 px-1.5 py-0.5 text-[10px] text-alarm ring-1 ring-inset ring-alarm/20"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-mut">{a.reason}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STATUSES.filter((s) => s !== a.alert_status).map((s) => (
                      <button
                        key={s}
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: a.id, next: s })}
                        className="rounded-md bg-panel px-2.5 py-1 text-[11px] text-mut ring-1 ring-inset ring-line transition-colors hover:text-ink disabled:opacity-50"
                      >
                        Mark {s}
                      </button>
                    ))}
                    {a.reviewed_at ? (
                      <span className="self-center text-[10px] text-faint">
                        reviewed {formatDateTime(a.reviewed_at)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-line/60 px-4 py-3 text-[11px] text-mut">
              <span>
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-md bg-panel px-2.5 py-1 ring-1 ring-inset ring-line disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-md bg-panel px-2.5 py-1 ring-1 ring-inset ring-line disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </AppShell>
  );
}
