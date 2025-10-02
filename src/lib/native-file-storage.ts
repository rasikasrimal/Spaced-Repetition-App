let cachedPath: string | null = null;

const ensureFilePath = async () => {
  if (cachedPath) return cachedPath;
  const { documentDir, join } = await import("@tauri-apps/api/path");
  const { createDir, exists } = await import("@tauri-apps/api/fs");
  const docs = await documentDir();
  const dir = await join(docs, "SpacedRep");
  const dirExists = await exists(dir);
  if (!dirExists) {
    await createDir(dir, { recursive: true });
  }
  const filePath = await join(dir, "spacedrep-store-v3.json");
  cachedPath = filePath;
  return filePath;
};

export const nativeFileStorage = {
  async getItem(name: string) {
    const { exists, readTextFile } = await import("@tauri-apps/api/fs");
    const filePath = await ensureFilePath();
    const fileExists = await exists(filePath);
    if (!fileExists) return null;
    try {
      const contents = await readTextFile(filePath);
      return contents ?? null;
    } catch {
      return null;
    }
  },
  async setItem(name: string, value: unknown) {
    const { writeFile } = await import("@tauri-apps/api/fs");
    const filePath = await ensureFilePath();
    const contents = typeof value === "string" ? value : JSON.stringify(value);
    await writeFile({ path: filePath, contents });
  },
  async removeItem(name: string) {
    const { exists, removeFile } = await import("@tauri-apps/api/fs");
    const filePath = await ensureFilePath();
    const fileExists = await exists(filePath);
    if (fileExists) {
      await removeFile(filePath);
    }
  }
};
