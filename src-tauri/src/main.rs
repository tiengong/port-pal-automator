// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::default().build());

    // Only initialize serial plugin if available
    #[cfg(not(target_os = "linux"))]
    {
        builder = builder.plugin(tauri_plugin_serialplugin::init());
    }

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}