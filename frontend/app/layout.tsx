import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AdminNavigation from "./components/admin-navigation";
import { AuthProvider } from "./lib/authContext";
import AuthGuard from "./components/auth-guard";
import "./globals.css";

const geistSans = Geist({
 variable: "--font-geist-sans",
 subsets: ["latin"],
});

const geistMono = Geist_Mono({
 variable: "--font-geist-mono",
 subsets: ["latin"],
});

export const metadata: Metadata = {
 title: "Invente'26 Admin",
 description: "Scan tickets, mark attendance, and manage event operations.",
 icons: {
 icon: "/favicon.png",
 },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
 return (
 <html
  lang="en"
  className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
 >
  <body className="min-h-full flex flex-col">
  <AuthProvider>
   <AuthGuard>
   <AdminNavigation />
   {children}
   </AuthGuard>
  </AuthProvider>
  </body>
 </html>
 );
}
