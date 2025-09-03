// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build());

    // Only initialize serial plugin if available
    #[cfg(not(target_os = "linux"))]
    {
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

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}