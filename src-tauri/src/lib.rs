use tauri::Emitter;
use crate::engine::scanner::Scanner;
mod engine;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn run_git_scan(base_path: String, user_emails: Vec<String>) -> Result<Vec<String>, String> {
    let scanner = Scanner::new();
    let paths = scanner.scan(&base_path, user_emails);
    Ok(paths)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let url = args.get(1).cloned().unwrap_or_default();
            app.emit("deep-link-received", url).unwrap();
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_git_scan])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
