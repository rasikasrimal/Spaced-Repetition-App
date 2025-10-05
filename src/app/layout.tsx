import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/theme.css";
import "@/styles/globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/app-shell";

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
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-bg text-fg`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Toaster richColors position="top-right" />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
