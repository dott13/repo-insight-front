// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use crate::engine::scanner::Scanner;

mod engine;

#[tauri::command]
async fn run_git_scan(base_path: String, user_emails: Vec<String>) -> Result<Vec<String>, String> {
    let scanner = Scanner::new();
    let paths = scanner.scan(&base_path, user_emails);
    Ok(paths)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_git_scan])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
