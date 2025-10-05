"use client";

import * as React from "react";
import { useProfileStore } from "@/stores/profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/forms/color-picker";
import { BellRing, SwitchCamera } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const toggleNotification = useProfileStore((state) => state.toggleNotification);

  const [form, setForm] = React.useState(profile);

  React.useEffect(() => {
    setForm(profile);
  }, [profile]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateProfile(form);
  };

  const handleChange = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const initials = React.useMemo(() => {
    if (!form.name) return "U";
    const parts = form.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
  }, [form.name]);

  const emailClasses = cn(
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
    profile.notifications.email ? "border-accent/40 bg-accent/10 text-accent" : "border-inverse/10 text-muted-foreground hover:text-fg/80"
  );

  const pushClasses = cn(
    "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
    profile.notifications.push ? "border-accent/40 bg-accent/10 text-accent" : "border-inverse/10 text-muted-foreground hover:text-fg/80"
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-fg">Profile settings</h1>
        <p className="text-sm text-muted-foreground">Keep your details and notification preferences up to date.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-inverse/5 bg-card/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Your name"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="you@example.com"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-role">Role</Label>
            <Input
              id="profile-role"
              value={form.role}
              onChange={handleChange("role")}
              placeholder="Learner"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-timezone">Timezone</Label>
            <Input
              id="profile-timezone"
              value={form.timezone}
              onChange={handleChange("timezone")}
              placeholder="UTC"
              className="h-11 rounded-2xl border-inverse/10 bg-inverse/10"
            />
            <p className="text-xs text-muted-foreground/80">
              We use this timezone for all date labels and to reset the daily revise limit at local midnight.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
          <div>
            <Label>Avatar colour</Label>
            <div className="mt-2 flex items-center gap-4">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-fg"
                style={{ backgroundColor: form.avatarColor }}
              >
                {initials}
              </span>
              <ColorPicker value={form.avatarColor} onChange={(value) => setForm((prev) => ({ ...prev, avatarColor: value }))} />
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-inverse/10 bg-inverse/5 p-4 text-xs text-muted-foreground">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            <button type="button" onClick={() => toggleNotification("email")} className={emailClasses}>
              <span className="flex items-center gap-2"><BellRing className="h-4 w-4" /> Email reminders</span>
              <span>{profile.notifications.email ? "On" : "Off"}</span>
            </button>
            <button type="button" onClick={() => toggleNotification("push")} className={pushClasses}>
              <span className="flex items-center gap-2"><SwitchCamera className="h-4 w-4" /> Push alerts</span>
              <span>{profile.notifications.push ? "On" : "Off"}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setForm(profile)}>
            Reset
          </Button>
          <Button type="submit">Save profile</Button>
        </div>
      </form>
    </section>
  );
}
