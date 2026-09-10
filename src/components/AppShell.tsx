import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { analysisApi } from "@/lib/api/services";

const monitorLinks = [
  { to: "/dashboard", label: "Dashboard", alarm: false },
  { to: "/transactions", label: "Transactions", alarm: false },
  { to: "/alerts", label: "Alerts", alarm: true },
  { to: "/analysis", label: "Analysis", alarm: false },
  { to: "/reports", label: "Reports", alarm: false },
] as const;

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const { data: summary } = useQuery({
    queryKey: ["analysis", "summary", {}],
    queryFn: () => analysisApi.summary(),
    staleTime: 30_000,
  });

  const initials = (user?.full_name ?? "AO")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await logout();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-surface/60 md:flex">
          <div className="flex h-14 items-center gap-2.5 border-b border-line px-4">
            <div className="grid size-7 place-items-center rounded-md bg-panel ring-1 ring-inset ring-line">
              <span className="font-display font-bold leading-none text-ink">V</span>
            </div>
            <div className="leading-tight">
              <div className="font-display text-[13px] font-semibold tracking-tight">Vantage</div>
              <div className="text-[9px] uppercase tracking-[0.18em] text-faint">Fraud Console</div>
            </div>
            <span className="ml-auto size-1.5 animate-pulse rounded-full bg-alarm" />
          </div>

          <nav className="flex-1 p-2">
            <div className="px-2 py-2 text-[9px] uppercase tracking-[0.2em] text-faint">Monitor</div>
            {monitorLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] text-mut transition-colors hover:bg-panel/60 hover:text-ink"
                activeProps={{
                  className:
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] bg-gradient-to-r from-alarm/12 to-transparent text-ink ring-1 ring-inset ring-alarm/20",
                }}
              >
                <span className={`size-1.5 rounded-full ${item.alarm ? "bg-alarm" : "bg-faint"}`} />
                {item.label}
                {item.alarm && summary?.new_alerts ? (
                  <span className="ml-auto text-[10px] font-semibold text-alarm">
                    {summary.new_alerts}
                  </span>
                ) : null}
              </Link>
            ))}
            <div className="px-2 pt-4 pb-2 text-[9px] uppercase tracking-[0.2em] text-faint">System</div>
            <Link
              to="/rules"
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] text-mut transition-colors hover:bg-panel/60 hover:text-ink"
              activeProps={{
                className:
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] bg-gradient-to-r from-alarm/12 to-transparent text-ink ring-1 ring-inset ring-alarm/20",
              }}
            >
              <span className="size-1.5 rounded-full bg-faint" />
              Rules Config
            </Link>
          </nav>

          <div className="border-t border-line p-3">
            <div className="rounded-md bg-panel/70 p-2.5 ring-1 ring-inset ring-line">
              <div className="flex items-center gap-2 text-[10px] text-mut">
                <span className="size-1.5 animate-pulse rounded-full bg-clear" /> Rules engine online
              </div>
              <div className="mt-1 text-[9px] text-faint">Demonstration data only</div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-5 backdrop-blur">
            <div className="leading-tight">
              <div className="font-display text-[15px] font-semibold tracking-tight">{title}</div>
              <div className="text-[10px] text-faint">{subtitle}</div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 text-[11px] text-mut sm:flex">
                <span className="size-1.5 rounded-full bg-clear" /> Live
              </div>
              <div className="h-8 w-px bg-line" />
              <div className="text-right leading-tight">
                <div className="text-[12px]">{user?.full_name}</div>
                <div className="text-[10px] text-faint capitalize">{user?.role}</div>
              </div>
              <div className="grid size-8 place-items-center rounded-full bg-panel font-display text-[12px] font-semibold ring-1 ring-inset ring-line">
                {initials}
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-md bg-panel px-2.5 py-1.5 text-[11px] text-mut ring-1 ring-inset ring-line transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </header>

          <nav className="flex gap-1 overflow-x-auto border-b border-line px-3 py-2 md:hidden">
            {monitorLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11.5px] text-mut"
                activeProps={{
                  className:
                    "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11.5px] text-ink bg-panel ring-1 ring-inset ring-line",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="space-y-4 p-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
