use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, Runtime};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub preferences: serde_json::Value,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            preferences: serde_json::json!({}),
        }
    }
}

pub fn get_app_config_dir<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    let app_data_dir = app
        .path()
        .app_config_dir()
        .expect("Could not get app config directory");
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir).expect("Could not create app config directory");
    }
    
    app_data_dir
}

pub fn get_config_file_path<R: Runtime>(app: &AppHandle<R>) -> PathBuf {
    get_app_config_dir(app).join("config.json")
}

pub fn save_config<R: Runtime>(app: &AppHandle<R>, config: &AppConfig) -> Result<(), String> {
    let config_path = get_config_file_path(app);
    let config_str = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(config_path, config_str)
        .map_err(|e| format!("Failed to write config file: {}", e))
}

pub fn load_config<R: Runtime>(app: &AppHandle<R>) -> AppConfig {
    let config_path = get_config_file_path(app);
    
    if !config_path.exists() {
        let default_config = AppConfig::default();
        save_config(app, &default_config).expect("Failed to save default config");
        return default_config;
    }
    
    let config_str = fs::read_to_string(config_path)
        .unwrap_or_else(|_| String::from("{\"preferences\":{}}"));
    
    serde_json::from_str(&config_str).unwrap_or_default()
}