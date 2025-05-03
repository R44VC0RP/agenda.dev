mod desktop_storage;

use desktop_storage::{AppConfig, ConfigError, load_config, save_config};
use log::{error, info};
use tauri::Runtime;

#[tauri::command]
async fn get_preferences<R: Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<serde_json::Value, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    Ok(config.preferences)
}

#[tauri::command]
async fn save_preferences<R: Runtime>(
    app: tauri::AppHandle<R>,
    preferences: serde_json::Value,
) -> Result<(), String> {
    match load_config(&app) {
        Ok(mut config) => {
            config.preferences = preferences;
            save_config(&app, &config).map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(ConfigError::ReadError(_)) => {
            // file missing – create a fresh one
            info!("No existing config found, creating default");
            let config = AppConfig { preferences, ..AppConfig::default() };
            save_config(&app, &config).map_err(|e| e.to_string())?;
            Ok(())
        }
        Err(e) => {
            // keep the faulty file around for manual recovery
            error!("Corrupted config – aborting save to prevent data loss: {}", e);
            return Err(e.to_string());
        }
    }
}

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

      // Initialize default config if needed
      match load_config(&app.handle()) {
        Ok(_) => {
            info!("Loaded existing configuration");
        }
        Err(ConfigError::ReadError(_)) => {
            info!("Creating default configuration");
            let default_config = AppConfig::default();
            if let Err(e) = save_config(&app.handle(), &default_config) {
                error!("Failed to save default config: {}", e);
            }
        }
        Err(e) => {
            error!("Error loading configuration: {}", e);
        }
      }
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_preferences, 
        save_preferences
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
