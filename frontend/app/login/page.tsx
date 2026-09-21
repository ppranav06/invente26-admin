"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { ApiError } from "@/app/lib/api";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        if (err.message.includes("auth/invalid-credential") || err.message.includes("auth/wrong-password") || err.message.includes("auth/user-not-found")) {
          setError("Invalid email or password.");
        } else if (err.message.includes("auth/too-many-requests")) {
          setError("Too many attempts. Please try again later.");
        } else {
          setError(err.message || "Login failed. Please try again.");
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Enter your email first to reset your password.");
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || "Could not send reset email.");
      } else {
        setError("Could not send reset email.");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-xl font-black text-white shadow-sm">
            I
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Invente&apos;26</h1>
          <p className="mt-1 text-sm text-slate-500">Organizer admin panel</p>
        </div>

        <div className="panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="admin@invente.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
                Password reset email sent. Check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
            >
              {resetLoading ? "Sending…" : resetSent ? "Reset email sent" : "Forgot password?"}
            </button>
          </div>

          <div className="mt-3 text-center">
            <Link href="/signup" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
