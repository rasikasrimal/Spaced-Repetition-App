import { get, set, del } from "idb-keyval";

export const idbStorage = {
  getItem: async (name: string) => (await get(name)) ?? null,
  setItem: async (name: string, value: unknown) => {
    await set(name, value);
  },
  removeItem: async (name: string) => {
    await del(name);
  }
};
