use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub size: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: u64,
    pub modified_at: u64,
    #[serde(default)]
    pub aspect_ratio: Option<String>,
    #[serde(default)]
    pub canvas_width: Option<u32>,
    #[serde(default)]
    pub canvas_height: Option<u32>,
    #[serde(default)]
    pub frame_rate: Option<u32>,
    #[serde(default)]
    pub duration: Option<f64>,
    #[serde(default)]
    pub tracks: Vec<serde_json::Value>,
    #[serde(default)]
    pub clips: Vec<serde_json::Value>,
    #[serde(default)]
    pub media_assets: Vec<serde_json::Value>,
}
