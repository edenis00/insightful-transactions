import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading, Pager, StatusPill, btnCls, inputCls } from "@/components/ui-states";
import { alertsApi, departmentsApi } from "@/lib/api/services";
import type { AlertStatus } from "@/lib/api/types";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

const STATUSES: AlertStatus[] = ["New", "Under Review", "Confirmed", "False Positive", "Resolved"];

export const Route = createFileRoute("/_authenticated/alerts")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Alerts — Vantage Card Monitoring" },
      { name: "description", content: "Investigate alerts raised on corporate card transactions and record the outcome." },
      { property: "og:title", content: "Alerts — Vantage Card Monitoring" },
      { property: "og:description", content: "Investigate and resolve corporate card alerts." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const staff = user?.role !== "CARD_USER";
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [dept, setDept] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const depts = useQuery({ queryKey: ["departments"], queryFn: () => departmentsApi.list(), enabled: staff });
  const list = useQuery({
    queryKey: ["alerts", { status, severity, dept, search, page }],
    queryFn: () => alertsApi.list({ status, severity, department_id: dept, search, page, page_size: 10 }),
  });
  const update = useMutation({
    mutationFn: ({ id, next }: { id: number; next: AlertStatus }) => alertsApi.updateStatus(id, next, notes[id]),
    onSuccess: () => { for (const k of ["alerts", "analysis", "transactions"]) void qc.invalidateQueries({ queryKey: [k] }); },
  });
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 10));
  const reset = () => setPage(1);

  return (
    <AppShell title="Alerts" subtitle="Investigation queue">
      <Panel title="Alert queue" subtitle={`${formatNumber(list.data?.total ?? 0)} alerts in view`}>
        <div className="flex flex-wrap gap-2 border-b border-line/60 p-3">
          <input className={`${inputCls} w-52`} placeholder="Search ref, user, card" value={search} onChange={(e) => { reset(); setSearch(e.target.value); }} />
          <select className={`${inputCls} w-40`} value={status} onChange={(e) => { reset(); setStatus(e.target.value); }}>
            <option value="">All statuses</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={`${inputCls} w-32`} value={severity} onChange={(e) => { reset(); setSeverity(e.target.value); }}>
            <option value="">All severities</option>{["High", "Medium", "Low"].map((s) => <option key={s}>{s}</option>)}
          </select>
          {staff ? (
            <select className={`${inputCls} w-44`} value={dept} onChange={(e) => { reset(); setDept(e.target.value); }}>
              <option value="">All departments</option>{depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ) : null}
        </div>
        {list.isLoading ? <PanelLoading /> : list.isError ? (
          <PanelError message="Alerts could not be loaded." onRetry={() => void list.refetch()} />
        ) : list.data!.items.length === 0 ? <PanelEmpty message="No alerts match the current view." /> : (
          <>
            <div className="divide-y divide-line/40">
              {list.data!.items.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-[13px] font-semibold">{a.alert_reference}</span>
                    <StatusPill status={a.severity} />
                    <StatusPill status={a.status} />
                    <Link to="/transactions/$id" params={{ id: String(a.transaction_id) }} className="text-[11px] text-mut hover:text-ink hover:underline">{a.transaction_reference}</Link>
                    <span className="text-[11px]">{formatCurrency(a.amount)}</span>
                    <span className="ml-auto text-[10px] text-faint">detected {formatDateTime(a.detected_at)}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-mut">{a.department_name} → {a.masked_card_number} → {a.user_name} · {a.location}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {a.triggered_rules.map((r) => (
                      <span key={r} className="rounded bg-alarm/10 px-1.5 py-0.5 text-[10px] text-alarm ring-1 ring-inset ring-alarm/20">{r}</span>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[11px] text-mut">{a.reason}</div>
                  {a.reviewed_by ? (
                    <div className="mt-1 text-[10px] text-faint">Reviewed by {a.reviewed_by}{a.reviewed_at ? ` · ${formatDateTime(a.reviewed_at)}` : ""}{a.resolution_note ? ` · “${a.resolution_note}”` : ""}</div>
                  ) : null}
                  {staff ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input className={`${inputCls} w-64`} placeholder="Investigation note (optional)" value={notes[a.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))} />
                      {STATUSES.filter((s) => s !== a.status && s !== "New").map((s) => (
                        <button key={s} disabled={update.isPending} onClick={() => update.mutate({ id: a.id, next: s })} className={btnCls}>Mark {s}</button>
                      ))}
                    </div>
                  ) : null}
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
