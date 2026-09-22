"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import Link from "next/link";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("auth/email-already-in-use")) {
          setError("An account with this email already exists.");
        } else if (msg.includes("auth/invalid-email")) {
          setError("Invalid email address.");
        } else if (msg.includes("auth/weak-password")) {
          setError("Password is too weak. Use at least 6 characters.");
        } else {
          setError(msg || "Signup failed. Please try again.");
        }
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF9]">
      {/* Top bar */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="" className="h-9 w-9" />
            <span className="text-sm font-black tracking-[0.2em] text-stone-900">INVENTE&apos;26</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-bold text-[#de8200] transition hover:text-[#a86000]"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 py-14">
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#de8200]">New account</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-stone-900">Create account</h1>
          <p className="mt-3 text-sm text-stone-500">Register a new organizer account to get started.</p>
        </div>

        <div className="w-full max-w-md border border-stone-200 bg-white p-7">
          {success ? (
            <div className="space-y-5 text-center">
              <div className="border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                Account created successfully. You can now sign in.
              </div>
              <Link
                href="/login"
                className="inline-block w-full bg-[#de8200] px-6 py-4 text-base font-bold text-white text-center transition hover:bg-[#c47200]"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
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
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#de8200] focus:bg-white focus:ring-4 focus:ring-[#fef0dc]"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#de8200] px-6 py-4 text-base font-bold text-white transition hover:bg-[#c47200] disabled:cursor-not-allowed disabled:bg-stone-300"
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          <div className="mt-5 text-center">
            <Link href="/login" className="text-xs font-medium text-[#de8200] hover:text-[#a86000]">
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
