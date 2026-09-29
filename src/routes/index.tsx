import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Vantage Fraud Console" },
      {
        name: "description",
        content:
          "Secure sign-in for the Vantage credit card fraud detection and transaction analysis console.",
      },
      { property: "og:title", content: "Sign in — Vantage Fraud Console" },
      {
        property: "og:description",
        content: "Secure sign-in for the Vantage fraud detection and transaction analysis console.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user, loading, expired, clearExpired } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError("");
    clearExpired();
    try {
      await login(email, password);
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Sign in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="rise w-full max-w-sm">
        <div className="rounded-lg bg-surface p-5 ring-1 ring-inset ring-line">
          <h1 className="font-display text-[16px] font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-[10px] text-faint">Corporate card monitoring</p>

          {expired ? (
            <div className="mt-4 rounded-md bg-warn/10 px-3 py-2 text-[11px] text-warn ring-1 ring-inset ring-warn/30">
              Your session expired after 30 minutes of inactivity. Please sign in again.
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
            <Field label="Email" error={errors.email}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-md bg-panel px-3 py-2 text-[12.5px] text-ink outline-none ring-1 ring-inset ring-line transition-shadow focus:ring-alarm/50"
              />
            </Field>
            <Field label="Password" error={errors.password}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-md bg-panel px-3 py-2 text-[12.5px] text-ink outline-none ring-1 ring-inset ring-line transition-shadow focus:ring-alarm/50"
              />
            </Field>

            {formError ? <div className="text-[11px] text-alarm">{formError}</div> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-alarm/90 py-2 text-[12px] font-medium text-bg transition-colors hover:bg-alarm disabled:opacity-60"
            >
              {submitting ? "Authenticating…" : "Sign in"}
            </button>
          </form>

         <div className="mt-4 border-t border-line/70 pt-3 text-center text-[10px] text-faint">
            Need an account?{" "}
            <Link
              to="/register"
              className="font-medium text-mut transition-colors hover:text-ink"
            >
              Create an analyst account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-faint">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[10.5px] text-alarm">{error}</span> : null}
    </label>
  );
}
