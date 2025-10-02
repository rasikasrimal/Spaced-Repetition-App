use std::fs::{self, File};
use std::io::{BufReader, Write};
use std::path::PathBuf;
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Duration as ChronoDuration, Local, Utc};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

use crate::models::{Category, CategoryPayload, DbSnapshot, ExportEnvelope, Topic, TopicPayload};
use crate::paths::StoragePaths;

const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    version: u32,
    topics: Vec<Topic>,
    categories: Vec<Category>,
}

impl Default for PersistedState {
    fn default() -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            version: SCHEMA_VERSION,
            topics: Vec::new(),
            categories: vec![Category {
                id: "general".to_string(),
                label: "General".to_string(),
                color: Some("#38bdf8".to_string()),
                icon: Some("Sparkles".to_string()),
                created_at: now.clone(),
                updated_at: now,
            }],
        }
    }
}

pub struct Storage {
    state: Arc<RwLock<PersistedState>>,
    pub paths: StoragePaths,
}

impl Storage {
    pub fn load(paths: StoragePaths) -> Result<Self> {
        let state = if paths.db_path.exists() {
            read_state(&paths.db_path)?
        } else {
            PersistedState::default()
        };
        let mut storage = Self {
            state: Arc::new(RwLock::new(state)),
            paths,
        };
        storage.persist()?;
        storage.rotate_daily_backup()?;
        Ok(storage)
    }

    pub fn snapshot(&self) -> Result<DbSnapshot> {
        let state = self.state.read().unwrap();
        Ok(DbSnapshot {
            topics: state.topics.clone(),
            categories: state.categories.clone(),
            schema_version: state.version as i64,
        })
    }

    pub fn create_category(&self, payload: CategoryPayload) -> Result<Category> {
        let label = payload.label.trim();
        if label.is_empty() {
            return Err(anyhow!("Category label cannot be empty"));
        }
        let mut state = self.state.write().unwrap();
        if state
            .categories
            .iter()
            .any(|category| category.label.eq_ignore_ascii_case(label))
        {
            return Err(anyhow!("Category with that name already exists"));
        }
        let now = Utc::now().to_rfc3339();
        let id = generate_id();
        let category = Category {
            id: id.clone(),
            label: label.to_string(),
            color: payload.color.clone(),
            icon: payload.icon.clone(),
            created_at: now.clone(),
            updated_at: now,
        };
        state.categories.push(category.clone());
        self.persist()?;
        Ok(category)
    }

    pub fn delete_category(&self, id: &str) -> Result<()> {
        let mut state = self.state.write().unwrap();
        state.categories.retain(|category| category.id != id);
        for topic in &mut state.topics {
            if topic.category_id.as_deref() == Some(id) {
                topic.category_id = None;
                topic.category_label = None;
                topic.updated_at = Utc::now().to_rfc3339();
            }
        }
        self.persist()
    }

    pub fn create_topic(&self, id: Option<String>, payload: TopicPayload) -> Result<Topic> {
        let mut state = self.state.write().unwrap();
        let topic_id = id.unwrap_or_else(generate_id);
        let now = Utc::now();
        let intervals = normalize_intervals(&payload.intervals);
        let next_review = compute_next_review_date(None, &intervals, 0);
        let category_label = payload
            .category_id
            .as_ref()
            .and_then(|category_id| resolve_category_label(&state.categories, category_id));
        let topic = Topic {
            id: topic_id.clone(),
            title: payload.title.trim().to_string(),
            notes: payload.notes.clone(),
            category_id: payload.category_id.clone(),
            category_label,
            icon: payload.icon.clone(),
            color: payload.color.clone(),
            reminder_time: payload.reminder_time.clone(),
            intervals,
            interval_index: 0,
            next_review_date: next_review.to_rfc3339(),
            last_reviewed_at: None,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
            snoozed_until: None,
        };
        state.topics.push(topic.clone());
        self.persist()?;
        Ok(topic)
    }

    pub fn update_topic(&self, id: &str, payload: TopicPayload) -> Result<Topic> {
        let mut state = self.state.write().unwrap();
        let topic = state
            .topics
            .iter_mut()
            .find(|topic| topic.id == id)
            .ok_or_else(|| anyhow!("Topic not found"))?;
        let intervals = normalize_intervals(&payload.intervals);
        let current_index = topic.interval_index;
        let last_reviewed = topic
            .last_reviewed_at
            .as_deref()
            .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
            .map(|dt| dt.with_timezone(&Utc));
        let next_review = compute_next_review_date(last_reviewed, &intervals, current_index);
        topic.title = payload.title.trim().to_string();
        topic.notes = payload.notes.clone();
        topic.category_id = payload.category_id.clone();
        topic.category_label = payload
            .category_id
            .as_ref()
            .and_then(|category_id| resolve_category_label(&state.categories, category_id));
        topic.icon = payload.icon.clone();
        topic.color = payload.color.clone();
        topic.reminder_time = payload.reminder_time.clone();
        topic.intervals = intervals;
        topic.next_review_date = next_review.to_rfc3339();
        topic.updated_at = Utc::now().to_rfc3339();
        self.persist()?;
        Ok(topic.clone())
    }

    pub fn delete_topic(&self, id: &str) -> Result<()> {
        let mut state = self.state.write().unwrap();
        state.topics.retain(|topic| topic.id != id);
        self.persist()
    }

    pub fn mark_reviewed(&self, id: &str) -> Result<Topic> {
        let mut state = self.state.write().unwrap();
        let topic = state
            .topics
            .iter_mut()
            .find(|topic| topic.id == id)
            .ok_or_else(|| anyhow!("Topic not found"))?;
        let intervals = if topic.intervals.is_empty() {
            vec![1]
        } else {
            topic.intervals.clone()
        };
        let now = Utc::now();
        let mut next_index = topic.interval_index + 1;
        if next_index as usize >= intervals.len() {
            next_index = (intervals.len() - 1) as i64;
        }
        topic.interval_index = next_index;
        topic.last_reviewed_at = Some(now.to_rfc3339());
        topic.next_review_date = compute_next_review_date(Some(now), &intervals, next_index).to_rfc3339();
        topic.updated_at = now.to_rfc3339();
        topic.snoozed_until = None;
        self.persist()?;
        Ok(topic.clone())
    }

    pub fn snooze_topic(&self, id: &str, duration: Duration) -> Result<()> {
        let until = (Utc::now() + ChronoDuration::from_std(duration)?).to_rfc3339();
        let mut state = self.state.write().unwrap();
        if let Some(topic) = state.topics.iter_mut().find(|topic| topic.id == id) {
            topic.snoozed_until = Some(until);
            topic.updated_at = Utc::now().to_rfc3339();
            self.persist()?;
            Ok(())
        } else {
            Err(anyhow!("Topic not found"))
        }
    }

    pub fn clear_snooze(&self, id: &str) -> Result<()> {
        let mut state = self.state.write().unwrap();
        if let Some(topic) = state.topics.iter_mut().find(|topic| topic.id == id) {
            topic.snoozed_until = None;
            topic.updated_at = Utc::now().to_rfc3339();
            self.persist()?;
            Ok(())
        } else {
            Err(anyhow!("Topic not found"))
        }
    }

    pub fn due_topics(&self) -> Result<Vec<Topic>> {
        let state = self.state.read().unwrap();
        let now = Utc::now();
        let mut due = Vec::new();
        for topic in &state.topics {
            if topic.reminder_time.is_none() {
                continue;
            }
            let next_review = DateTime::parse_from_rfc3339(&topic.next_review_date)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| now);
            if next_review > now {
                continue;
            }
            if let Some(ref snoozed) = topic.snoozed_until {
                if let Ok(until) = DateTime::parse_from_rfc3339(snoozed) {
                    if until.with_timezone(&Utc) > now {
                        continue;
                    }
                }
            }
            due.push(topic.clone());
        }
        Ok(due)
    }

    pub fn backup_now(&self) -> Result<String> {
        self.ensure_persisted()?;
        let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
        let target = self
            .paths
            .backups_dir
            .join(format!("manual-{timestamp}.json"));
        fs::copy(&self.paths.db_path, &target)?;
        Ok(target.display().to_string())
    }

    pub fn export_json(&self, version: &str) -> Result<String> {
        let snapshot = self.snapshot()?;
        let envelope = ExportEnvelope {
            version: version.to_string(),
            exported_at: Utc::now().to_rfc3339(),
            snapshot,
        };
        let timestamp = Local::now().format("%Y%m%d-%H%M%S").to_string();
        let path = self
            .paths
            .backups_dir
            .join(format!("export-{timestamp}.json"));
        let contents = serde_json::to_vec_pretty(&envelope)?;
        write_atomic(&path, &contents)?;
        Ok(path.display().to_string())
    }

    pub fn import_json(&self, path: &str) -> Result<DbSnapshot> {
        let raw = fs::read_to_string(path)
            .with_context(|| format!("Unable to read backup at {path}"))?;
        let envelope: ExportEnvelope = serde_json::from_str(&raw)
            .with_context(|| "Backup file is not a valid export")?;
        self.apply_envelope(envelope)
    }

    pub fn schema_version(&self) -> Result<i64> {
        let state = self.state.read().unwrap();
        Ok(state.version as i64)
    }

    pub fn import_from_string(&self, contents: &str) -> Result<DbSnapshot> {
        let envelope: ExportEnvelope = serde_json::from_str(contents)
            .with_context(|| "Backup file is not a valid export")?;
        self.apply_envelope(envelope)
    }

    fn apply_envelope(&self, envelope: ExportEnvelope) -> Result<DbSnapshot> {
        let snapshot = envelope.snapshot.clone();
        let mut state = self.state.write().unwrap();
        *state = PersistedState {
            version: snapshot.schema_version as u32,
            topics: snapshot.topics.clone(),
            categories: snapshot.categories.clone(),
        };
        self.persist()?;
        Ok(snapshot)
    }

    fn ensure_persisted(&self) -> Result<()> {
        if !self.paths.db_path.exists() {
            self.persist()?;
        }
        Ok(())
    }

    fn rotate_daily_backup(&mut self) -> Result<()> {
        self.ensure_persisted()?;
        if !self.paths.db_path.exists() {
            return Ok(());
        }
        let today = Utc::now().format("%Y-%m-%d").to_string();
        let target = self
            .paths
            .backups_dir
            .join(format!("daily-{today}.json"));
        if !target.exists() {
            fs::copy(&self.paths.db_path, &target)?;
        }
        self.cleanup_backups()?;
        Ok(())
    }

    fn cleanup_backups(&self) -> Result<()> {
        let mut entries: Vec<_> = fs::read_dir(&self.paths.backups_dir)?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_type().map(|t| t.is_file()).unwrap_or(false))
            .collect();
        entries.sort_by_key(|entry| entry.file_name());
        if entries.len() > 7 {
            for entry in entries.into_iter().take(entries.len() - 7) {
                let _ = fs::remove_file(entry.path());
            }
        }
        Ok(())
    }

    fn persist(&self) -> Result<()> {
        let state = self.state.read().unwrap();
        let mut persisted = state.clone();
        persisted.version = SCHEMA_VERSION;
        let payload = serde_json::to_vec_pretty(&persisted)?;
        write_atomic(&self.paths.db_path, &payload)?;
        Ok(())
    }
}

fn read_state(path: &PathBuf) -> Result<PersistedState> {
    let file = File::open(path).with_context(|| format!("Unable to open {path:?}"))?;
    let reader = BufReader::new(file);
    let mut state: PersistedState = serde_json::from_reader(reader)?;
    if state.version < SCHEMA_VERSION {
        state.version = SCHEMA_VERSION;
    }
    Ok(state)
}

fn resolve_category_label(categories: &[Category], id: &str) -> Option<String> {
    categories
        .iter()
        .find(|category| category.id == id)
        .map(|category| category.label.clone())
}

fn normalize_intervals(intervals: &[i64]) -> Vec<i64> {
    let mut normalized: Vec<i64> = intervals.iter().copied().filter(|value| *value > 0).collect();
    if normalized.is_empty() {
        normalized.push(1);
    }
    normalized.sort();
    normalized.dedup();
    normalized
}

fn compute_next_review_date(
    last_reviewed_at: Option<DateTime<Utc>>,
    intervals: &[i64],
    interval_index: i64,
) -> DateTime<Utc> {
    let base = last_reviewed_at.unwrap_or_else(Utc::now);
    let index = interval_index.clamp(0, (intervals.len() - 1) as i64);
    let days = intervals[index as usize];
    base + ChronoDuration::days(days as i64)
}

fn write_atomic(path: &PathBuf, payload: &[u8]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let temp_path = path.with_extension("tmp");
    let mut file = File::create(&temp_path)?;
    file.write_all(payload)?;
    file.flush()?;
    file.sync_all()?;
    fs::rename(temp_path, path)?;
    Ok(())
}

fn generate_id() -> String {
    static COUNTER: Lazy<std::sync::atomic::AtomicU64> =
        Lazy::new(|| std::sync::atomic::AtomicU64::new(0));
    let since_epoch = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_else(|_| Duration::from_secs(0));
    let counter = COUNTER.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    format!("{:x}{:x}", since_epoch.as_micros(), counter)
}

