mod desktop_storage;

use desktop_storage::{AppConfig, ConfigError, load_config, save_config};
use log::{error, info};
use tauri::{Runtime, WindowEvent, Manager, Emitter};

#[tauri::command]
/// Retrieves the application's user preferences as a JSON value.
///
/// Loads the current configuration and returns the stored preferences. Returns an error string if the configuration cannot be loaded.
///
/// # Examples
///
/// ```
/// let prefs = get_preferences(app_handle).await.unwrap();
/// assert!(prefs.is_object());
/// ```
async fn get_preferences<R: Runtime>(
    app: tauri::AppHandle<R>,
) -> Result<serde_json::Value, String> {
    let config = load_config(&app).map_err(|e| e.to_string())?;
    Ok(config.preferences)
}

#[tauri::command]
/// Saves the application's user preferences to the configuration file.
///
/// If a configuration file exists, updates its preferences field. If the file is missing, creates a new configuration with the provided preferences. If the configuration file is corrupted or unreadable, aborts the save to prevent data loss and returns an error.
///
/// # Parameters
/// - `preferences`: The new preferences to store in the configuration.
///
/// # Errors
/// Returns an error string if saving fails or if the configuration file is corrupted.
///
/// # Examples
///
/// ```
/// let prefs = serde_json::json!({"theme": "dark"});
/// save_preferences(app_handle, prefs).await.unwrap();
/// ```
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

#[derive(serde::Serialize, Clone)]
struct AuthUrlPayload {
  url: String,
}

#[tauri::command]
/// Opens the OAuth webview window and navigates it to the specified authentication URL.
///
/// Returns an error if the OAuth window cannot be found, shown, or navigated to the given URL.
///
/// # Examples
///
/// ```
/// let result = open_oauth_window(app_handle, "https://example.com/oauth".to_string());
/// assert!(result.is_ok());
/// ```
fn open_oauth_window(app_handle: tauri::AppHandle, auth_url: String) -> Result<(), String> {
  let window = app_handle.get_webview_window("oauth").ok_or("Failed to get OAuth window")?;
  window.show().map_err(|e| e.to_string())?;
  
  // Navigate to the auth URL
  window.eval(&format!("window.location.replace('{}');", auth_url))
      .map_err(|e| e.to_string())?;
      
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
/// Initializes and runs the Tauri desktop application.
///
/// Sets up configuration management, logging, command handlers, and OAuth window event handling.  
/// Ensures a default configuration exists, intercepts OAuth window close requests to hide the window,  
/// and emits authentication callback events when OAuth redirects are detected.
///
/// # Examples
///
/// ```
/// // Typically called from main.rs
/// run();
/// ```
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
      
      // Set up OAuth window event handler
      let app_handle = app.handle().clone();
      if let Some(oauth_window) = app.get_webview_window("oauth") {
        oauth_window.on_window_event(move |event| {
          if let WindowEvent::CloseRequested { api, .. } = event {
            // Just hide the window instead of closing it
            if let Some(window) = app_handle.get_webview_window("oauth") {
              let _ = window.hide();
            }
            api.prevent_close();
          }
        });
      }
      
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        get_preferences, 
        save_preferences,
        open_oauth_window
    ])
    .on_page_load(|window, payload| {
      // Only process for the OAuth window
      if window.label() == "oauth" {
        let url = payload.url().to_string();
        
        // Check if this is a callback URL with tokens (contains fragments or query params)
        if url.contains("#access_token=") || url.contains("?code=") || url.contains("&state=") {
          let _ = window.emit("auth-callback", AuthUrlPayload { url });
          let _ = window.hide(); // Hide window after successful auth
        }
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
