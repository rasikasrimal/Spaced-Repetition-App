import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Spaced Repetition",
  description: "Local spaced repetition dashboard",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: "#7c3aed"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen bg-surface text-surface-foreground`}>
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}