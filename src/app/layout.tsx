import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/theme.css";
import "@/styles/globals.css";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeManager } from "@/components/theme-manager";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Spaced Repetition",
  description: "Local spaced repetition dashboard"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} dark min-h-screen antialiased`}>
        <ThemeManager />
        <Toaster richColors position="top-right" />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
