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
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  | Route<"/subjects">
  | Route<"/settings">;

type NavItem = {
  href: AppRoute;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/today" as AppRoute, label: "Today", icon: CalendarCheck },
  { href: "/dashboard" as AppRoute, label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline" as AppRoute, label: "Timeline", icon: LineChart },
  { href: "/subjects" as AppRoute, label: "Subjects", icon: BookOpen },
  { href: "/settings" as AppRoute, label: "Settings", icon: Settings },
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

  const activeNavItem = React.useMemo(
    () => navItems.find((item) => isActive(item.href)),
    [isActive]
  );
  const ActiveIcon = activeNavItem?.icon ?? CalendarCheck;
  const activeLabel = activeNavItem?.label ?? "Today";

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <li key={item.href} className="flex">
        <Link
          href={item.href}
          aria-label={item.label}
          title={item.label}
          role="link"
          aria-current={active ? "page" : undefined}
          data-active={active}
          className={cn(
            "UnderlineNav-item group relative inline-flex items-center gap-2 px-2 py-3 text-sm font-medium text-muted-foreground/80 transition-colors duration-200",
            "before:pointer-events-none before:absolute before:inset-y-2 before:inset-x-1.5 before:rounded-md before:bg-accent/10 before:opacity-0 before:transition-opacity before:duration-200 before:ease-out before:content-['']",
            "after:pointer-events-none after:absolute after:bottom-0 after:left-1/2 after:h-[2px] after:w-full after:-translate-x-1/2 after:origin-center after:scale-x-0 after:bg-[var(--accent-color)] after:opacity-0 after:transition-transform after:duration-300 after:delay-150 after:ease-out after:content-[''] after:rounded-full",
            "hover:text-accent-foreground hover:before:opacity-100 hover:after:scale-x-100 hover:after:opacity-100",
            "focus-visible:text-accent-foreground focus-visible:before:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
            "data-[active=true]:text-accent-foreground data-[active=true]:before:opacity-100 data-[active=true]:before:bg-accent/15 data-[active=true]:after:scale-x-100 data-[active=true]:after:opacity-100"
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              "group-hover:scale-105 group-hover:text-accent-foreground group-data-[active=true]:text-accent-foreground"
            )}
          />
          <span className="max-[480px]:hidden">{item.label}</span>
          {item.href === ("/today" as AppRoute) && (
            <span className="ml-2 inline-flex min-h-[1.25rem] min-w-[1.5rem] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold tracking-wide text-accent-foreground shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:shadow-[0_1px_0_rgba(2,6,23,0.5)]">
              {due}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-bg/80 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.35)] backdrop-blur transition-colors dark:shadow-[0_12px_32px_-18px_rgba(2,6,23,0.6)]">
      <div className="relative mx-auto flex w-full max-w-[90rem] flex-col gap-3 px-4 pb-3 pt-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-6 md:pb-4 md:pt-4 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between gap-3 text-fg md:justify-start">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">SR</span>
            <span className="hidden text-fg md:block">Spaced Repetition</span>
          </Link>
          <div className="flex items-center gap-3 md:hidden">
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-2 rounded-full text-xs text-fg hover:bg-muted/60"
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

        <div className="hidden flex-1 items-center justify-center md:flex">
          <nav
            aria-label="Primary navigation"
            role="navigation"
            className="UnderlineNav relative flex justify-center border-b border-border/50 bg-card/70 backdrop-blur"
          >
            <ul className="UnderlineNav-body relative flex list-none items-center justify-center gap-4 px-2 text-sm sm:gap-6">
              {navItems.map(renderNavItem)}
            </ul>
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="items-center gap-2 rounded-full text-xs text-fg hover:bg-muted/60"
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

        <div className="md:hidden">
          <Select
            value={activeNavItem?.href ?? navItems[0].href}
            onValueChange={(value) => router.push(value as AppRoute)}
          >
            <SelectTrigger className="h-11 w-full items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/70 text-sm font-medium text-muted-foreground/90 backdrop-blur">
              <SelectValue aria-label={activeNavItem?.label ?? "Select a section"}>
                <span className="flex items-center gap-2">
                  <ActiveIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{activeLabel}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="center" className="min-w-[12rem]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const value = item.href;
                return (
                  <SelectItem key={item.href} value={value} data-active={isActive(item.href)}>
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.href === ("/today" as AppRoute) && (
                      <span className="ml-auto inline-flex min-h-[1.25rem] min-w-[1.5rem] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:shadow-[0_1px_0_rgba(2,6,23,0.5)]">
                        {due}
                      </span>
                    )}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};
