"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Profile = {
  name: string;
  email: string;
  role: string;
  avatarColor: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
  };
};

type ProfileStore = {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
  toggleNotification: (key: keyof Profile["notifications"]) => void;
};

const DEFAULT_PROFILE: Profile = {
  name: "Alex Rivera",
  email: "alex@example.com",
  role: "Learner",
  avatarColor: "#38bdf8",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  notifications: {
    email: true,
    push: false
  }
};

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      updateProfile: (updates) =>
        set((state) => ({
          profile: {
            ...state.profile,
            ...updates,
            notifications: {
              ...state.profile.notifications,
              ...(updates.notifications ?? {})
            }
          }
        })),
      toggleNotification: (key) =>
        set((state) => ({
          profile: {
            ...state.profile,
            notifications: {
              ...state.profile.notifications,
              [key]: !state.profile.notifications[key]
            }
          }
        }))
    }),
    {
      name: "spaced-repetition-profile",
      version: 1
    }
  )
);
