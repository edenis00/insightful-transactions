import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { FormField, Panel, StatusPill, btnCls, inputCls, primaryBtnCls } from "@/components/ui-states";
import { cardsApi, transactionsApi, usersApi } from "@/lib/api/services";
import type { TransactionResult } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime, toLocalInputValue } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/transactions/new")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Record Transaction — Vantage Card Monitoring" },
      { name: "description", content: "Enter a simulated corporate card transaction and see which detection rules it triggers." },
      { property: "og:title", content: "Record Transaction — Vantage Card Monitoring" },
      { property: "og:description", content: "Enter a simulated card transaction and run the detection rules." },
    ],
  }),
  component: NewTransaction,
});

const TYPES = ["Purchase", "Travel", "Fuel", "Accommodation", "Subscription", "Supplies", "Cash Withdrawal"];
const LOCATIONS = ["Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Kaduna", "Benin City"];

function NewTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const staff = user?.role !== "CARD_USER";
  const cards = useQuery({ queryKey: ["cards", { status: "active" }], queryFn: () => cardsApi.list({ status: "active" }) });
  const users = useQuery({ queryKey: ["users", {}], queryFn: () => usersApi.list(), enabled: staff });
  const [v, setV] = useState({
    card_id: "", user_id: "", amount: "", merchant: "", location: "Lagos",
    transaction_type: "Purchase", transaction_time: toLocalInputValue(new Date()), description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TransactionResult[] | null>(null);
  const [error, setError] = useState("");

  const invalidate = () => {
    for (const k of ["transactions", "alerts", "analysis", "cards"]) void qc.invalidateQueries({ queryKey: [k] });
  };
  const create = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: (r) => { setResult([r]); invalidate(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : "The transaction could not be recorded."),
  });
  const simulate = useMutation({
    mutationFn: transactionsApi.simulateBatch,
    onSuccess: (r) => { setResult(r); invalidate(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Simulation failed."),
  });

  const selectedCard = cards.data?.find((c) => String(c.id) === v.card_id);
  const set = (k: keyof typeof v, val: string) => {
    setV((o) => {
      const next = { ...o, [k]: val };
      if (k === "card_id") {
        const c = cards.data?.find((x) => String(x.id) === val);
        next.user_id = c?.assigned_user_id ? String(c.assigned_user_id) : staff ? "" : String(user?.id ?? "");
      }
      return next;
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!v.card_id) err.card_id = "Select a card.";
    const uid = staff ? v.user_id : String(user?.id ?? "");
    if (!uid) err.user_id = "Select the user who made the transaction.";
    if (!(Number(v.amount) > 0)) err.amount = "Amount must be greater than zero.";
    if (!v.merchant.trim()) err.merchant = "Merchant is required.";
    if (!v.transaction_time) err.transaction_time = "Time is required.";
    setErrors(err);
    setError("");
    if (Object.keys(err).length) return;
    create.mutate({
      card_id: Number(v.card_id), user_id: Number(uid), amount: Number(v.amount), merchant: v.merchant.trim(),
      location: v.location, transaction_type: v.transaction_type,
      transaction_time: new Date(v.transaction_time).toISOString(), description: v.description.trim(),
    });
  };

  return (
    <AppShell title="Record Transaction" subtitle="Simulated entry · rules are evaluated on submission">
      <section className="grid gap-4 lg:grid-cols-5">
        <Panel title="Transaction details" subtitle="Card, user, amount, time and place are captured for accountability" className="lg:col-span-3">
          <form onSubmit={submit} className="grid gap-3 p-4 sm:grid-cols-2" noValidate>
            <FormField label="Card" error={errors.card_id}>
              <select className={inputCls} value={v.card_id} onChange={(e) => set("card_id", e.target.value)}>
                <option value="">Select card</option>
                {cards.data?.map((c) => <option key={c.id} value={c.id}>{c.masked_card_number} · {c.department_name}</option>)}
              </select>
            </FormField>
            {staff ? (
              <FormField label="Used by" error={errors.user_id}>
                <select className={inputCls} value={v.user_id} onChange={(e) => set("user_id", e.target.value)}>
                  <option value="">Select user</option>
                  {users.data?.filter((u) => u.status === "active").map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.employee_id}){selectedCard?.assigned_user_id === u.id ? " · card holder" : ""}</option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="Used by"><input className={inputCls} value={user?.full_name ?? ""} disabled /></FormField>
            )}
            <FormField label="Amount (₦)" error={errors.amount}>
              <input className={inputCls} type="number" min="1" value={v.amount} onChange={(e) => set("amount", e.target.value)} />
            </FormField>
            <FormField label="Merchant" error={errors.merchant}>
              <input className={inputCls} value={v.merchant} onChange={(e) => set("merchant", e.target.value)} />
            </FormField>
            <FormField label="Location">
              <select className={inputCls} value={v.location} onChange={(e) => set("location", e.target.value)}>
                {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Type">
              <select className={inputCls} value={v.transaction_type} onChange={(e) => set("transaction_type", e.target.value)}>
                {TYPES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Date and time" error={errors.transaction_time}>
              <input className={inputCls} type="datetime-local" value={v.transaction_time} onChange={(e) => set("transaction_time", e.target.value)} />
            </FormField>
            <FormField label="Description">
              <input className={inputCls} value={v.description} onChange={(e) => set("description", e.target.value)} />
            </FormField>
            {selectedCard ? (
              <div className="text-[10.5px] text-mut sm:col-span-2">
                Card holder: {selectedCard.assigned_user_name ?? "unassigned"} · Department: {selectedCard.department_name}
              </div>
            ) : null}
            {error ? <div className="text-[11px] text-alarm sm:col-span-2">{error}</div> : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button className={primaryBtnCls} disabled={create.isPending}>{create.isPending ? "Recording…" : "Record and evaluate"}</button>
            </div>
          </form>
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          {staff ? (
            <Panel title="Simulation engine" subtitle="Generate scenario batches">
              <div className="space-y-2 p-4 text-[11px] text-mut">
                <p>Normal batch: routine purchases across departments. Suspicious scenario: ₦45,000 in Abuja, then ₦850,000 in Lagos and ₦700,000 in Kano minutes apart on one card.</p>
                <div className="flex gap-2">
                  <button className={btnCls} disabled={simulate.isPending} onClick={() => simulate.mutate("normal")}>Normal batch</button>
                  <button className={btnCls} disabled={simulate.isPending} onClick={() => simulate.mutate("suspicious")}>Suspicious scenario</button>
                </div>
              </div>
            </Panel>
          ) : null}
          <Panel title="Evaluation result" subtitle="Returned by the detection rules">
            <div className="divide-y divide-line/40">
              {!result ? <div className="p-4 text-[11px] text-mut">Submit a transaction to see the outcome.</div> : result.map((r) => (
                <div key={r.transaction.id} className="p-4">
                  <div className="flex items-center gap-2">
                    <Link to="/transactions/$id" params={{ id: String(r.transaction.id) }} className="text-[12px] text-ink hover:underline">{r.transaction.transaction_reference}</Link>
                    <StatusPill status={r.transaction.status} />
                    <span className="ml-auto text-[11px]">{formatCurrency(r.transaction.amount)}</span>
                  </div>
                  <div className="mt-1 text-[10.5px] text-faint">{r.transaction.masked_card_number} · {r.transaction.user_name} · {r.transaction.location} · {formatDateTime(r.transaction.transaction_time)}</div>
                  {r.alert_generated ? (
                    <div className="mt-2 space-y-1">
                      {r.alerts.map((a) => (
                        <div key={a.id} className="rounded bg-alarm/10 px-2 py-1 text-[10.5px] text-alarm ring-1 ring-inset ring-alarm/20">
                          {a.alert_reference} · {a.rule_name} ({a.severity}) — {a.reason}
                        </div>
                      ))}
                    </div>
                  ) : <div className="mt-2 text-[10.5px] text-clear">No rules triggered. Recorded as normal.</div>}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </AppShell>
  );
}
