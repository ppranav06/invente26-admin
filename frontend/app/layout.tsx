import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AdminNavigation from "./components/admin-navigation";
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
  title: "Invente'26 Attendance Admin",
  description: "Scan tickets, mark attendance, and update ticket events.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AdminNavigation />
        {children}
      </body>
    </html>
  );
}
