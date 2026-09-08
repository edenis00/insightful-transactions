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

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "suspicious" || status === "New"
      ? "bg-alarm/10 ring-alarm/30 text-alarm"
      : status === "Under Review" || status === "pending"
        ? "bg-warn/15 ring-warn/30 text-warn"
        : status === "normal" || status === "Resolved" || status === "processed"
          ? "bg-clear/10 ring-clear/25 text-clear"
          : "bg-panel ring-line text-mut";
  const dot =
    status === "suspicious" || status === "New"
      ? "bg-alarm"
      : status === "Under Review" || status === "pending"
        ? "bg-warn"
        : status === "normal" || status === "Resolved" || status === "processed"
          ? "bg-clear"
          : "bg-mut";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] ring-1 ring-inset ${tone}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
