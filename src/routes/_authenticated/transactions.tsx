import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelEmpty, PanelError, PanelLoading, StatusPill } from "@/components/ui-states";
import { transactionsApi, type NewTransaction, type TransactionQuery } from "@/lib/api/services";
import type { TransactionResult } from "@/lib/api/types";
import { formatCurrency, formatDateTime, formatNumber, toLocalInputValue } from "@/lib/format";

const TYPES = ["Online Purchase", "ATM Withdrawal", "In-Store", "Transfer"];
const LOCATIONS = ["Lagos", "Abuja", "Kano", "Enugu", "Port Harcourt", "Ibadan"];

export const Route = createFileRoute("/_authenticated/transactions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Transactions — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Record simulated card transactions and search the full transaction history with filters for type, location, status and amount.",
      },
      { property: "og:title", content: "Transactions — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Record transactions and search the full monitored transaction history.",
      },
    ],
  }),
  component: TransactionsPage,
});

const emptyFilters: TransactionQuery = {
  reference: "",
  transaction_type: "",
  location: "",
  fraud_status: "",
  status: "",
  min_amount: "",
  max_amount: "",
  start_date: "",
  end_date: "",
};

function TransactionsPage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<TransactionQuery>(emptyFilters);
  const [applied, setApplied] = useState<TransactionQuery>(emptyFilters);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const list = useQuery({
    queryKey: ["transactions", { ...applied, page, page_size: pageSize }],
    queryFn: () => transactionsApi.search({ ...applied, page, page_size: pageSize }),
  });

  const [form, setForm] = useState<NewTransaction>({
    transaction_reference: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    card_reference: "**** **** **** 4417",
    amount: 25000,
    transaction_type: TYPES[0]!,
    location: LOCATIONS[0]!,
    transaction_date: toLocalInputValue(new Date()),
  });
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<TransactionResult | null>(null);

  const create = useMutation({
    mutationFn: (payload: NewTransaction) => transactionsApi.create(payload),
    onSuccess: (res) => {
      setResult(res);
      setForm((f) => ({
        ...f,
        transaction_reference: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        transaction_date: toLocalInputValue(new Date()),
      }));
      void qc.invalidateQueries({ queryKey: ["transactions"] });
      void qc.invalidateQueries({ queryKey: ["alerts"] });
      void qc.invalidateQueries({ queryKey: ["analysis"] });
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setResult(null);
    if (!form.transaction_reference.trim()) return setFormError("A transaction reference is required.");
    if (!form.card_reference.trim()) return setFormError("A card reference is required.");
    if (!form.amount || form.amount <= 0) return setFormError("Enter an amount greater than zero.");
    create.mutate({ ...form, transaction_date: new Date(form.transaction_date).toISOString() });
  };

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell title="Transactions" subtitle="Record and monitor card transactions">
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1" title="Record Transaction" subtitle="Simulated entry · evaluated by rules engine">
          <form onSubmit={submit} className="space-y-3 p-4">
            <Field label="Reference">
              <input
                className={inputCls}
                value={form.transaction_reference}
                onChange={(e) => setForm({ ...form, transaction_reference: e.target.value })}
              />
            </Field>
            <Field label="Card reference">
              <input
                className={inputCls}
                value={form.card_reference}
                onChange={(e) => setForm({ ...form, card_reference: e.target.value })}
              />
            </Field>
            <Field label="Amount (NGN)">
              <input
                type="number"
                className={inputCls}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Type">
              <select
                className={inputCls}
                value={form.transaction_type}
                onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <select
                className={inputCls}
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              >
                {LOCATIONS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Date and time">
              <input
                type="datetime-local"
                className={inputCls}
                value={form.transaction_date}
                onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
              />
            </Field>

            {formError ? <div className="text-[11px] text-alarm">{formError}</div> : null}

            <button
              type="submit"
              disabled={create.isPending}
              className="w-full rounded-md bg-alarm/15 py-2 text-[12px] font-semibold text-alarm ring-1 ring-inset ring-alarm/30 transition-colors hover:bg-alarm/20 disabled:opacity-60"
            >
              {create.isPending ? "Evaluating…" : "Submit for evaluation"}
            </button>

            {result ? (
              <div
                className={`rounded-md p-3 text-[11px] ring-1 ring-inset ${
                  result.fraud_status === "suspicious"
                    ? "bg-alarm/10 ring-alarm/30"
                    : "bg-clear/8 ring-clear/25"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-ink">{result.transaction_reference}</span>
                  <StatusPill status={result.fraud_status} />
                </div>
                <div className="mt-1.5 text-mut">
                  {result.alert_generated
                    ? `Fraud alert ALR-${String(result.alert_id).padStart(4, "0")} generated.`
                    : "No fraud rule was triggered."}
                </div>
                {result.triggered_rules.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.triggered_rules.map((r) => (
                      <span key={r} className="rounded bg-alarm/10 px-1.5 py-0.5 text-[10px] text-alarm ring-1 ring-inset ring-alarm/20">
                        {r}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </form>
        </Panel>

        <Panel
          className="lg:col-span-2"
          title="Transaction History"
          subtitle={`${formatNumber(total)} records match the current filters`}
        >
          <div className="grid grid-cols-2 gap-2 border-b border-line/60 p-3 md:grid-cols-4">
            <input
              className={inputCls}
              placeholder="Reference"
              value={filters.reference ?? ""}
              onChange={(e) => setFilters({ ...filters, reference: e.target.value })}
            />
            <select
              className={inputCls}
              value={filters.transaction_type ?? ""}
              onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value })}
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.location ?? ""}
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
            >
              <option value="">All locations</option>
              {LOCATIONS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
            <select
              className={inputCls}
              value={filters.fraud_status ?? ""}
              onChange={(e) => setFilters({ ...filters, fraud_status: e.target.value })}
            >
              <option value="">Any fraud status</option>
              <option value="normal">Normal</option>
              <option value="suspicious">Suspicious</option>
            </select>
            <input
              className={inputCls}
              placeholder="Min amount"
              value={filters.min_amount ?? ""}
              onChange={(e) => setFilters({ ...filters, min_amount: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Max amount"
              value={filters.max_amount ?? ""}
              onChange={(e) => setFilters({ ...filters, max_amount: e.target.value })}
            />
            <input
              type="date"
              className={inputCls}
              value={filters.start_date ?? ""}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
            />
            <input
              type="date"
              className={inputCls}
              value={filters.end_date ?? ""}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
            />
            <div className="col-span-2 flex gap-2 md:col-span-4">
              <button
                onClick={() => {
                  setPage(1);
                  setApplied(filters);
                }}
                className="rounded-md bg-panel px-3 py-1.5 text-[11px] text-ink ring-1 ring-inset ring-line transition-colors hover:bg-panel/60"
              >
                Apply filters
              </button>
              <button
                onClick={() => {
                  setFilters(emptyFilters);
                  setApplied(emptyFilters);
                  setPage(1);
                }}
                className="rounded-md px-3 py-1.5 text-[11px] text-mut transition-colors hover:text-ink"
              >
                Reset
              </button>
            </div>
          </div>

          {list.isLoading ? (
            <PanelLoading label="Loading transactions" />
          ) : list.isError ? (
            <PanelError message="Transactions could not be loaded." onRetry={() => void list.refetch()} />
          ) : list.data!.items.length === 0 ? (
            <PanelEmpty message="No transactions match the current filters." />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-line/50 text-[9px] uppercase tracking-[0.12em] text-faint">
                      <th className="px-4 py-2 text-left font-medium">Ref</th>
                      <th className="px-2 py-2 text-left font-medium">Type</th>
                      <th className="px-2 py-2 text-right font-medium">Amount</th>
                      <th className="px-2 py-2 text-left font-medium">Location</th>
                      <th className="px-2 py-2 text-left font-medium">Date</th>
                      <th className="px-2 py-2 text-left font-medium">Status</th>
                      <th className="px-4 py-2 text-left font-medium">Fraud</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data!.items.map((t) => (
                      <tr key={t.id} className="border-b border-line/40 last:border-0 hover:bg-panel/50">
                        <td className="px-4 py-2.5 text-mut">{t.transaction_reference}</td>
                        <td className="px-2 py-2.5 text-mut">{t.transaction_type}</td>
                        <td className="px-2 py-2.5 text-right">{formatCurrency(t.amount)}</td>
                        <td className="px-2 py-2.5 text-ink">{t.location}</td>
                        <td className="px-2 py-2.5 text-faint">{formatDateTime(t.transaction_date)}</td>
                        <td className="px-2 py-2.5">
                          <StatusPill status={t.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusPill status={t.fraud_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
      </section>
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-md bg-panel px-2.5 py-1.5 text-[12px] text-ink ring-1 ring-inset ring-line outline-none transition-colors focus:ring-alarm/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      {children}
    </label>
  );
}
