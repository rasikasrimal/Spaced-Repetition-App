use std::sync::Arc;

use tauri::Manager;

mod commands;
mod models;
mod paths;
mod scheduler;
mod storage;

use commands::AppState;
use paths::resolve_storage_paths;
use scheduler::ReminderScheduler;
use storage::Storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let paths = resolve_storage_paths(app)?;
            let storage = Arc::new(Storage::load(paths.clone())?);
            let scheduler = ReminderScheduler::start(app.handle(), storage.clone());
            let version = app.package_info().version.to_string();

            app.manage(AppState {
                storage,
                scheduler,
                version,
                paths,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::db_get_snapshot,
            commands::db_create_category,
            commands::db_delete_category,
            commands::db_create_topic,
            commands::db_update_topic,
            commands::db_delete_topic,
            commands::db_mark_reviewed,
            commands::scheduler_refresh,
            commands::notifications_snooze,
            commands::notifications_clear_snooze,
            commands::db_backup_now,
            commands::db_export_json,
            commands::db_import_json,
            commands::db_import_from_string,
            commands::system_get_paths,
            commands::system_open_folder,
            commands::system_set_run_at_startup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
