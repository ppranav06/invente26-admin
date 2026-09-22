"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { ApiError } from "@/app/lib/api";

function LogoIcon() {
 return <img src="/favicon.png" alt="" className="h-10 w-10" />;
}

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
 <main className="flex min-h-screen">
  {/* Left branding panel */}
  <div className="hidden w-1/2 bg-indigo-600 lg:flex lg:flex-col lg:items-center lg:justify-center">
  <div className="px-12 text-center">
   <div className="mb-6 inline-flex items-center gap-3">
   <LogoIcon />
   <span className="text-3xl font-extrabold tracking-tight text-white">INVENTE&apos;26</span>
   </div>
   <h2 className="mt-6 text-4xl font-extrabold leading-tight text-white">
   Attendance<br />Admin Panel
   </h2>
   <p className="mt-4 max-w-sm text-sm leading-relaxed text-indigo-200">
   Scan tickets, track registrations, and manage attendance for all
   Invente&apos;26 events from a single dashboard.
   </p>
   <div className="mt-10 grid grid-cols-3 gap-6">
   <div>
    <p className="text-2xl font-black text-white">90+</p>
    <p className="mt-1 text-xs font-medium text-indigo-300">Events</p>
   </div>
   <div>
    <p className="text-2xl font-black text-white">10</p>
    <p className="mt-1 text-xs font-medium text-indigo-300">Departments</p>
   </div>
   <div>
    <p className="text-2xl font-black text-white">2K+</p>
    <p className="mt-1 text-xs font-medium text-indigo-300">Participants</p>
   </div>
   </div>
  </div>
  </div>

  {/* Right login form */}
  <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
  <div className="w-full max-w-sm">
   {/* Mobile logo */}
   <div className="mb-8 flex items-center gap-3 lg:hidden">
   <LogoIcon />
   <span className="text-xl font-extrabold tracking-tight text-slate-950">
    INVENTE&apos;26
   </span>
   </div>

   <div className="mb-8">
   <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
    Sign in
   </h1>
   <p className="mt-2 text-sm text-slate-500">
    Enter your credentials to access the admin panel
   </p>
   </div>

   <form onSubmit={handleSubmit} className="space-y-4">
   <div>
    <label
    htmlFor="email"
    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
    >
    Email
    </label>
    <input
    id="email"
    type="email"
    required
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
    placeholder="admin@invente.com"
    autoComplete="email"
    />
   </div>
   <div>
    <label
    htmlFor="password"
    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
    >
    Password
    </label>
    <input
    id="password"
    type="password"
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
    placeholder="Enter password"
    autoComplete="current-password"
    />
   </div>

   {error && (
    <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
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
    className="w-full bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
   >
    {loading ? "Signing in…" : "Sign in"}
   </button>
   </form>

   <div className="mt-4 flex items-center justify-between">
   <button
    type="button"
    onClick={handleResetPassword}
    disabled={resetLoading}
    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 disabled:text-slate-400"
   >
    {resetLoading ? "Sending…" : resetSent ? "Reset email sent" : "Forgot password?"}
   </button>
   <Link href="/signup" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
    Create account
   </Link>
   </div>
  </div>
  </div>
 </main>
 );
}
