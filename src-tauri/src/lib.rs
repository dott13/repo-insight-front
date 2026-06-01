use std::sync::Mutex;

use tauri::{ Emitter, Manager };

use crate::engine::scanner::Scanner;

mod engine;

struct PendingDeepLink(Mutex<Option<String>>);

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

#[tauri::command]
fn get_pending_deep_link(state: tauri::State<PendingDeepLink>) -> Option<String> {
    state.0.lock().unwrap().take()
}

fn find_deep_link_url(args: &[String]) -> Option<String> {
    args.iter()
        .find(|a| a.starts_with("repo-insight://"))
        .cloned()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder
        ::default()
        .manage(PendingDeepLink(Mutex::new(None)))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(
            tauri_plugin_single_instance::init(|app, args, _cwd| {
                if let Some(url) = find_deep_link_url(&args) {
                    *app.state::<PendingDeepLink>().0.lock().unwrap() = Some(url.clone());

                    let _ = app.emit("deep-link-received", url);

                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_focus();
                    }
                }
            })
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, run_git_scan, get_pending_deep_link])
        .setup(|app| {
            use tauri_plugin_deep_link::DeepLinkExt;

            let handle = app.handle().clone();
            let startup_args: Vec<String> = std::env::args().collect();

            if let Some(url) = find_deep_link_url(&startup_args) {
                *handle.state::<PendingDeepLink>().0.lock().unwrap() = Some(url);
            }

            app.deep_link().on_open_url(move |event| {
                let urls: Vec<String> = event
                    .urls()
                    .iter()
                    .map(|u| u.to_string())
                    .collect();

                if let Some(url) = urls.first() {
                    *handle.state::<PendingDeepLink>().0.lock().unwrap() = Some(url.clone());
            
                    let _ = handle.emit("deep-link-received", url.clone());
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
