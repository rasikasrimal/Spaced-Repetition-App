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
  Compass,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  | Route<"/explore">;

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
  { href: "/explore" as AppRoute, label: "Explore", icon: Compass },
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
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicatorStyle, setIndicatorStyle] = React.useState({ width: 0, left: 0, opacity: 0 });
  const [mobileOpen, setMobileOpen] = React.useState(false);

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

  const registerItemRef = React.useCallback(
    (href: AppRoute) => (node: HTMLAnchorElement | null) => {
      itemRefs.current[href] = node;
    },
    []
  );

  const updateIndicator = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const list = listRef.current;
    const currentHref = activeNavItem?.href;
    if (!list || !currentHref) {
      setIndicatorStyle((prev) => (prev.opacity === 0 ? prev : { width: 0, left: 0, opacity: 0 }));
      return;
    }
    const target = itemRefs.current[currentHref];
    if (!target) return;
    const listRect = list.getBoundingClientRect();
    const itemRect = target.getBoundingClientRect();
    setIndicatorStyle({
      width: itemRect.width,
      left: itemRect.left - listRect.left,
      opacity: 1,
    });
  }, [activeNavItem?.href]);

  React.useEffect(() => {
    updateIndicator();
  }, [pathname, updateIndicator]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => updateIndicator();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateIndicator]);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <li key={item.href} className="flex">
        <Link
          ref={registerItemRef(item.href)}
          href={item.href}
          aria-label={item.label}
          title={item.label}
          role="link"
          aria-current={active ? "page" : undefined}
          data-active={active}
          className={cn(
            "group relative inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground/80 transition-all duration-200 ease-out",
            "before:pointer-events-none before:absolute before:inset-x-2 before:inset-y-2 before:rounded-lg before:bg-accent/10 before:opacity-0 before:transition before:duration-200 before:ease-out before:content-['']",
            "hover:text-accent hover:before:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card",
            "data-[active=true]:font-semibold data-[active=true]:text-accent data-[active=true]:before:opacity-100"
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200 ease-out",
              "group-hover:-translate-y-0.5 group-hover:scale-110 group-hover:text-accent",
              "group-data-[active=true]:text-accent"
            )}
          />
          <span className="max-[520px]:hidden">{item.label}</span>
          {item.href === ("/today" as AppRoute) && (
            <span className="ml-2 inline-flex min-h-[1.25rem] min-w-[1.5rem] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold tracking-wide text-accent-foreground shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:shadow-[0_1px_0_rgba(2,6,23,0.5)]">
              {due}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const renderMobileNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          data-active={active}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground/80 transition-colors duration-200",
            "hover:bg-accent/10 hover:text-accent",
            "data-[active=true]:bg-accent/10 data-[active=true]:text-accent"
          )}
        >
          <Icon className="h-4 w-4 text-muted-foreground transition-transform group-hover:scale-110 group-hover:text-accent group-data-[active=true]:text-accent" aria-hidden="true" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.href === ("/today" as AppRoute) && (
            <span className="ml-auto inline-flex min-h-[1.25rem] min-w-[1.5rem] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">
              {due}
            </span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-muted/40 bg-card/80 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.45)] backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="relative mx-auto flex w-full max-w-[90rem] flex-col gap-3 px-4 pb-3 pt-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-6 md:pb-4 md:pt-4 lg:px-8 xl:px-10">
        <div className="flex items-center justify-between gap-3 text-fg md:justify-start">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">SR</span>
            <span className="hidden text-fg md:block">Spaced Repetition</span>
          </Link>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle size="sm" className="rounded-full" />
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
            <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Open navigation menu"
                  className="h-10 w-10 rounded-full border-muted/60 text-muted-foreground hover:bg-accent/10 hover:text-accent"
                >
                  {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 border border-muted/40 bg-card/95 p-2 shadow-xl">
                <nav aria-label="Mobile navigation" role="navigation" className="flex flex-col gap-2">
                  <ul className="flex flex-col gap-1">{navItems.map(renderMobileNavItem)}</ul>
                </nav>
              </PopoverContent>
            </Popover>
            <ProfileMenu />
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          <nav
            aria-label="Main"
            role="navigation"
            className="relative flex w-full justify-center border-b border-muted/40"
          >
            <ul
              ref={listRef}
              className="relative flex list-none items-center justify-center gap-2 px-2 py-1 text-sm sm:gap-4"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-0 h-[2px] rounded-full bg-[var(--accent-color)] transition-[width,transform,opacity] duration-300 ease-out"
                style={{
                  width: indicatorStyle.width,
                  transform: `translateX(${indicatorStyle.left}px)`,
                  opacity: indicatorStyle.opacity,
                }}
              />
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
      </div>
    </header>
  );
};
