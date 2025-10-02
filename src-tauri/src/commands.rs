use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use tauri::{AppHandle, Manager, State};

use crate::models::{Category, CategoryPayload, DbSnapshot, Topic, TopicPayload};
use crate::paths::StoragePaths;
use crate::scheduler::ReminderScheduler;
use crate::storage::Storage;

pub struct AppState {
    pub storage: Arc<Storage>,
    pub scheduler: ReminderScheduler,
    pub version: String,
    pub paths: StoragePaths,
}

#[tauri::command]
pub fn db_get_snapshot(state: State<'_, AppState>) -> Result<DbSnapshot, String> {
    state.storage.snapshot().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn db_create_category(state: State<'_, AppState>, payload: CategoryPayload) -> Result<Category, String> {
    let result = state.storage.create_category(payload).map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn db_delete_category(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.storage.delete_category(&id).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn db_create_topic(
    state: State<'_, AppState>,
    id: Option<String>,
    payload: TopicPayload,
) -> Result<Topic, String> {
    let result = state
        .storage
        .create_topic(id, payload)
        .map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn db_update_topic(state: State<'_, AppState>, id: String, payload: TopicPayload) -> Result<Topic, String> {
    let result = state
        .storage
        .update_topic(&id, payload)
        .map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn db_delete_topic(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let result = state.storage.delete_topic(&id).map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn db_mark_reviewed(state: State<'_, AppState>, id: String) -> Result<Topic, String> {
    let result = state
        .storage
        .mark_reviewed(&id)
        .map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn scheduler_refresh(state: State<'_, AppState>) -> Result<(), String> {
    state.scheduler.refresh();
    Ok(())
}

#[tauri::command]
pub fn notifications_snooze(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .storage
        .snooze_topic(&id, Duration::from_secs(60 * 60))
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn notifications_clear_snooze(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .storage
        .clear_snooze(&id)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn db_backup_now(state: State<'_, AppState>) -> Result<String, String> {
    state.storage.backup_now().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn db_export_json(state: State<'_, AppState>) -> Result<String, String> {
    state
        .storage
        .export_json(&state.version)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn db_import_json(state: State<'_, AppState>, path: String) -> Result<DbSnapshot, String> {
    let result = state.storage.import_json(&path).map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn db_import_from_string(state: State<'_, AppState>, contents: String) -> Result<DbSnapshot, String> {
    let result = state
        .storage
        .import_from_string(&contents)
        .map_err(|error| error.to_string());
    if result.is_ok() {
        state.scheduler.refresh();
    }
    result
}

#[tauri::command]
pub fn system_get_paths(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let paths = &state.paths;
    Ok(serde_json::json!({
        "dataDir": paths.data_dir,
        "databasePath": paths.db_path,
        "backupsDir": paths.backups_dir,
        "portable": paths.portable,
    }))
}

#[tauri::command]
pub fn system_open_folder(app: AppHandle, path: String) -> Result<(), String> {
    tauri::api::shell::open(&app.shell_scope(), path, None).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn system_set_run_at_startup(app: AppHandle, enabled: bool) -> Result<(), String> {
    set_startup(&app, enabled).map_err(|error| error.to_string())
}

fn set_startup(app: &AppHandle, enabled: bool) -> Result<()> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;

        let exe = app
            .path_resolver()
            .current_exe()
            .map_err(|error| anyhow::anyhow!("{error}"))?;
        let exe = exe.to_string_lossy().to_string();
        let mut command = Command::new("reg");
        if enabled {
            command.args([
                "add",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "SpacedRepetition",
                "/t",
                "REG_SZ",
                "/d",
                &exe,
                "/f",
            ]);
        } else {
            command.args([
                "delete",
                "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
                "/v",
                "SpacedRepetition",
                "/f",
            ]);
        }
        let status = command.status()?;
        if !status.success() {
            return Err(anyhow::anyhow!("Failed to update startup registry entry"));
        }
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = enabled;
        Err(anyhow::anyhow!("Run at startup is only supported on Windows"))
    }
}

