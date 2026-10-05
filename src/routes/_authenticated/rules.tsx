import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import {
  Panel,
  PanelLoading,
  inputCls,
  primaryBtnCls,
} from "@/components/ui-states";
import { adminApi, analysisApi } from "@/lib/api/services";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/rules")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rules Configuration — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Review the transaction rules and spending-pattern checks used to identify suspicious activity.",
      },
      { property: "og:title", content: "Rules Configuration — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Transaction rules and spending-pattern checks.",
      },
    ],
  }),
  component: RulesPage,
});

const RULES = [
  {
    name: "High Transaction Amount",
    label: "High transaction amount",
    description: (amountThreshold: number) =>
      `Flags a transaction when its amount exceeds ${formatCurrency(amountThreshold)}.`,
    setting: (amountThreshold: number) => formatCurrency(amountThreshold),
  },
  {
    name: "High Transaction Frequency",
    label: "High transaction frequency",
    description: (amountThreshold: number, frequencyLimit: number, windowMinutes: number) =>
      `Flags a card when it reaches ${frequencyLimit} transactions within ${windowMinutes} minutes.`,
    setting: (_amountThreshold: number, frequencyLimit: number, windowMinutes: number) =>
      `${frequencyLimit} transactions / ${windowMinutes} min`,
  },
  {
    name: "Unusual Location",
    label: "Unusual location",
    description: () =>
      "Flags a transaction when its location differs from the card’s established location pattern.",
    setting: () => "Card history",
  },
  {
    name: "Unusual Spending Pattern",
    label: "Unusual spending pattern",
    description: () =>
      "After at least 5 previous transactions, flags an amount that is unusually high compared with the card’s spending history.",
    setting: () => "Median + 3× MAD",
  },
];

function RulesPage() {
  const rules = useQuery({
    queryKey: ["analysis", "rules"],
    queryFn: () => analysisApi.rules(),
  });
  const fraud = useQuery({
    queryKey: ["analysis", "fraud"],
    queryFn: () => analysisApi.fraud(),
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateThreshold = useMutation({
    mutationFn: adminApi.updateAmountThreshold,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["analysis", "rules"] });
    },
  });

  const counts = new Map(
    fraud.data?.by_rule.map((rule) => [rule.rule_name, rule.count]) ?? [],
  );
  const chartData = RULES.map((rule) => ({
    ...rule,
    count: counts.get(rule.name) ?? 0,
  }));
  const maxCount = Math.max(1, ...chartData.map((rule) => rule.count));

  return (
    <AppShell
      title="Rules Configuration"
      subtitle="Transaction rules and spending-pattern checks applied during evaluation"
    >
      <Panel
        title="Active Detection Checks"
        subtitle="The server evaluates each new transaction against these criteria."
      >
        {rules.isLoading || !rules.data ? (
          <PanelLoading label="Loading rule configuration" />
        ) : rules.isError ? (
          <div className="p-4 text-[12px] text-alarm">
            Rule configuration could not be loaded.
          </div>
        ) : (
          <div className="divide-y divide-line/40">
            {chartData.map((rule) => {
              const description = rule.description(
                rules.data.amountThreshold,
                rules.data.frequencyLimit,
                rules.data.frequencyWindowMinutes,
              );
              const setting = rule.setting(
                rules.data.amountThreshold,
                rules.data.frequencyLimit,
                rules.data.frequencyWindowMinutes,
              );

              return (
                <RuleRow
                  key={rule.name}
                  name={rule.label}
                  description={description}
                  setting={setting}
                  triggered={rule.count}
                />
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="Alerts by Detection Check"
        subtitle="Total alerts recorded for your account, grouped by the rule that triggered them."
      >
        {fraud.isLoading ? (
          <PanelLoading label="Loading alert counts" />
        ) : fraud.isError ? (
          <div className="p-4 text-[12px] text-alarm">
            Alert counts could not be loaded.
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {chartData.every((rule) => rule.count === 0) ? (
              <p className="text-[12px] text-mut">
                No rule-triggered alerts have been recorded yet.
              </p>
            ) : (
              chartData.map((rule) => (
                <div key={rule.name} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
                  <span className="truncate text-[11px] text-mut" title={rule.label}>
                    {rule.label}
                  </span>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-panel"
                    role="img"
                    aria-label={`${rule.label}: ${rule.count} alerts`}
                  >
                    <div
                      className="h-full rounded-full bg-alarm transition-[width]"
                      style={{ width: `${(rule.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-right text-[11px] text-ink">
                    {formatNumber(rule.count)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </Panel>

      {user?.role === "ADMIN" && rules.data ? (
        <Panel
          title="Amount Limit"
          subtitle="This organization-wide limit applies to future transactions."
        >
          <form
            className="flex flex-wrap items-end gap-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              updateThreshold.mutate(Number(form.get("threshold")));
            }}
          >
            <label className="min-w-56 flex-1 text-[10px] uppercase tracking-[0.14em] text-faint">
              Fixed amount limit (NGN)
              <input
                className={`${inputCls} mt-1`}
                name="threshold"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={rules.data.amountThreshold}
                required
              />
            </label>
            <button className={primaryBtnCls} disabled={updateThreshold.isPending}>
              {updateThreshold.isPending ? "Saving…" : "Save limit"}
            </button>
            {updateThreshold.isError ? (
              <p className="w-full text-[12px] text-alarm">
                {updateThreshold.error.message}
              </p>
            ) : null}
            {updateThreshold.isSuccess ? (
              <p className="w-full text-[12px] text-clear">
                Limit saved. New transactions will use it.
              </p>
            ) : null}
          </form>
        </Panel>
      ) : null}

      <Panel
        title="How Detection Works"
        subtitle="From transaction recording through alert investigation"
      >
        <ol className="space-y-3 p-4 text-[12px] text-mut">
          {[
            "A transaction is recorded manually or imported from a CSV file.",
            "The server applies the amount, frequency, and location rules, and compares the amount with the card’s spending history when enough history is available.",
            "If one or more checks are triggered, the transaction is marked suspicious and an alert is created with the reason and rule name.",
            "Analysts review the alert and update its status as they investigate.",
            "Transaction and alert outcomes feed the analysis dashboards and reports.",
          ].map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-panel text-[10px] text-ink ring-1 ring-inset ring-line">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="text-[10px] text-faint">
        The amount limit can be changed by an administrator. Frequency, location,
        and spending-pattern checks use their current detection-service settings.
      </div>
    </AppShell>
  );
}

function RuleRow({
  name,
  description,
  setting,
  triggered,
}: {
  name: string;
  description: string;
  setting: string;
  triggered: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-52 flex-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-clear" />
          <span className="font-display text-[13px] font-semibold text-ink">
            {name}
          </span>
        </div>
        <div className="mt-1 text-[11.5px] text-mut">{description}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-[0.14em] text-faint">
          Detection criteria
        </div>
        <div className="mt-1 text-[12px] text-ink">{setting}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-[0.14em] text-faint">
          Alerts raised
        </div>
        <div className="mt-1 text-[12px] text-alarm">{formatNumber(triggered)}</div>
      </div>
    </div>
  );
}