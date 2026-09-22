"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User as FirebaseUser } from "firebase/auth";
import { auth } from "./firebase";
import { apiLogin, apiLoginLocal, apiRefresh, apiLogout, getAccessToken, getRefreshToken, setTokens, clearTokens } from "./api";

export type AdminUser = {
  user_id: string;
  email: string;
  role: string;
  event_id: string | null;
  dept_name: string | null;
};

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_REFRESH_BUFFER_MS = 60_000;

function parseJwtExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefreshRef = useRef<(accessToken: string) => void>(() => {});

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(
    (accessToken: string) => {
      stopRefreshTimer();
      const expiry = parseJwtExpiry(accessToken);
      if (!expiry) return;
      const delay = Math.max(expiry - Date.now() - TOKEN_REFRESH_BUFFER_MS, 5_000);
      refreshTimerRef.current = setTimeout(async () => {
        try {
          const refreshToken = getRefreshToken();
          if (!refreshToken) return;
          const data = await apiRefresh(refreshToken);
          setTokens(data.access_token, refreshToken);
          scheduleRefreshRef.current(data.access_token);
        } catch {
          clearTokens();
          setUser(null);
        }
      }, delay);
    },
    [stopRefreshTimer],
  );

  useEffect(() => {
    scheduleRefreshRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  const fetchMe = useCallback(
    async (accessToken: string) => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "/organizers/api"}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("not authenticated");
      const data = await response.json();
      setUser(data.user);
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      // Try master admin local login first
      try {
        const data = await apiLoginLocal(email, password);
        setTokens(data.access_token, data.refresh_token);
        scheduleRefresh(data.access_token);
        setUser(data.user);
        return;
      } catch (localErr) {
        // If it's NOT a "MISSING_CREDENTIALS" or "LOCAL_LOGIN_DISABLED" error,
        // it means the credentials were wrong — still try Firebase as fallback.
        // Only skip Firebase if local login is disabled entirely.
        if (localErr instanceof Error && "code" in localErr && (localErr as { code?: string }).code === "LOCAL_LOGIN_DISABLED") {
          throw localErr;
        }
      }

      // Fall back to Firebase authentication
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const data = await apiLogin(idToken);
      setTokens(data.access_token, data.refresh_token);
      scheduleRefresh(data.access_token);
      setUser(data.user);
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();
      if (getAccessToken() && refreshToken) {
        await apiLogout(refreshToken);
      }
    } catch {
      // ignore logout errors
    }
    stopRefreshTimer();
    clearTokens();
    await firebaseSignOut(auth);
    setUser(null);
  }, [stopRefreshTimer]);

  const refreshUser = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) return;
    try {
      await fetchMe(accessToken);
    } catch {
      clearTokens();
      setUser(null);
    }
  }, [fetchMe]);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (cancelled) return;

      // Always try to restore from stored tokens first (works for both
      // Firebase and master-admin-local login, which has no Firebase user).
      const accessToken = getAccessToken();
      if (accessToken) {
        try {
          await fetchMe(accessToken);
          scheduleRefresh(accessToken);
          setLoading(false);
          return;
        } catch {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const data = await apiRefresh(refreshToken);
              setTokens(data.access_token, refreshToken);
              await fetchMe(data.access_token);
              scheduleRefresh(data.access_token);
              setLoading(false);
              return;
            } catch {
              // tokens invalid — fall through
            }
          }
        }
      }

      // If we have a Firebase user but no valid tokens, something went wrong.
      // If we have no Firebase user AND no valid tokens, the user is logged out.
      if (!firebaseUser) {
        clearTokens();
        stopRefreshTimer();
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      stopRefreshTimer();
    };
  }, [fetchMe, scheduleRefresh, stopRefreshTimer]);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
