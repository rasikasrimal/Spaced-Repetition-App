"use client";

import * as React from "react";
import { NavigationBar } from "@/components/layout/navigation-bar";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-surface-foreground">
      <NavigationBar />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[90rem] px-4 pb-12 pt-6 md:px-6 lg:px-8 xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
};
