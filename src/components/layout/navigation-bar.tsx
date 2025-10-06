"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Menu,
  Bell,
  CalendarCheck,
  CalendarCheck2,
  CalendarDays,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Settings
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { Topic } from "@/types/topic";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";

type AppRoute =
  | Route<"/">
  | Route<"/calendar">
  | Route<"/reviews">
  | Route<"/timeline">
  | Route<"/subjects">
  | Route<"/settings">
  | Route<"/today">;

type NavItem = {
  href: AppRoute;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/" as AppRoute, label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar" as AppRoute, label: "Calendar", icon: CalendarDays },
  { href: "/reviews" as AppRoute, label: "Reviews", icon: CalendarCheck2 },
  { href: "/timeline" as AppRoute, label: "Timeline", icon: LineChart },
  { href: "/subjects" as AppRoute, label: "Subjects", icon: NotebookPen },
  { href: "/settings" as AppRoute, label: "Settings", icon: Settings },
  { href: "/today" as AppRoute, label: "Today", icon: CalendarCheck }
];

const computeDueCounts = (topics: Topic[]) => {
  const now = Date.now();
  let due = 0;
  let upcoming = 0;
  for (const topic of topics) {
    const next = new Date(topic.nextReviewDate).getTime();
    if (next <= now) {
      due += 1;
    } else {
      upcoming += 1;
    }
  }
  return { due, upcoming };
};

export const NavigationBar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const topics = useTopicStore((state) => state.topics);
  const { due } = React.useMemo(() => computeDueCounts(topics), [topics]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-3 text-fg">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">SR</span>
            <span className="hidden text-fg md:block">Spaced Repetition</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-2 text-sm font-medium md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link inline-flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
                  isActive ? "active" : ""
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden items-center gap-2 rounded-full text-xs text-fg hover:bg-muted/60 md:inline-flex"
            onClick={() => router.push("/today" as AppRoute)}
          >
            <Bell className="h-3.5 w-3.5" />
            Study Today
            <span className="ml-1 inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
              {due}
            </span>
          </Button>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
};

