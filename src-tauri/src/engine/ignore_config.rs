use std::collections::HashSet;

pub fn get_default_ignore_list() -> HashSet<String> {
    let ignored = [
        "node_modules", "dist", "target", ".next", "vendor", "bin", "obj", 
        "__pycache__", ".venv", "venv", "env", "out", "build", ".gradle", 
        ".terraform", "bower_components", ".sass-cache", ".idea", ".vscode",
        ".git", ".svn", ".hg", ".DS_Store", "Thumbs.db", "logs", "tmp", "temp",
    ];
    ignored.iter().map(|&s| s.to_string()).collect()
}