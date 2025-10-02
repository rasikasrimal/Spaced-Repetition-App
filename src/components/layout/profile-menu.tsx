"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/stores/profile";
import { Bell, LogOut, Settings, User, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const avatarFallback = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0)!.toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
};

export const ProfileMenu: React.FC = () => {
  const router = useRouter();
  const profile = useProfileStore((state) => state.profile);
  const toggleNotification = useProfileStore((state) => state.toggleNotification);

  const emailClasses = cn(
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
    profile.notifications.email ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-zinc-400 hover:text-zinc-200"
  );

  const pushClasses = cn(
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
    profile.notifications.push ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-zinc-400 hover:text-zinc-200"
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-white shadow-sm transition hover:border-white/30"
          aria-label="Open profile menu"
        >
          {avatarFallback(profile.name)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-4 rounded-2xl border-white/10 bg-slate-900/90 p-4 text-sm text-zinc-200 shadow-xl" sideOffset={12}>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: profile.avatarColor }}
          >
            {avatarFallback(profile.name)}
          </span>
          <div>
            <p className="text-sm font-semibold text-white">{profile.name}</p>
            <p className="text-xs text-zinc-400">{profile.email}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-white/5 bg-white/5 p-3 text-xs text-zinc-300">
          <div className="flex items-center justify-between">
            <span>Timezone</span>
            <span className="font-medium text-white">{profile.timezone}</span>
          </div>
          <button type="button" onClick={() => toggleNotification("email")} className={emailClasses}>
            <span className="flex items-center gap-2"><Bell className="h-4 w-4" /> Email reminders</span>
            <span>{profile.notifications.email ? "On" : "Off"}</span>
          </button>
          <button type="button" onClick={() => toggleNotification("push")} className={pushClasses}>
            <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Push alerts</span>
            <span>{profile.notifications.push ? "On" : "Off"}</span>
          </button>
        </div>

        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 text-zinc-200 hover:text-white"
            onClick={() => router.push("/settings")}
          >
            <Settings className="h-4 w-4" /> Profile settings
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 text-zinc-400 hover:text-white"
            onClick={() => router.push("/subjects")}
          >
            <User className="h-4 w-4" /> Manage subjects
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 text-zinc-400 hover:text-white"
            onClick={() => router.push("/reviews")}
          >
            <Bell className="h-4 w-4" /> Today’s reviews
          </Button>
        </div>

        <Button type="button" variant="outline" className="w-full justify-center gap-2 border-white/20 text-xs text-zinc-300">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </PopoverContent>
    </Popover>
  );
};
