use std::collections::HashSet;

use git2::Repository;
use walkdir::{DirEntry, WalkDir};

use crate::engine::ignore_config;

pub struct Scanner {
    ignore_list: HashSet<String>,
}

impl Scanner {
    pub fn new() -> Self {
        Self {
            ignore_list: ignore_config::get_default_ignore_list(),
        }
    }

    pub fn scan(&self, base_path: &str, user_emails: Vec<String>) -> Vec<String> {
        let mut valid_repos = Vec::new();

        let walker = WalkDir::new(base_path)
            .into_iter()
            .filter_entry(|e| !self.is_ignored(e));

        for entry in walker.filter_map(|e| e.ok()) {
            if entry.file_name() == ".git" && entry.file_type().is_dir() {
                if let Some(parent) = entry.path().parent() {
                    let path_str = parent.to_string_lossy().into_owned();

                    if self.verify_authorship(&path_str, &user_emails) {
                        valid_repos.push(path_str);
                    }
                }
            }
        }
        valid_repos
    } 

    fn is_ignored(&self, entry: &DirEntry) -> bool {
        entry.file_name()
            .to_str()
            .map(|s| self.ignore_list.contains(s))
            .unwrap_or(false)
    }

    fn verify_authorship(&self, repo_path: &str, emails: &[String]) -> bool {
        let repo = match Repository::open(repo_path) {
            Ok(r) => r,
            Err(_) => return false,
        };

        let mut revwalk = match repo.revwalk() {
            Ok(rw) => rw,
            Err(_) => return false,
        };

        //Push HEAD to start iterating through history of commits
        if revwalk.push_head().is_err() {
            return false;
        }


        // Check last 100 commits for a match
        for id in revwalk.take(100) {
            if let Ok(commit_id) = id {
                if let Ok(commit) = repo.find_commit(commit_id) {
                    let author = commit.author();
                    if let Some(email) = author.email() {
                        if emails.iter().any(|e| e.to_lowercase() == email.to_lowercase()) {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }
}