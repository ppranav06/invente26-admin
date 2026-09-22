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
 <main className="flex min-h-screen items-center justify-center px-4 py-12">
  <div className="w-full max-w-sm">
  <div className="mb-8 text-center">
   <img src="/favicon.png" alt="" className="mx-auto mb-4 h-14 w-14" />
   <h1 className="text-2xl font-black tracking-tight text-slate-950">Create Account</h1>
   <p className="mt-1 text-sm text-slate-500">Register a new organizer account</p>
  </div>

  <div className="panel p-6">
   {success ? (
   <div className="space-y-4 text-center">
    <div className=" border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
    Account created successfully. You can now sign in.
    </div>
    <Link
    href="/login"
    className="inline-block w-full bg-indigo-600 px-4 py-3 text-sm font-bold text-white text-center transition hover:bg-indigo-700"
    >
    Go to Sign In
    </Link>
   </div>
   ) : (
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
     className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
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
     className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
     placeholder="At least 6 characters"
     autoComplete="new-password"
    />
    </div>
    <div>
    <label htmlFor="confirmPassword" className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
     Confirm Password
    </label>
    <input
     id="confirmPassword"
     type="password"
     required
     value={confirmPassword}
     onChange={(e) => setConfirmPassword(e.target.value)}
     className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
     placeholder="Repeat password"
     autoComplete="new-password"
    />
    </div>

    {error && (
    <div className=" border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
     {error}
    </div>
    )}

    <button
    type="submit"
    disabled={loading}
    className="w-full bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
    {loading ? "Creating account…" : "Create account"}
    </button>
   </form>
   )}

   <div className="mt-4 text-center">
   <Link href="/login" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
    Already have an account? Sign in
   </Link>
   </div>
  </div>
  </div>
 </main>
 );
}
