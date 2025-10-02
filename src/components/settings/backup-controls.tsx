"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { get, set } from "idb-keyval";

const AUTO_BACKUP_HANDLE_KEY = "auto-backup-handle";
const AUTO_BACKUP_LAST_KEY = "auto-backup-last";

const formatSize = (state: unknown) => {
  try {
    const bytes = new TextEncoder().encode(JSON.stringify(state)).length;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  } catch {
    return "-";
  }
};

export function BackupControls() {
  const storeState = useTopicStore();
  const [busy, setBusy] = React.useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = React.useState(false);
  const [lastBackup, setLastBackup] = React.useState<string | null>(null);

  const performAutoBackup = React.useCallback(async (handle: FileSystemDirectoryHandle) => {
    const snapshot = useTopicStore.getState();
    const fileHandle = await handle.getFileHandle(
      `spacedrep-auto-${new Date().toISOString().slice(0, 10)}.json`,
      { create: true }
    );
    const writable = await fileHandle.createWritable();
    await writable.write(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }));
    await writable.close();
    const timestamp = new Date().toISOString();
    await set(AUTO_BACKUP_LAST_KEY, timestamp);
    setLastBackup(new Date(timestamp).toLocaleString());
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      const handle = await get<FileSystemDirectoryHandle | undefined>(AUTO_BACKUP_HANDLE_KEY);
      const last = await get<string | undefined>(AUTO_BACKUP_LAST_KEY);
      if (!mounted) return;
      setAutoBackupEnabled(Boolean(handle));
      if (last) setLastBackup(new Date(last).toLocaleString());
      if (handle) {
        try {
          const lastDate = last ? new Date(last) : null;
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (!lastDate || lastDate.getTime() < weekAgo) {
            await performAutoBackup(handle);
          }
        } catch (error) {
          console.warn("Auto backup failed", error);
        }
      }
    };
    hydrate();
    return () => {
      mounted = false;
    };
  }, [performAutoBackup]);

  const exportJson = async () => {
    setBusy(true);
    try {
      const payload = JSON.stringify(storeState, null, 2);
      if ("showSaveFilePicker" in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `spacedrep-backup-${new Date().toISOString().slice(0, 10)}.json`,
          types: [{ description: "JSON", accept: { "application/json": [".json"] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(new Blob([payload], { type: "application/json" }));
        await writable.close();
      } else {
        const blob = new Blob([payload], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spacedrep-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      alert("Backup saved.");
    } finally {
      setBusy(false);
    }
  };

  const importJson = async () => {
    const parsePayload = async (file: File) => {
      const text = await file.text();
      const next = JSON.parse(text);
      if (!("topics" in next)) throw new Error("Invalid backup file");
      useTopicStore.setState(next);
      alert("Backup restored. Reloading…");
      location.reload();
    };

    if ("showOpenFilePicker" in window) {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: "JSON", accept: { "application/json": [".json"] } }],
        multiple: false
      });
      const file = await handle.getFile();
      await parsePayload(file);
    } else {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        await parsePayload(file);
      };
      input.click();
    }
  };

  const requestPersistentStorage = async () => {
    if (navigator.storage && "persist" in navigator.storage) {
      const granted = await navigator.storage.persist?.();
      alert(granted ? "Persistent storage granted" : "Could not obtain persistent storage");
    }
  };

  const toggleAutoBackup = async () => {
    if (autoBackupEnabled) {
      await set(AUTO_BACKUP_HANDLE_KEY, undefined);
      await set(AUTO_BACKUP_LAST_KEY, undefined);
      setAutoBackupEnabled(false);
      setLastBackup(null);
      return;
    }
    if (!("showDirectoryPicker" in window)) {
      alert("Your browser does not support the directory picker.");
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      await set(AUTO_BACKUP_HANDLE_KEY, dirHandle);
      setAutoBackupEnabled(true);
      await performAutoBackup(dirHandle);
      alert("Auto backup enabled. A backup was created immediately.");
    } catch (error) {
      console.warn("Auto backup enable failed", error);
    }
  };

  const topicCount = storeState.topics.length;
  const categoryCount = storeState.categories.length;
  const sizeEstimate = formatSize(storeState);

  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Local storage</p>
          <p className="text-xs text-zinc-300">
            {topicCount} topics · {categoryCount} categories · approx {sizeEstimate}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button type="button" disabled={busy} onClick={exportJson}>
            Export JSON
          </Button>
          <Button type="button" disabled={busy} onClick={importJson}>
            Import JSON
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300">
        <Button variant="outline" type="button" onClick={requestPersistentStorage}>
          Force persist request
        </Button>
        <Button variant="outline" type="button" onClick={toggleAutoBackup}>
          {autoBackupEnabled ? "Disable auto backup" : "Enable auto backup"}
        </Button>
        {lastBackup ? <span>Last auto backup: {lastBackup}</span> : null}
      </div>
      <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs text-zinc-200">
        <p className="font-semibold">How to install / backup</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Open in Chrome, click the install icon, choose “Install”.</li>
          <li>Launch from Start Menu/desktop – works offline.</li>
          <li>Backup via Export JSON; restore with Import JSON.</li>
        </ol>
      </div>
    </div>
  );
}