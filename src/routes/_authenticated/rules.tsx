import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Panel, PanelLoading } from "@/components/ui-states";
import { analysisApi } from "@/lib/api/services";
import { formatCurrency, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rules")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Rules Configuration — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Inspect the rule-based fraud detection thresholds applied to every recorded transaction, including amount, frequency and location rules.",
      },
      { property: "og:title", content: "Rules Configuration — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Fraud detection thresholds applied to every recorded transaction.",
      },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const rules = useQuery({ queryKey: ["analysis", "rules"], queryFn: () => analysisApi.rules() });
  const fraud = useQuery({ queryKey: ["analysis", "fraud"], queryFn: () => analysisApi.fraud() });

  const counts = new Map(fraud.data?.by_rule.map((r) => [r.rule_name, r.count]) ?? []);

  return (
    <AppShell title="Rules Configuration" subtitle="Detection thresholds applied by the rule engine">
      <Panel title="Active Rules" subtitle="Every transaction is evaluated against each rule at the point of entry">
        {rules.isLoading || !rules.data ? (
          <PanelLoading label="Loading rule configuration" />
        ) : (
          <div className="divide-y divide-line/40">
            <RuleRow
              name="High transaction amount"
              description={`Any transaction of more than ${formatCurrency(rules.data.amountThreshold)} is flagged for review.`}
              setting={formatCurrency(rules.data.amountThreshold)}
              triggered={counts.get("High transaction amount")}
            />
            <RuleRow
              name="High transaction frequency"
              description={`More than ${rules.data.frequencyLimit} transactions on the same card within ${rules.data.frequencyWindowMinutes} minutes is flagged.`}
              setting={`${rules.data.frequencyLimit} / ${rules.data.frequencyWindowMinutes} min`}
              triggered={counts.get("High transaction frequency")}
            />
            <RuleRow
              name="Unusual location"
              description="A transaction from a location the card has not previously used is flagged."
              setting="Card history"
              triggered={counts.get("Unusual location")}
            />
          </div>
        )}
      </Panel>

      <Panel title="How Detection Works" subtitle="Recording, monitoring, detection, alerting, analysis">
        <ol className="space-y-3 p-4 text-[12px] text-mut">
          {[
            "A transaction is recorded manually or by simulation and stored with its reference, card, amount, type, location and time.",
            "The rule engine evaluates the transaction against every active rule immediately, on the server.",
            "If no rule is triggered the transaction is marked normal and processed.",
            "If one or more rules are triggered the transaction is marked suspicious and a fraud alert is generated with the reason and each rule name.",
            "Alerts move through New, Under Review, Reviewed and Resolved as analysts work the queue.",
            "All outcomes feed the analysis dashboards and the generated reports.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-panel text-[10px] text-ink ring-1 ring-inset ring-line">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="text-[10px] text-faint">
        Thresholds are defined by the detection service and shown here for reference. Editing them requires
        administrator access to the rule engine configuration.
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
  triggered: number | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-52 flex-1">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-clear" />
          <span className="font-display text-[13px] font-semibold text-ink">{name}</span>
        </div>
        <div className="mt-1 text-[11.5px] text-mut">{description}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-[0.14em] text-faint">Threshold</div>
        <div className="mt-1 text-[12px] text-ink">{setting}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-[0.14em] text-faint">Alerts raised</div>
        <div className="mt-1 text-[12px] text-alarm">{formatNumber(triggered ?? 0)}</div>
      </div>
    </div>
  );
}
