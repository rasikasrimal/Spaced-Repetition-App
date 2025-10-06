"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Bell,
  CalendarCheck,
  LayoutDashboard,
  LineChart,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { Topic } from "@/types/topic";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type AppRoute =
  | Route<"/">
  | Route<"/dashboard">
  | Route<"/today">
  | Route<"/timeline">
  | Route<"/subjects">;

type NavItem = {
  href: AppRoute;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/today" as AppRoute, label: "Today", icon: CalendarCheck },
  { href: "/dashboard" as AppRoute, label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline" as AppRoute, label: "Timeline", icon: LineChart },
  { href: "/subjects" as AppRoute, label: "Subjects", icon: BookOpen }
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
  const isActive = React.useCallback(
    (href: AppRoute) => {
      if (href === "/today") {
        return pathname === "/" || pathname === "/today" || pathname.startsWith("/today/");
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        title={item.label}
        role="link"
        data-active={active}
        className={cn(
          "nav-item group inline-flex w-full justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 md:w-auto",
          "hover:bg-accent/10 hover:text-accent dark:hover:bg-accent/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground data-[active=true]:shadow-[0_0_0_1px_var(--accent-color)]"
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:scale-110 group-hover:text-accent",
            "group-data-[active=true]:text-accent-foreground"
          )}
        />
        <span className="max-[480px]:hidden">{item.label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8 xl:px-10">
        <div className="flex items-center gap-3 text-fg">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">SR</span>
            <span className="hidden text-fg md:block">Spaced Repetition</span>
          </Link>
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <nav
            aria-label="Primary navigation"
            className="flex items-center justify-center gap-6 rounded-2xl border border-inverse/10 bg-card/70 p-2 shadow-sm backdrop-blur"
          >
            {navItems.map(renderNavItem)}
          </nav>
        </div>

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

      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 md:hidden"
      >
        <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border border-inverse/10 bg-card/80 p-2 shadow-sm shadow-black/5 backdrop-blur">
          {navItems.map((item) => (
            <div key={item.href} className="flex-1">
              {renderNavItem(item)}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
};
