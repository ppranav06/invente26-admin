"use client";

import { useAuth } from "@/app/lib/authContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
 const { user, loading } = useAuth();
 const pathname = usePathname();
 const router = useRouter();

 const isPublic = PUBLIC_PATHS.includes(pathname);

 useEffect(() => {
 if (!loading && !user && !isPublic) {
  router.replace(`/login?from=${encodeURIComponent(pathname)}`);
 }
 }, [loading, user, isPublic, pathname, router]);

 if (loading) {
 return (
  <div className="grid min-h-screen place-items-center">
  <div className="text-center">
   <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
   <p className="text-sm font-medium text-slate-500">Loading…</p>
  </div>
  </div>
 );
 }

 if (!user && !isPublic) {
 return null;
 }

 return <>{children}</>;
}
