// Console window configuration for debugging
// Always show console in debug mode, optionally in release with "console" feature
#![cfg_attr(all(not(debug_assertions), not(feature = "console")), windows_subsystem = "windows")]

use std::env;
use std::panic;
use tauri::Manager;
use chrono::Utc;

fn main() {
    // Set up panic hook for better error reporting
    panic::set_hook(Box::new(|panic_info| {
        let payload = panic_info.payload();
        let message = if let Some(s) = payload.downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };
        
        let location = panic_info.location()
            .map(|l| format!(" at {}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_default();
            
        eprintln!("PANIC: {}{}", message, location);
        log::error!("PANIC: {}{}", message, location);
    }));

    log::info!("Starting Serial Pilot application...");
    
    // Read environment variables for plugin control
    let enable_window_state = env::var("SP_ENABLE_WINDOW_STATE")
        .unwrap_or_else(|_| "0".to_string()) == "1";
    let enable_serial = env::var("SP_ENABLE_SERIAL")
        .unwrap_or_else(|_| "1".to_string()) == "1";
    
    log::info!("Window state plugin: {}", if enable_window_state { "enabled" } else { "disabled" });
    log::info!("Serial plugin: {}", if enable_serial { "enabled" } else { "disabled" });

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Trace)
            .targets([
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
                tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
            ])
            .build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            log::info!("Setting up main window...");
            
            // Get the main window and ensure it's visible
            if let Some(window) = app.get_webview_window("main") {
                log::info!("Main window found, configuring...");
                
                // Force window to be visible and focused
                if let Err(e) = window.show() {
                    log::warn!("Failed to show window: {}", e);
                }
                
                if let Err(e) = window.set_focus() {
                    log::warn!("Failed to focus window: {}", e);
                }
                
                if let Err(e) = window.center() {
                    log::warn!("Failed to center window: {}", e);
                }
                
                // Set a safe default size
                if let Err(e) = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 1200, height: 800 })) {
                    log::warn!("Failed to set window size: {}", e);
                }
                
                log::info!("Main window setup completed");
            } else {
                log::error!("Main window not found! Attempting to create fallback window...");
                
                // Fallback: create main window if not found
                match app.handle().get_webview_window("main").or_else(|| {
                    log::info!("Creating fallback main window...");
                    tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::App("index.html".into()))
                        .title("Serial Pilot")
                        .inner_size(1200.0, 800.0)
                        .min_inner_size(800.0, 600.0)
                        .center()
                        .build()
                        .map_err(|e| log::error!("Failed to create fallback window: {}", e))
                        .ok()
                }) {
                    Some(window) => {
                        log::info!("Fallback window created successfully");
                        if let Err(e) = window.show() {
                            log::warn!("Failed to show fallback window: {}", e);
                        }
                    }
                    None => {
                        log::error!("Failed to create fallback window!");
                    }
                }
            }
            
            Ok(())
        });

    // Conditionally add window state plugin
    if enable_window_state {
        log::info!("Adding window state plugin...");
        builder = builder.plugin(tauri_plugin_window_state::Builder::default().build());
        log::info!("Window state plugin added");
    }

    // Conditionally add serial plugin (only on supported platforms)
    if enable_serial {
        #[cfg(not(target_os = "linux"))]
        {
            log::info!("Adding serial plugin...");
            match tauri_plugin_serialplugin::init() {
                plugin => {
                    log::info!("Serial plugin initialized successfully");
                    builder = builder.plugin(plugin);
                }
            }
        }

        #[cfg(target_os = "linux")]
        {
            log::warn!("Serial plugin not available on Linux");
        }
    }

    log::info!("Running Tauri application...");
    match builder.run(tauri::generate_context!()) {
        Ok(_) => log::info!("Application exited normally"),
        Err(e) => {
            let error_msg = format!("Application startup failed: {}\n\nTimestamp: {}\nPlatform: {}\nArchitecture: {}", 
                e, 
                Utc::now().format("%Y-%m-%d %H:%M:%S UTC"),
                std::env::consts::OS,
                std::env::consts::ARCH
            );
            
            log::error!("Application failed to run: {}", e);
            eprintln!("FATAL ERROR: {}", e);
            
            // Write startup error to file for troubleshooting
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_dir) = exe_path.parent() {
                    let error_file = exe_dir.join("startup-error.txt");
                    if let Err(write_err) = std::fs::write(&error_file, &error_msg) {
                        eprintln!("Failed to write startup error to file: {}", write_err);
                    } else {
                        eprintln!("Startup error written to: {}", error_file.display());
                    }
                }
            }
            
            panic!("Application startup failed: {}", e);
        }
    }
}