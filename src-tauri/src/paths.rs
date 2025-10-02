use std::fs;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Context, Result};
use tauri::AppHandle;

#[derive(Debug, Clone)]
pub struct StoragePaths {
    pub data_dir: PathBuf,
    pub db_path: PathBuf,
    pub backups_dir: PathBuf,
    pub portable: bool,
}

impl StoragePaths {
    pub fn ensure_dirs(&self) -> Result<()> {
        if !self.data_dir.exists() {
            fs::create_dir_all(&self.data_dir)
                .with_context(|| format!("unable to create data directory at {}", self.data_dir.display()))?;
        }
        if !self.backups_dir.exists() {
            fs::create_dir_all(&self.backups_dir).with_context(|| {
                format!(
                    "unable to create backups directory at {}",
                    self.backups_dir.display()
                )
            })?;
        }
        Ok(())
    }
}

pub fn resolve_storage_paths(app: &AppHandle) -> Result<StoragePaths> {
    let resolver = app.path_resolver();
    let exe_dir = resolver
        .current_exe()
        .map_err(|err| anyhow!("failed to read executable path: {err}"))?
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| anyhow!("executable path had no parent"))?;

    let portable_dir = exe_dir.join("data");
    let portable = portable_dir.exists();

    let data_dir = if portable {
        portable_dir
    } else {
        resolver
            .app_data_dir()
            .ok_or_else(|| anyhow!("could not resolve application data directory"))?
    };

    let db_path = data_dir.join("data.json");
    let backups_dir = data_dir.join("Backups");

    let paths = StoragePaths {
        data_dir,
        db_path,
        backups_dir,
        portable,
    };
    paths.ensure_dirs()?;
    Ok(paths)
}

