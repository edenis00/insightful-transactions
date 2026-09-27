import type { ReactNode } from "react";

export function PanelLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-10 text-[11px] text-mut">
      <span className="size-1.5 animate-pulse rounded-full bg-clear" />
      {label}…
    </div>
  );
}

export function PanelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="text-[12px] text-alarm">{message}</div>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-panel px-3 py-1.5 text-[11px] text-ink ring-1 ring-inset ring-line transition-colors hover:bg-panel/60"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function PanelEmpty({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <div className="text-[12px] text-mut">{message}</div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rise rounded-lg bg-surface ring-1 ring-inset ring-line ${className}`}>
      {title ? (
        <div className="flex items-center justify-between border-b border-line/70 px-4 pt-4 pb-3">
          <div>
            <div className="font-display text-[14px] font-semibold tracking-tight">{title}</div>
            {subtitle ? <div className="text-[10px] text-faint">{subtitle}</div> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </div>
  );
}

const ALARM = ["Suspicious", "Flagged", "Blocked", "New", "Confirmed", "High"];
const WARN = ["Under Review", "Medium", "Reviewed"];
const CLEAR = ["Normal", "Resolved", "False Positive", "active", "Low"];

export function StatusPill({ status }: { status: string }) {
  const kind = ALARM.includes(status) ? "alarm" : WARN.includes(status) ? "warn" : CLEAR.includes(status) ? "clear" : "mut";
  const tone = {
    alarm: "bg-alarm/10 ring-alarm/30 text-alarm",
    warn: "bg-warn/15 ring-warn/30 text-warn",
    clear: "bg-clear/10 ring-clear/25 text-clear",
    mut: "bg-panel ring-line text-mut",
  }[kind];
  const dot = { alarm: "bg-alarm", warn: "bg-warn", clear: "bg-clear", mut: "bg-mut" }[kind];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] ring-1 ring-inset ${tone}`}>
      <span className={`size-1.5 rounded-full ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export const inputCls =
  "w-full rounded-md bg-panel px-2.5 py-1.5 text-[12px] text-ink outline-none ring-1 ring-inset ring-line focus:ring-alarm/40";
export const btnCls =
  "rounded-md bg-panel px-2.5 py-1.5 text-[11px] text-mut ring-1 ring-inset ring-line transition-colors hover:text-ink disabled:opacity-50";
export const primaryBtnCls =
  "rounded-md bg-alarm/90 px-3 py-1.5 text-[11.5px] font-medium text-bg transition-colors hover:bg-alarm disabled:opacity-60";

export function Stat({ label, value, hint, alarm }: { label: string; value: string; hint?: string | undefined; alarm?: boolean }) {
  return (
    <div className="rise rounded-lg bg-surface p-4 ring-1 ring-inset ring-line">
      <div className="text-[10px] uppercase tracking-[0.14em] text-faint">{label}</div>
      <div className={`mt-2 font-display text-[22px] font-semibold tracking-tight ${alarm ? "text-alarm" : ""}`}>{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-faint">{hint}</div> : null}
    </div>
  );
}

export function FormField({ label, error, children }: { label: string; error?: string | undefined; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[10.5px] text-alarm">{error}</span> : null}
    </label>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-line/60 px-4 py-3 text-[11px] text-mut">
      <span>Page {page} of {pages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className={btnCls}>Previous</button>
        <button disabled={page >= pages} onClick={() => onPage(page + 1)} className={btnCls}>Next</button>
      </div>
    </div>
  );
}

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th className={`whitespace-nowrap px-3 py-2 text-[9.5px] font-normal uppercase tracking-[0.14em] text-faint ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
export function Td({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={`whitespace-nowrap px-3 py-2 text-[11.5px] ${right ? "text-right" : ""} ${className}`}>{children}</td>;
}
