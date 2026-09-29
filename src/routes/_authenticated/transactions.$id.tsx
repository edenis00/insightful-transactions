import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelError, PanelLoading, StatusPill } from "@/components/ui-states";
import { transactionsApi } from "@/lib/api/services";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/transactions/$id")({
  ssr: false,
  component: TransactionDetail,
});

function TransactionDetail() {
  const { id } = Route.useParams();
  const query = useQuery({
    queryKey: ["transactions", "detail", id],
    queryFn: () => transactionsApi.get(Number(id)),
  });

  if (query.isLoading) {
    return (
      <AppShell title="Transaction" subtitle="Loading transaction">
        <Panel><PanelLoading /></Panel>
      </AppShell>
    );
  }

  if (query.isError || !query.data) {
    return (
      <AppShell title="Transaction" subtitle="Transaction unavailable">
        <Panel>
          <PanelError message="This transaction could not be loaded." />
        </Panel>
      </AppShell>
    );
  }

  const transaction = query.data;

  return (
    <AppShell
      title={transaction.transaction_reference}
      subtitle="Transaction details and fraud evaluation"
    >
      <div className="mb-4">
        <Link to="/transactions" className="text-[11px] text-mut hover:text-ink">
          ← Back to transactions
        </Link>
      </div>

      <Panel title="Transaction details">
        <dl className="grid gap-4 p-4 sm:grid-cols-2">
          <div>
            <dt className="text-[10px] text-faint">Reference</dt>
            <dd className="text-[12px]">{transaction.transaction_reference}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Card reference</dt>
            <dd className="text-[12px]">{transaction.card_reference}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Amount</dt>
            <dd className="text-[12px]">{formatCurrency(Number(transaction.amount))}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Type</dt>
            <dd className="text-[12px]">{transaction.transaction_type}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Location</dt>
            <dd className="text-[12px]">{transaction.location}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Transaction date</dt>
            <dd className="text-[12px]">{formatDateTime(transaction.transaction_date)}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Processing status</dt>
            <dd><StatusPill status={transaction.status} /></dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Fraud status</dt>
            <dd><StatusPill status={transaction.fraud_status} /></dd>
          </div>
          <div>
            <dt className="text-[10px] text-faint">Recorded at</dt>
            <dd className="text-[12px]">{formatDateTime(transaction.created_at)}</dd>
          </div>
        </dl>
      </Panel>
    </AppShell>
  );
}