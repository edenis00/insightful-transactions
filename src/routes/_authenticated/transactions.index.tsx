import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  Panel,
  PanelEmpty,
  PanelError,
  PanelLoading,
  Pager,
  StatusPill,
  Td,
  Th,
  inputCls,
  primaryBtnCls,
} from "@/components/ui-states";
import { transactionsApi, type TransactionQuery } from "@/lib/api/services";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/transactions/")({
  ssr: false,
  component: TransactionsPage,
});

const emptyFilters = {
  transaction_reference: "",
  transaction_type: "",
  location: "",
  fraud_status: "",
  min_amount: "",
  max_amount: "",
  start_date: "",
  end_date: "",
};

function TransactionsPage() {
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState<TransactionQuery>({});
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const list = useQuery({
    queryKey: ["transactions", applied, page, pageSize],
    queryFn: () =>
      transactionsApi.list({
        ...applied,
        page,
        page_size: pageSize,
      }),
  });

  function applyFilters() {
    setPage(1);
    setApplied({
      transaction_reference: filters.transaction_reference || undefined,
      transaction_type: filters.transaction_type || undefined,
      location: filters.location || undefined,
      fraud_status:
        filters.fraud_status === "normal" || filters.fraud_status === "suspicious"
          ? filters.fraud_status
          : undefined,
      min_amount: filters.min_amount ? Number(filters.min_amount) : undefined,
      max_amount: filters.max_amount ? Number(filters.max_amount) : undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date ? `${filters.end_date}T23:59:59` : undefined,
    });
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setApplied({});
    setPage(1);
  }

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell title="Transactions" subtitle="Recorded transaction activity">
      <Panel
        title="Transaction history"
        subtitle={`${formatNumber(total)} transactions match`}
        action={
          <Link to="/transactions/new" className={primaryBtnCls}>
            Record transaction
          </Link>
        }
      >
        <div className="grid gap-2 border-b border-line/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className={inputCls}
            placeholder="Transaction reference"
            value={filters.transaction_reference}
            onChange={(event) =>
              setFilters({ ...filters, transaction_reference: event.target.value })
            }
          />
          <input
            className={inputCls}
            placeholder="Transaction type"
            value={filters.transaction_type}
            onChange={(event) =>
              setFilters({ ...filters, transaction_type: event.target.value })
            }
          />
          <input
            className={inputCls}
            placeholder="Location"
            value={filters.location}
            onChange={(event) => setFilters({ ...filters, location: event.target.value })}
          />
          <select
            className={inputCls}
            value={filters.fraud_status}
            onChange={(event) => setFilters({ ...filters, fraud_status: event.target.value })}
          >
            <option value="">All fraud statuses</option>
            <option value="normal">Normal</option>
            <option value="suspicious">Suspicious</option>
          </select>
          <input
            className={inputCls}
            type="number"
            min="0"
            placeholder="Minimum amount"
            value={filters.min_amount}
            onChange={(event) => setFilters({ ...filters, min_amount: event.target.value })}
          />
          <input
            className={inputCls}
            type="number"
            min="0"
            placeholder="Maximum amount"
            value={filters.max_amount}
            onChange={(event) => setFilters({ ...filters, max_amount: event.target.value })}
          />
          <input
            className={inputCls}
            type="date"
            title="From date"
            value={filters.start_date}
            onChange={(event) => setFilters({ ...filters, start_date: event.target.value })}
          />
          <input
            className={inputCls}
            type="date"
            title="To date"
            value={filters.end_date}
            onChange={(event) => setFilters({ ...filters, end_date: event.target.value })}
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="button" className={primaryBtnCls} onClick={applyFilters}>
              Apply filters
            </button>
            <button type="button" className={inputCls} onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>

        {list.isLoading ? (
          <PanelLoading label="Loading transactions" />
        ) : list.isError ? (
          <PanelError
            message="Transactions could not be loaded."
            onRetry={() => void list.refetch()}
          />
        ) : list.data.items.length === 0 ? (
          <PanelEmpty message="No transactions match these filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Card reference</Th>
                    <Th>Type</Th>
                    <Th>Location</Th>
                    <Th right>Amount</Th>
                    <Th>Date</Th>
                    <Th>Fraud status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {list.data.items.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-panel/40">
                      <Td>{transaction.transaction_reference}</Td>
                      <Td className="text-mut">{transaction.card_reference}</Td>
                      <Td className="text-mut">{transaction.transaction_type}</Td>
                      <Td className="text-mut">{transaction.location}</Td>
                      <Td right>{formatCurrency(Number(transaction.amount))}</Td>
                      <Td className="text-faint">
                        {formatDateTime(transaction.transaction_date)}
                      </Td>
                      <Td>
                        <StatusPill status={transaction.fraud_status} />
                      </Td>
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