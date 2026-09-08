import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { Field } from "./index";

export const Route = createFileRoute("/register")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Register — Vantage Fraud Console" },
      {
        name: "description",
        content: "Create an analyst account for the Vantage fraud detection and transaction analysis console.",
      },
      { property: "og:title", content: "Register — Vantage Fraud Console" },
      { property: "og:description", content: "Create an analyst account for the Vantage fraud console." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (values.full_name.trim().length < 3) next["full_name"] = "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) next["email"] = "Enter a valid email address.";
    if (values.password.length < 6) next["password"] = "Password must be at least 6 characters.";
    if (values.password !== values.confirm) next["confirm"] = "Passwords do not match.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    setFormError("");
    try {
      await register(values.full_name.trim(), values.email, values.password);
      void navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-md bg-panel px-3 py-2 text-[12.5px] text-ink outline-none ring-1 ring-inset ring-line transition-shadow focus:ring-alarm/50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="rise w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md bg-panel ring-1 ring-inset ring-line">
            <span className="font-display font-bold leading-none text-ink">V</span>
          </div>
          <div className="leading-tight">
            <div className="font-display text-[15px] font-semibold tracking-tight">Vantage</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-faint">Fraud Console</div>
          </div>
        </div>

        <div className="rounded-lg bg-surface p-5 ring-1 ring-inset ring-line">
          <h1 className="font-display text-[16px] font-semibold tracking-tight">Register</h1>
          <p className="mt-1 text-[10px] text-faint">Analyst account request</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" noValidate>
            <Field label="Full name" error={errors["full_name"]}>
              <input value={values.full_name} onChange={set("full_name")} className={inputClass} />
            </Field>
            <Field label="Email" error={errors["email"]}>
              <input type="email" value={values.email} onChange={set("email")} className={inputClass} />
            </Field>
            <Field label="Password" error={errors["password"]}>
              <input type="password" value={values.password} onChange={set("password")} className={inputClass} />
            </Field>
            <Field label="Confirm password" error={errors["confirm"]}>
              <input type="password" value={values.confirm} onChange={set("confirm")} className={inputClass} />
            </Field>

            {formError ? <div className="text-[11px] text-alarm">{formError}</div> : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-alarm/90 py-2 text-[12px] font-medium text-bg transition-colors hover:bg-alarm disabled:opacity-60"
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="mt-4 border-t border-line/70 pt-3 text-[10px] text-faint">
            Already registered?{" "}
            <Link to="/" className="text-mut transition-colors hover:text-ink">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
