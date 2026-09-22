"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { ApiError } from "@/app/lib/api";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("from") || "/";
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
      router.push(redirectTo);
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
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAF9] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src="/invente-lgp.png" alt="Invente'26" className="mx-auto mb-5 h-24 w-auto" />
          <div className="mx-auto mb-5 h-px w-16 bg-stone-300" />
          <h1 className="text-2xl font-black tracking-tight text-stone-900">Sign in</h1>
          <p className="mt-1.5 text-sm text-stone-400">
            Invente&apos;26 attendance admin
          </p>
        </div>

        {/* Form card */}
        <div className="border border-stone-200 bg-white p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#de8200] focus:bg-white focus:ring-4 focus:ring-[#fef0dc]"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#de8200] focus:bg-white focus:ring-4 focus:ring-[#fef0dc]"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                {error}
              </div>
            )}

            {resetSent && (
              <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
                Password reset email sent. Check your inbox.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#de8200] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#c47200] disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="text-xs font-medium text-stone-400 transition hover:text-[#de8200] disabled:text-stone-300"
            >
              {resetLoading ? "Sending…" : resetSent ? "Reset email sent" : "Forgot password?"}
            </button>
            <Link
              href="/signup"
              className="text-xs font-medium text-stone-400 transition hover:text-[#de8200]"
            >
              Create account
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-stone-300">
          New here? Create an account first, then sign in with those credentials.
        </p>
      </div>
    </main>
  );
}
