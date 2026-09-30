import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Panel,
  PanelEmpty,
  PanelError,
  PanelLoading,
  Pager,
  StatusPill,
  inputCls,
} from "@/components/ui-states";
import {
  alertsApi,
  type ApiAlertStatus,
} from "@/lib/api/services";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

const STATUSES: ApiAlertStatus[] = ["new", "under_review", "reviewed", "resolved"];

export const Route = createFileRoute("/_authenticated/alerts")({
  ssr: false,
  component: AlertsPage,
});

function AlertsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ApiAlertStatus | "">("");
  const [reference, setReference] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const list = useQuery({
    queryKey: ["alerts", { status, reference, ruleName, page }],
    queryFn: () =>
      alertsApi.list({
        page,
        page_size: pageSize,
        alert_status: status || undefined,
        transaction_reference: reference || undefined,
        rule_name: ruleName || undefined,
      }),
  });

  const update = useMutation({
    mutationFn: ({ id, next }: { id: number; next: ApiAlertStatus }) =>
      alertsApi.update(id, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["analysis"] });
    },
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell title="Alerts" subtitle="Fraud investigation queue">
      <Panel title="Alert queue" subtitle={`${formatNumber(total)} alerts match`}>
        <div className="flex flex-wrap gap-2 border-b border-line/60 p-3">
          <input
            className={`${inputCls} w-56`}
            placeholder="Transaction reference"
            value={reference}
            onChange={(event) => {
              setPage(1);
              setReference(event.target.value);
            }}
          />

          <input
            className={`${inputCls} w-48`}
            placeholder="Rule name"
            value={ruleName}
            onChange={(event) => {
              setPage(1);
              setRuleName(event.target.value);
            }}
          />

          <select
            className={`${inputCls} w-44`}
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as ApiAlertStatus | "");
            }}
          >
            <option value="">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {item.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {list.isLoading ? (
          <PanelLoading label="Loading alerts" />
        ) : list.isError ? (
          <PanelError
            message="Alerts could not be loaded."
            onRetry={() => void list.refetch()}
          />
        ) : list.data.items.length === 0 ? (
          <PanelEmpty message="No alerts match these filters." />
        ) : (
          <>
            <div className="divide-y divide-line/40">
              {list.data.items.map((alert) => (
                <div
                  key={alert.id}
                  className={`space-y-2 border-l-2 p-4 ${
                    alert.alert_status === "new"
                      ? "border-alarm bg-alarm/5"
                      : alert.alert_status === "under_review"
                        ? "border-warn bg-warn/5"
                        : "border-transparent"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-[13px] font-semibold">
                      Alert {alert.id}
                    </span>
                    <StatusPill status={alert.alert_status} />
                    <span className="text-[11px] text-mut">{alert.rule_name}</span>
                    <Link
                      to="/transactions/$id"
                      params={{ id: String(alert.transaction.id) }}
                      className="text-[11px] text-mut hover:text-ink hover:underline"
                    >
                      {alert.transaction.transaction_reference}
                    </Link>
                    <span className="text-[11px]">
                      {formatCurrency(Number(alert.transaction.amount))}
                    </span>
                    <span className="ml-auto text-[10px] text-faint">
                      {formatDateTime(alert.created_at)}
                    </span>
                  </div>

                  <div className="text-[11px] text-mut">
                    {alert.transaction.transaction_type} · {alert.transaction.location} ·{" "}
                    {formatDateTime(alert.transaction.transaction_date)}
                  </div>

                  <div className="text-[11px] text-mut">{alert.reason}</div>

                  {alert.reviewed_at ? (
                    <div className="text-[10px] text-faint">
                      Reviewed {formatDateTime(alert.reviewed_at)}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {alert.alert_status === "new" ? (
                      <button
                        className="rounded-md bg-panel px-2.5 py-1.5 text-[11px] text-mut ring-1 ring-inset ring-line disabled:opacity-50"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: alert.id, next: "under_review" })}
                      >
                        Start review
                      </button>
                    ) : null}

                    {alert.alert_status !== "reviewed" ? (
                      <button
                        className="rounded-md bg-panel px-2.5 py-1.5 text-[11px] text-mut ring-1 ring-inset ring-line disabled:opacity-50"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: alert.id, next: "reviewed" })}
                      >
                        Mark reviewed
                      </button>
                    ) : null}

                    {alert.alert_status !== "resolved" ? (
                      <button
                        className="rounded-md bg-panel px-2.5 py-1.5 text-[11px] text-mut ring-1 ring-inset ring-line disabled:opacity-50"
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: alert.id, next: "resolved" })}
                      >
                        Resolve
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <Pager page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </Panel>
    </AppShell>
  );
}