use std::collections::HashMap;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;

use anyhow::Result;
use chrono::{Local, Timelike};
use tauri::{AppHandle, Manager};

use crate::models::NotificationPayload;
use crate::storage::Storage;

#[derive(Default)]
struct Cache {
    day_key: String,
    dispatched: HashMap<String, String>,
}

struct SchedulerState {
    trigger: (Mutex<bool>, Condvar),
    cache: Mutex<Cache>,
}

pub struct ReminderScheduler {
    storage: Arc<Storage>,
    state: Arc<SchedulerState>,
}

impl ReminderScheduler {
    pub fn start(app: AppHandle, storage: Arc<Storage>) -> Self {
        let scheduler = Self {
            storage: storage.clone(),
            state: Arc::new(SchedulerState {
                trigger: (Mutex::new(true), Condvar::new()),
                cache: Mutex::new(Cache::default()),
            }),
        };
        scheduler.spawn_worker(app);
        scheduler
    }

    pub fn refresh(&self) {
        let (lock, signal) = &self.state.trigger;
        if let Ok(mut flag) = lock.lock() {
            *flag = true;
            signal.notify_all();
        }
    }

    fn spawn_worker(&self, app: AppHandle) {
        let storage = self.storage.clone();
        let state = self.state.clone();
        thread::spawn(move || loop {
            let (lock, signal) = &state.trigger;
            let mut flag = lock.lock().unwrap();
            if !*flag {
                let wait = signal
                    .wait_timeout(flag, Duration::from_secs(60))
                    .unwrap();
                flag = wait.0;
                if !*flag && wait.1.timed_out() {
                    *flag = true;
                }
            }
            *flag = false;
            drop(flag);

            if let Err(error) = Self::process(&storage, &state, &app) {
                log::warn!("reminder scheduler error: {error:?}");
            }
        });
    }

    fn process(storage: &Arc<Storage>, state: &Arc<SchedulerState>, app: &AppHandle) -> Result<()> {
        let local_now = Local::now();
        let time_key = local_now.format("%H:%M").to_string();
        let today = local_now.format("%Y-%m-%d").to_string();

        {
            let mut cache = state.cache.lock().unwrap();
            if cache.day_key != today {
                cache.day_key = today.clone();
                cache.dispatched.clear();
            }
        }

        let due_topics = storage.due_topics()?;
        for topic in due_topics {
            let reminder_time = match &topic.reminder_time {
                Some(value) => value,
                None => continue,
            };
            if reminder_time != &time_key {
                continue;
            }

            let mut cache = state.cache.lock().unwrap();
            let cache_key = format!("{}-{time_key}", topic.id);
            if cache.dispatched.get(&topic.id).map(|key| key == &cache_key).unwrap_or(false) {
                continue;
            }
            cache.dispatched.insert(topic.id.clone(), cache_key);
            drop(cache);

            let payload = NotificationPayload {
                topic_id: topic.id.clone(),
                title: topic.title.clone(),
                category_label: topic.category_label.clone(),
                reminder_time: topic.reminder_time.clone(),
            };

            if let Err(error) = app.emit_all("spacedrep://notification", &payload) {
                log::warn!("emit notification event failed: {error:?}");
            }
        }
        Ok(())
    }
}

