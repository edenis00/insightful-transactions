import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { FormField, Panel, StatusPill, inputCls, primaryBtnCls } from "@/components/ui-states";
import { cardsApi, transactionsApi } from "@/lib/api/services";
import { ApiError } from "@/lib/api/client";
import { formatCurrency, formatDateTime, toLocalInputValue } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/transactions/new")({
  ssr: false,
  component: NewTransaction,
});

const TYPES = ["Purchase", "Travel", "Fuel", "Accommodation", "Subscription", "Supplies"];
const LOCATIONS = ["Adamawa", "Jos", "Gombe", "Lagos", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Kaduna"];

function makeReference() {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  row.push(field.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);

  return rows;
}

function NewTransaction() {
  const queryClient = useQueryClient();
  const cards = useQuery({
    queryKey: ["cards"],
    queryFn: () => cardsApi.list(),
  });

  const [cardId, setCardId] = useState("");
  const [reference, setReference] = useState(makeReference());
  const [amount, setAmount] = useState("");
  const [type, setType] = useState(TYPES[0]!);
  const [location, setLocation] = useState(LOCATIONS[0]!);
  const [date, setDate] = useState(toLocalInputValue(new Date()));
  const [error, setError] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    imported: number;
    failed: number;
    errors: string[];
  } | null>(null);

  async function uploadCsv() {
  if (!uploadFile) return;

  setUploading(true);
  setUploadSummary(null);

  try {
    const rows = parseCsv((await uploadFile.text()).replace(/^\uFEFF/, ""));
    if (rows.length < 2) throw new Error("The CSV has no transaction rows.");

    const headers = rows[0]!.map((value) => value.trim().toLowerCase());
    const required = [
      "transaction_reference",
      "card_reference",
      "amount",
      "transaction_type",
      "location",
      "transaction_date",
    ];
    const missing = required.filter((header) => !headers.includes(header));
    if (missing.length) {
      throw new Error(`Missing CSV columns: ${missing.join(", ")}`);
    }

    if (rows.length - 1 > 500) {
      throw new Error("Upload up to 500 transactions at a time.");
    }

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]!;
      const values = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
      const rowNumber = i + 1;
      const amount = Number(values.amount);
      const transactionDate = new Date(values.transaction_date);

      if (!values.transaction_reference || !values.card_reference || !values.transaction_type || !values.location) {
        errors.push(`Row ${rowNumber}: one or more required values are blank.`);
        continue;
      }
      if (!(amount > 0)) {
        errors.push(`Row ${rowNumber}: amount must be greater than zero.`);
        continue;
      }
      if (Number.isNaN(transactionDate.getTime())) {
        errors.push(`Row ${rowNumber}: transaction_date is not a valid date.`);
        continue;
      }

      try {
        await transactionsApi.create({
          transaction_reference: values.transaction_reference,
          card_reference: values.card_reference,
          amount,
          transaction_type: values.transaction_type,
          location: values.location,
          transaction_date: transactionDate.toISOString(),
        });
        imported++;
      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : "Import failed."}`);
      }
    }

    setUploadSummary({ imported, failed: errors.length, errors });
    if (imported > 0) {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["analysis"] });
    }
  } catch (error) {
    setUploadSummary({
      imported: 0,
      failed: 1,
      errors: [error instanceof Error ? error.message : "Could not read the CSV file."],
    });
  } finally {
    setUploading(false);
  }
}

  const create = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["alerts"] });
      void queryClient.invalidateQueries({ queryKey: ["analysis"] });
      setError("");
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "The transaction could not be recorded.");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const card = cards.data?.find((item) => String(item.id) === cardId);
    if (!card) {
      setError("Select a card.");
      return;
    }
    if (!reference.trim() || !amount || Number(amount) <= 0 || !date) {
      setError("Enter a reference, a positive amount, and a date.");
      return;
    }

    create.mutate({
      transaction_reference: reference.trim(),
      card_reference: card.card_reference,
      amount: Number(amount),
      transaction_type: type,
      location,
      transaction_date: new Date(date).toISOString(),
    });
  }

  const result = create.data;

  return (
    <AppShell title="Record Transaction" subtitle="Submit a transaction for fraud evaluation">
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel title="Transaction details" className="lg:col-span-3">
          <form onSubmit={submit} className="grid gap-3 p-4 sm:grid-cols-2">
            <FormField label="Card">
              <select
                className={inputCls}
                value={cardId}
                onChange={(event) => setCardId(event.target.value)}
                required
              >
                <option value="">Select card</option>
                {cards.data?.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.masked_card_number} ({card.card_reference})
                  </option>
                ))}
              </select>
              {cards.isError ? (
                <span className="mt-1 block text-[10px] text-alarm">Cards could not be loaded.</span>
              ) : null}
            </FormField>

            <FormField label="Transaction reference">
              <input
                className={inputCls}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                required
              />
            </FormField>

            <FormField label="Amount (NGN)">
              <input
                className={inputCls}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </FormField>

            <FormField label="Type">
              <select className={inputCls} value={type} onChange={(event) => setType(event.target.value)}>
                {TYPES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormField>

            <FormField label="Location">
              <select
                className={inputCls}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              >
                {LOCATIONS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormField>

            <FormField label="Date and time">
              <input
                className={inputCls}
                type="datetime-local"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </FormField>

            {error ? <div className="text-[11px] text-alarm sm:col-span-2">{error}</div> : null}

            <button className={primaryBtnCls} disabled={create.isPending || cards.isLoading}>
              {create.isPending ? "Recording…" : "Record and evaluate"}
            </button>
          </form>
        </Panel>

        <Panel title="Upload transactions" subtitle="CSV file · up to 500 rows">
          <div className="space-y-3 p-4 text-[11px]">
            <p className="text-mut">
              Required columns: transaction_reference, card_reference, amount,
              transaction_type, location, transaction_date.
            </p>

            <p className="text-faint">
              Use a masked card number or internal card reference. Dates should be ISO
              format, for example 2026-09-29T10:30:00Z.
            </p>

            <input
              className={inputCls}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              className={primaryBtnCls}
              disabled={!uploadFile || uploading}
              onClick={() => void uploadCsv()}
            >
              {uploading ? "Uploading…" : "Upload CSV"}
            </button>

            {uploadSummary ? (
              <div>
                <div>
                  Imported {uploadSummary.imported}; failed {uploadSummary.failed}.
                </div>
                {uploadSummary.errors.map((message, index) => (
                  <div key={`${index}-${message}`} className="mt-1 text-alarm">
                    {message}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Panel>

        <Panel title="Evaluation result" subtitle="Fraud checks run when the backend records the transaction" className="lg:col-span-2">
          {!result ? (
            <div className="p-4 text-[11px] text-mut">Submit a transaction to see the result.</div>
          ) : (
            <div className="space-y-2 p-4 text-[11px]">
              <div className="flex items-center justify-between">
                <span>{result.transaction.transaction_reference}</span>
                <StatusPill status={result.transaction.fraud_status} />
              </div>
              <div>{formatCurrency(result.transaction.amount)}</div>
              <div className="text-mut">
                {result.transaction.card_reference} · {result.transaction.location} ·{" "}
                {formatDateTime(result.transaction.transaction_date)}
              </div>
              {result.triggered_rules.length ? (
                <div className="text-alarm">Triggered: {result.triggered_rules.join(", ")}</div>
              ) : (
                <div className="text-clear">No fraud rules were triggered.</div>
              )}
              {result.alert_ids.length ? (
                <div className="text-mut">Created alert IDs: {result.alert_ids.join(", ")}</div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}