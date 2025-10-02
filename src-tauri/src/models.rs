use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Category {
    pub id: String,
    pub label: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Topic {
    pub id: String,
    pub title: String,
    pub notes: String,
    pub category_id: Option<String>,
    pub category_label: Option<String>,
    pub icon: String,
    pub color: String,
    pub reminder_time: Option<String>,
    pub intervals: Vec<i64>,
    pub interval_index: i64,
    pub next_review_date: String,
    pub last_reviewed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub snoozed_until: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopicPayload {
    pub title: String,
    pub notes: String,
    pub category_id: Option<String>,
    pub icon: String,
    pub color: String,
    pub reminder_time: Option<String>,
    pub intervals: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CategoryPayload {
    pub label: String,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbSnapshot {
    pub topics: Vec<Topic>,
    pub categories: Vec<Category>,
    pub schema_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportEnvelope {
    pub version: String,
    pub exported_at: String,
    pub snapshot: DbSnapshot,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPayload {
    pub topic_id: String,
    pub title: String,
    pub category_label: Option<String>,
    pub reminder_time: Option<String>,
}

