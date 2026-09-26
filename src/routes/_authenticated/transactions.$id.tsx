import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelError, PanelLoading, StatusPill } from "@/components/ui-states";
import { transactionsApi } from "@/lib/api/services";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/transactions/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transaction Investigation — Vantage Card Monitoring" },
      { name: "description", content: "Full accountability chain and event timeline for a single corporate card transaction." },
      { property: "og:title", content: "Transaction Investigation — Vantage Card Monitoring" },
      { property: "og:description", content: "Accountability chain and timeline for one transaction." },
    ],
  }),
  component: Detail,
});

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/40 py-1.5 text-[11.5px] last:border-0">
      <span className="text-faint">{k}</span><span className="text-right text-ink">{v}</span>
    </div>
  );
}

function Detail() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["transactions", "detail", id], queryFn: () => transactionsApi.get(Number(id)) });
  if (q.isLoading) return <AppShell title="Transaction" subtitle="Loading"><PanelLoading /></AppShell>;
  if (q.isError || !q.data) return <AppShell title="Transaction" subtitle="Unavailable"><Panel><PanelError message="This transaction could not be found." /></Panel></AppShell>;
  const { transaction: t, card, user, department, alerts, timeline } = q.data;

  return (
    <AppShell title={t.transaction_reference} subtitle="Investigation · accountability chain and timeline">
      <Link to="/transactions" className="text-[11px] text-mut hover:text-ink">← Back to transactions</Link>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {[department?.name ?? t.department_name, card?.masked_card_number ?? t.masked_card_number, user?.full_name ?? t.user_name, t.transaction_reference].map((x, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 ? <span className="text-faint">→</span> : null}
            <span className="rounded bg-panel px-2 py-1 ring-1 ring-inset ring-line">{x}</span>
          </span>
        ))}
        <span className="text-faint">→</span>
        <span className={`rounded px-2 py-1 ring-1 ring-inset ${alerts.length ? "bg-alarm/10 text-alarm ring-alarm/30" : "bg-clear/10 text-clear ring-clear/25"}`}>
          {alerts.length ? `${alerts.length} alert${alerts.length > 1 ? "s" : ""}` : "No alerts"}
        </span>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Transaction">
          <div className="p-4">
            <Row k="Amount" v={formatCurrency(t.amount)} />
            <Row k="Merchant" v={t.merchant} />
            <Row k="Type" v={t.transaction_type} />
            <Row k="Location" v={t.location} />
            <Row k="Time" v={formatDateTime(t.transaction_time)} />
            <Row k="Status" v={<StatusPill status={t.status} />} />
            <Row k="Authorised user" v={t.authorised ? "Yes (card holder)" : <span className="text-alarm">No</span>} />
            {t.description ? <Row k="Description" v={t.description} /> : null}
          </div>
        </Panel>
        <Panel title="Card and holder">
          <div className="p-4">
            <Row k="Card" v={card?.masked_card_number ?? t.masked_card_number} />
            <Row k="Reference" v={card?.card_reference ?? t.card_reference} />
            <Row k="Type" v={card?.card_type ?? "—"} />
            <Row k="Expiry" v={card ? formatDate(card.expiry_date) : "—"} />
            <Row k="Assigned to" v={card?.assigned_user_name ?? "Unassigned"} />
            <Row k="Used by" v={`${user?.full_name ?? t.user_name}${user ? ` (${user.employee_id})` : ""}`} />
            <Row k="Department" v={department ? `${department.name} (${department.department_code})` : t.department_name} />
          </div>
        </Panel>
        <Panel title="Timeline" subtitle="Submitted → evaluated → alerted → reviewed">
          <ol className="relative space-y-3 p-4 pl-7">
            <span className="absolute top-5 bottom-5 left-[18px] w-px bg-line" />
            {timeline.map((e, i) => (
              <li key={i} className="relative">
                <span className={`absolute top-1 -left-[13px] size-2 rounded-full ${/alert|detect|flag/i.test(e.event) ? "bg-alarm" : /resolv/i.test(e.event) ? "bg-clear" : "bg-mut"}`} />
                <div className="text-[11.5px] text-ink">{e.event}</div>
                <div className="text-[10px] text-faint">{formatDateTime(e.timestamp)}{e.detail ? ` · ${e.detail}` : ""}</div>
              </li>
            ))}
          </ol>
        </Panel>
      </section>

      <Panel title="Alerts raised" subtitle="Rules triggered by this transaction">
        {alerts.length === 0 ? <div className="p-4 text-[11px] text-mut">No detection rule was triggered.</div> : (
          <div className="divide-y divide-line/40">
            {alerts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 p-4 text-[11.5px]">
                <span className="text-ink">{a.alert_reference}</span>
                <StatusPill status={a.severity} />
                <StatusPill status={a.status} />
                <span className="text-mut">{a.rule_name}</span>
                <span className="basis-full text-[11px] text-mut">{a.reason}</span>
                {a.reviewed_by ? <span className="basis-full text-[10px] text-faint">Reviewed by {a.reviewed_by} · {a.reviewed_at ? formatDateTime(a.reviewed_at) : ""}{a.resolution_note ? ` · “${a.resolution_note}”` : ""}</span> : null}
              </div>
            ))}
            <div className="p-3"><Link to="/alerts" className="text-[11px] text-mut hover:text-ink">Investigate in alert queue →</Link></div>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
