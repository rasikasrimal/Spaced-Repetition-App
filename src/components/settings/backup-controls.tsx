"use client";

import * as React from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { useTopicStore } from "@/stores/topics";
import { toast } from "sonner";

const isDesktop = typeof window !== "undefined" && Boolean((window as any).__TAURI__);

type SystemPaths = {
  dataDir: string;
  backupsDir: string;
  databasePath: string;
  portable: boolean;
};

export function BackupControls(): JSX.Element {
  if (!isDesktop) {
    return <BrowserBackupNotice />;
  }
  return <DesktopBackupControls />;
}

function DesktopBackupControls(): JSX.Element {
  const topicCount = useTopicStore((state) => state.topics.length);
  const categoryCount = useTopicStore((state) => state.categories.length);
  const refreshSnapshot = useTopicStore((state) => state.refreshSnapshot);
  const [paths, setPaths] = React.useState<SystemPaths | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    invoke<SystemPaths>("system_get_paths")
      .then((result) => setPaths(result))
      .catch((error) => {
        console.error("Failed to resolve storage paths", error);
      });
  }, []);

  const handleExport = async () => {
    setBusy(true);
    try {
      const exported = await invoke<string>("db_export_json");
      toast.success(`Exported backup to ${exported}`);
    } catch (error) {
      console.error(error);
      toast.error("Could not export backup");
    } finally {
      setBusy(false);
    }
  };

  const handleBackupNow = async () => {
    setBusy(true);
    try {
      const backupPath = await invoke<string>("db_backup_now");
      toast.success(`Backup created at ${backupPath}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create backup");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      try {
        const text = await file.text();
        await invoke("db_import_from_string", { contents: text });
        await refreshSnapshot();
        toast.success("Import completed");
      } catch (error) {
        console.error(error);
        toast.error("Import failed");
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };

  const handleOpenStorage = async () => {
    if (!paths) return;
    try {
      await invoke("system_open_folder", { path: paths.dataDir });
    } catch (error) {
      console.error(error);
      toast.error("Could not open storage folder");
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="text-sm font-semibold text-white">Offline storage</p>
          <p className="text-xs text-zinc-300">
            {topicCount} topics · {categoryCount} categories · data stored at {paths?.databasePath ?? "…"}
          </p>
          {paths ? (
            <p className="text-xs text-zinc-400">
              Backups in {paths.backupsDir} · {paths.portable ? "Portable mode" : "Installed mode"}
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" onClick={handleExport} disabled={busy}>
            Export JSON
          </Button>
          <Button type="button" onClick={handleImport} disabled={busy}>
            Import JSON
          </Button>
          <Button type="button" onClick={handleBackupNow} disabled={busy}>
            Create backup now
          </Button>
          <Button type="button" variant="outline" onClick={handleOpenStorage} disabled={!paths}>
            Open storage folder
          </Button>
        </div>
      </div>
      <p className="text-xs text-zinc-400">
        All data is stored locally. Exports include topics, categories, intervals, and reminder preferences. Imports replace the
        existing database after confirmation.
      </p>
    </div>
  );
}

function BrowserBackupNotice(): JSX.Element {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-zinc-300">
      <p className="font-semibold text-white">Browser mode backup</p>
      <p className="mt-1 text-xs">
        When running in a browser you can export data from the overflow menu of your PWA. Install the desktop application for
        automated backups and offline storage guarantees.
      </p>
    </div>
  );
}

