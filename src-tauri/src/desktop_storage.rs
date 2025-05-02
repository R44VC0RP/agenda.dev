use serde::{Deserialize, Serialize};
use std::fs;
use std::io;
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

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("Failed to get config directory: {0}")]
    ConfigDirError(String),
    
    #[error("Failed to create config directory: {0}")]
    CreateDirError(io::Error),
    
    #[error("Failed to serialize config: {0}")]
    SerializeError(#[from] serde_json::Error),
    
    #[error("Failed to write config file: {0}")]
    WriteError(#[from] io::Error),
    
    #[error("Failed to read config file: {0}")]
    ReadError(io::Error),
}

pub fn get_app_config_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, ConfigError> {
    let app_data_dir = app.path().app_config_dir()
        .map_err(|e| ConfigError::ConfigDirError(format!("Could not get app config directory: {}", e)))?;
    
    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| ConfigError::CreateDirError(e))?;
    }
    
    Ok(app_data_dir)
}

pub fn get_config_file_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, ConfigError> {
    let app_dir = get_app_config_dir(app)?;
    Ok(app_dir.join("config.json"))
}

pub fn save_config<R: Runtime>(app: &AppHandle<R>, config: &AppConfig) -> Result<(), ConfigError> {
    let config_path = get_config_file_path(app)?;
    let config_str = serde_json::to_string_pretty(config)?;
    
    fs::write(config_path, config_str)?;
    Ok(())
}

pub fn load_config<R: Runtime>(app: &AppHandle<R>) -> Result<AppConfig, ConfigError> {
    let config_path = get_config_file_path(app)?;
    
    if !config_path.exists() {
        let default_config = AppConfig::default();
        save_config(app, &default_config)?;
        return Ok(default_config);
    }
    
    let config_str = fs::read_to_string(&config_path)
        .map_err(|e| ConfigError::ReadError(e))?;
    
    let config = serde_json::from_str(&config_str)?;
    Ok(config)
}