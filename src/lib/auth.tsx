import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authApi } from "./api/services";
import { setToken, getToken } from "./api/client";
import type { User } from "./api/types";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const LAST_ACTIVE_KEY = "vantage_last_active";

interface AuthState {
  user: User | null;
  loading: boolean;
  expired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearExpired: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const endSession = useCallback((wasExpired: boolean) => {
    setToken(null);
    window.localStorage.removeItem(LAST_ACTIVE_KEY);
    setUser(null);
    setExpired(wasExpired);
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!getToken()) {
        setLoading(false);
        return;
      }
      const last = Number(window.localStorage.getItem(LAST_ACTIVE_KEY) ?? 0);
      if (last && Date.now() - last > SESSION_TIMEOUT_MS) {
        endSession(true);
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        if (active) setUser(me);
      } catch {
        if (active) endSession(false);
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [endSession]);

  // Inactivity tracking
  useEffect(() => {
    if (!user) return;
    const touch = () => window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    touch();
    const events = ["mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    timer.current = setInterval(() => {
      const last = Number(window.localStorage.getItem(LAST_ACTIVE_KEY) ?? 0);
      if (Date.now() - last > SESSION_TIMEOUT_MS) endSession(true);
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      if (timer.current) clearInterval(timer.current);
    };
  }, [user, endSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token);
    window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
    setExpired(false);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* session ends locally regardless */
    }
    endSession(false);
  }, [endSession]);

  return (
    <AuthContext.Provider
      value={{ user, loading, expired, login, logout, clearExpired: () => setExpired(false) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
