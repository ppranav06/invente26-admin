"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/app/lib/authContext";
import {
 listAdminUsers,
 createAdminUser,
 updateAdminUser,
 deleteAdminUser,
 ApiError,
 type AdminUserType,
} from "@/app/lib/api";

const ROLES = ["master_admin", "super_admin", "dept_admin", "event_admin", "volunteer"];

function roleLabel(role: string): string {
 const labels: Record<string, string> = {
 master_admin: "Master Admin",
 super_admin: "Super Admin",
 dept_admin: "Dept Admin",
 event_admin: "Event Admin",
 volunteer: "Volunteer",
 };
 return labels[role] || role;
}

function roleBadgeClass(role: string): string {
 const classes: Record<string, string> = {
 master_admin: "bg-purple-50 text-purple-700",
 super_admin: "bg-indigo-50 text-indigo-700",
 dept_admin: "bg-blue-50 text-blue-700",
 event_admin: "bg-amber-50 text-amber-700",
 volunteer: "bg-slate-100 text-slate-600",
 };
 return classes[role] || "bg-slate-100 text-slate-600";
}

export default function AdminUsersPage() {
 const { user } = useAuth();
 const [users, setUsers] = useState<AdminUserType[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [showModal, setShowModal] = useState(false);
 const [editingUser, setEditingUser] = useState<AdminUserType | null>(null);
 const [form, setForm] = useState({ email: "", role: "volunteer", event_id: "", dept_name: "" });
 const [saving, setSaving] = useState(false);
 const [formError, setFormError] = useState<string | null>(null);
 const [createdResetLink, setCreatedResetLink] = useState<string | null>(null);

 useEffect(() => {
 if (user?.role !== "master_admin") return;
 let cancelled = false;

 async function load() {
  setLoading(true);
  setError(null);
  try {
  const data = await listAdminUsers();
  if (!cancelled) setUsers(data.rows);
  } catch (err) {
  if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load users.");
  } finally {
  if (!cancelled) setLoading(false);
  }
 }

 void load();
 return () => { cancelled = true; };
 }, [user]);

 const reloadUsers = useCallback(async () => {
 setLoading(true);
 setError(null);
 try {
  const data = await listAdminUsers();
  setUsers(data.rows);
 } catch (err) {
  setError(err instanceof ApiError ? err.message : "Failed to load users.");
 } finally {
  setLoading(false);
 }
 }, []);

 if (user?.role !== "master_admin") {
 return (
  <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div className="grid place-items-center py-24 text-center">
   <p className="text-sm font-medium text-slate-500">You do not have access to this page.</p>
  </div>
  </main>
 );
 }

 const openCreate = () => {
 setEditingUser(null);
 setForm({ email: "", role: "volunteer", event_id: "", dept_name: "" });
 setFormError(null);
 setCreatedResetLink(null);
 setShowModal(true);
 };

 const openEdit = (u: AdminUserType) => {
 setEditingUser(u);
 setForm({
  email: u.email,
  role: u.role,
  event_id: u.event_id || "",
  dept_name: u.dept_name || "",
 });
 setFormError(null);
 setCreatedResetLink(null);
 setShowModal(true);
 };

 const handleSave = async () => {
 setSaving(true);
 setFormError(null);
 try {
  if (editingUser) {
  const updateData: { role?: string; event_id?: string | null; dept_name?: string | null } = {};
  if (form.role !== editingUser.role) updateData.role = form.role;
  if (form.event_id !== (editingUser.event_id || "")) updateData.event_id = form.event_id || null;
  if (form.dept_name !== (editingUser.dept_name || "")) updateData.dept_name = form.dept_name || null;
  await updateAdminUser(editingUser.user_id, updateData);
  setShowModal(false);
  void reloadUsers();
  } else {
  if (!form.email.trim()) { setFormError("Email is required."); setSaving(false); return; }
  const result = await createAdminUser({
   email: form.email.trim(),
   role: form.role,
   event_id: form.event_id || undefined,
   dept_name: form.dept_name || undefined,
  });
  if (result.password_reset_link) {
   setCreatedResetLink(result.password_reset_link);
   setSaving(false);
   void reloadUsers();
  } else {
   setShowModal(false);
   void reloadUsers();
  }
  }
 } catch (err) {
  setFormError(err instanceof ApiError ? err.message : "Save failed.");
 } finally {
  if (!createdResetLink) setSaving(false);
 }
 };

 const handleDelete = async (u: AdminUserType) => {
 if (!confirm(`Remove ${u.email} from admin users?`)) return;
 try {
  await deleteAdminUser(u.user_id);
  void reloadUsers();
 } catch (err) {
  alert(err instanceof ApiError ? err.message : "Delete failed.");
 }
 };

 return (
 <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
   <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Admin Users</p>
   <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Manage Organizer Accounts</h1>
  </div>
  <button
   type="button"
   onClick={openCreate}
   className="self-start bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
  >
   Add user
  </button>
  </div>

  {loading && (
  <div className="grid place-items-center py-24">
   <div className="text-center">
   <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
   <p className="text-sm font-medium text-slate-500">Loading users…</p>
   </div>
  </div>
  )}

  {error && (
  <div className=" border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
   {error}
  </div>
  )}

  {!loading && !error && (
  <div className="overflow-hidden border border-slate-200 bg-white">
   <div className="overflow-x-auto">
   <table className="w-full text-left text-sm">
    <thead>
    <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
     <th className="px-5 py-3">Email</th>
     <th className="px-5 py-3">Role</th>
     <th className="px-5 py-3">Event ID</th>
     <th className="px-5 py-3">Dept</th>
     <th className="px-5 py-3">User ID</th>
     <th className="px-5 py-3" />
    </tr>
    </thead>
    <tbody>
    {users.length === 0 && (
     <tr>
     <td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">
      No admin users found.
     </td>
     </tr>
    )}
    {users.map((u) => (
     <tr key={u.user_id} className="border-b border-slate-50 last:border-0">
     <td className="px-5 py-3 font-medium text-slate-950">{u.email}</td>
     <td className="px-5 py-3">
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClass(u.role)}`}>
      {roleLabel(u.role)}
      </span>
     </td>
     <td className="px-5 py-3 font-mono text-xs text-slate-500">{u.event_id || "—"}</td>
     <td className="px-5 py-3 text-slate-600">{u.dept_name || "—"}</td>
     <td className="px-5 py-3 font-mono text-xs text-slate-400 max-w-[120px] truncate">{u.user_id}</td>
     <td className="px-5 py-3">
      <div className="flex gap-2">
      <button
       type="button"
       onClick={() => openEdit(u)}
       className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
      >
       Edit
      </button>
      <button
       type="button"
       onClick={() => void handleDelete(u)}
       className="text-xs font-semibold text-rose-600 hover:text-rose-800"
      >
       Delete
      </button>
      </div>
     </td>
     </tr>
    ))}
    </tbody>
   </table>
   </div>
  </div>
  )}

  {showModal && (
  <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
   <div className="w-full max-w-lg bg-white p-6 shadow-xl">
   <h2 className="mb-4 text-lg font-bold text-slate-950">
    {editingUser ? "Edit Admin User" : "Add Admin User"}
   </h2>

   {createdResetLink ? (
    <div className="space-y-4">
    <div className=" border border-emerald-200 bg-emerald-50 p-4">
     <p className="text-sm font-bold text-emerald-800">User created successfully</p>
     <p className="mt-1 text-sm text-emerald-700">
     Share this password-reset link with the user. They must click it to set their password before signing in.
     </p>
     <div className="mt-3">
     <input
      readOnly
      value={createdResetLink}
      className="w-full border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-slate-700"
      onClick={(e) => (e.target as HTMLInputElement).select()}
     />
     </div>
     <button
     type="button"
     onClick={() => {
      void navigator.clipboard.writeText(createdResetLink);
     }}
     className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
     >
     Copy link
     </button>
    </div>
    <div className="flex justify-end">
     <button
     type="button"
     onClick={() => { setShowModal(false); setCreatedResetLink(null); }}
     className=" bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
     >
     Done
     </button>
    </div>
    </div>
   ) : (
    <>
    <div className="space-y-4">
     {!editingUser && (
     <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Email</label>
      <input
      type="email"
      value={form.email}
      onChange={(e) => setForm({ ...form, email: e.target.value })}
      className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      placeholder="admin@example.com"
      />
      <p className="mt-1 text-xs text-slate-400">A Firebase account will be created and a password-reset email sent.</p>
     </div>
     )}
     <div>
     <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Role</label>
     <select
      value={form.role}
      onChange={(e) => setForm({ ...form, role: e.target.value })}
      className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
     >
      {ROLES.map((r) => (
      <option key={r} value={r}>{roleLabel(r)}</option>
      ))}
     </select>
     </div>
     {form.role === "event_admin" && (
     <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Event ID</label>
      <input
      value={form.event_id}
      onChange={(e) => setForm({ ...form, event_id: e.target.value })}
      className="w-full border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      placeholder="Event UUID"
      />
     </div>
     )}
     {form.role === "dept_admin" && (
     <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Department</label>
      <input
      value={form.dept_name}
      onChange={(e) => setForm({ ...form, dept_name: e.target.value })}
      className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      placeholder="Department name"
      />
     </div>
     )}

     {formError && (
     <div className=" border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
      {formError}
     </div>
     )}
    </div>

    <div className="mt-6 flex justify-end gap-3">
     <button
     type="button"
     onClick={() => setShowModal(false)}
     className=" border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
     >
     Cancel
     </button>
     <button
     type="button"
     onClick={handleSave}
     disabled={saving}
     className=" bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
     >
     {saving ? "Saving…" : editingUser ? "Save changes" : "Create user"}
     </button>
    </div>
    </>
   )}
   </div>
  </div>
  )}
 </main>
 );
}
