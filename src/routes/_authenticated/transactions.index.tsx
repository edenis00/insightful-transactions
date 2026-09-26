import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading, Pager, StatusPill, Td, Th, inputCls, primaryBtnCls } from "@/components/ui-states";
import { cardsApi, departmentsApi, transactionsApi, type TransactionQuery } from "@/lib/api/services";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/transactions/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transaction History — Vantage Card Monitoring" },
      { name: "description", content: "Search and filter recorded corporate card transactions by department, card, user, status, amount and date." },
      { property: "og:title", content: "Transaction History — Vantage Card Monitoring" },
      { property: "og:description", content: "Searchable history of corporate card transactions." },
    ],
  }),
  component: TransactionsPage,
});

const STATUSES = ["Normal", "Suspicious", "Flagged", "Reviewed", "Resolved", "Blocked"];

function TransactionsPage() {
  const { user } = useAuth();
  const staff = user?.role !== "CARD_USER";
  const [f, setF] = useState<TransactionQuery>({});
  const [page, setPage] = useState(1);
  const depts = useQuery({ queryKey: ["departments"], queryFn: () => departmentsApi.list(), enabled: staff });
  const cards = useQuery({ queryKey: ["cards", {}], queryFn: () => cardsApi.list() });
  const list = useQuery({
    queryKey: ["transactions", f, page],
    queryFn: () => transactionsApi.list({ ...f, page, page_size: 15 }),
  });
  const set = (k: keyof TransactionQuery, v: string) => { setPage(1); setF((o) => ({ ...o, [k]: v || undefined })); };
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / 15));

  return (
    <AppShell title="Transactions" subtitle="Recorded corporate card activity">
      <Panel
        title="Transaction history"
        subtitle={`${formatNumber(list.data?.total ?? 0)} transactions match`}
        action={<Link to="/transactions/new" className={primaryBtnCls}>Record transaction</Link>}
      >
        <div className="grid gap-2 border-b border-line/60 p-3 sm:grid-cols-3 lg:grid-cols-6">
          <input className={inputCls} placeholder="Search ref, merchant, user" onChange={(e) => set("search", e.target.value)} />
          {staff ? (
            <select className={inputCls} onChange={(e) => set("department_id", e.target.value)}>
              <option value="">All departments</option>
              {depts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ) : null}
          <select className={inputCls} onChange={(e) => set("card_id", e.target.value)}>
            <option value="">All cards</option>
            {cards.data?.map((c) => <option key={c.id} value={c.id}>{c.masked_card_number}</option>)}
          </select>
          <select className={inputCls} onChange={(e) => set("status", e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input className={inputCls} type="number" placeholder="Min ₦" onChange={(e) => set("min_amount", e.target.value)} />
          <input className={inputCls} type="number" placeholder="Max ₦" onChange={(e) => set("max_amount", e.target.value)} />
          <input className={inputCls} type="date" title="From" onChange={(e) => set("start_date", e.target.value)} />
          <input className={inputCls} type="date" title="To" onChange={(e) => set("end_date", e.target.value)} />
          <input className={inputCls} placeholder="Location" onChange={(e) => set("location", e.target.value)} />
        </div>
        {list.isLoading ? <PanelLoading /> : list.isError ? (
          <PanelError message="Transactions could not be loaded." onRetry={() => void list.refetch()} />
        ) : list.data!.items.length === 0 ? <PanelEmpty message="No transactions match these filters." /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Reference</Th><Th>Department</Th><Th>Card</Th><Th>User</Th><Th>Merchant</Th><Th>Type</Th><Th>Location</Th><Th right>Amount</Th><Th>Time</Th><Th>Status</Th></tr></thead>
                <tbody className="divide-y divide-line/40">
                  {list.data!.items.map((t) => (
                    <tr key={t.id} className="hover:bg-panel/40">
                      <Td><Link to="/transactions/$id" params={{ id: String(t.id) }} className="text-ink hover:underline">{t.transaction_reference}</Link></Td>
                      <Td className="text-mut">{t.department_name}</Td>
                      <Td className="text-mut">{t.masked_card_number}</Td>
                      <Td>{t.user_name}{!t.authorised ? <span className="ml-1 text-[9.5px] text-alarm">unauthorised</span> : null}</Td>
                      <Td className="text-mut">{t.merchant}</Td>
                      <Td className="text-mut">{t.transaction_type}</Td>
                      <Td className="text-mut">{t.location}</Td>
                      <Td right>{formatCurrency(t.amount)}</Td>
                      <Td className="text-faint">{formatDateTime(t.transaction_time)}</Td>
                      <Td><StatusPill status={t.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={pages} onPage={setPage} />
          </>
        )}
      </Panel>
    </AppShell>
  );
}
