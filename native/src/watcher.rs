//! File watcher using `notify` v6 — replaces Node.js fs.watch.
//!
//! Exposes a Rust-managed watcher that sends change events to JavaScript
//! via an N-API threadsafe function callback.

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;

// ─────────────────────────────────────────────────────────────────────────────
// Watch event types (mirrors engine/src/watch.ts contract)
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq)]
pub enum WatchEventKind {
    Add,
    Change,
    Remove,
    #[allow(dead_code)]
    Rename,
}

impl WatchEventKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Add => "add",
            Self::Change => "change",
            Self::Remove => "unlink",
            Self::Rename => "rename",
        }
    }
}

#[derive(Debug, Clone)]
pub struct WatchEvent {
    pub kind: WatchEventKind,
    pub path: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Watcher handle (keeps the watcher alive)
// ─────────────────────────────────────────────────────────────────────────────

pub struct WatcherHandle {
    _watcher: RecommendedWatcher,
}

/// Start watching `root_dir` recursively.
/// `on_event` is called on the notify thread for every relevant FS change.
///
/// Returns a `WatcherHandle` — dropping it stops the watcher.
pub fn start_watch<F>(root_dir: &str, on_event: F) -> Result<WatcherHandle, notify::Error>
where
    F: Fn(WatchEvent) + Send + 'static,
{
    let on_event = Arc::new(Mutex::new(on_event));

    let handler = {
        let on_event = Arc::clone(&on_event);
        move |res: Result<Event, notify::Error>| {
            let Ok(event) = res else { return };

            let kind = match &event.kind {
                EventKind::Create(_) => WatchEventKind::Add,
                EventKind::Modify(_) => WatchEventKind::Change,
                EventKind::Remove(_) => WatchEventKind::Remove,
                _ => return, // skip Access, Other, etc.
            };

            for path_buf in &event.paths {
                // Only watch JS/TS source files and CSS
                let ext = path_buf.extension().and_then(|e| e.to_str()).unwrap_or("");
                if !matches!(ext, "ts" | "tsx" | "js" | "jsx" | "mjs" | "cjs" | "css") {
                    continue;
                }
                // Skip node_modules, .git, dist, .next
                let path_str = path_buf.to_string_lossy();
                if path_str.contains("node_modules")
                    || path_str.contains("/.git/")
                    || path_str.contains("/dist/")
                    || path_str.contains("/.next/")
                {
                    continue;
                }

                let ev = WatchEvent {
                    kind: kind.clone(),
                    path: path_str.to_string(),
                };

                if let Ok(cb) = on_event.lock() {
                    cb(ev);
                }
            }
        }
    };

    let config = Config::default().with_poll_interval(Duration::from_millis(500));

    let mut watcher = RecommendedWatcher::new(handler, config)?;
    watcher.watch(Path::new(root_dir), RecursiveMode::Recursive)?;

    Ok(WatcherHandle { _watcher: watcher })
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn event_kind_as_str() {
        assert_eq!(WatchEventKind::Add.as_str(), "add");
        assert_eq!(WatchEventKind::Change.as_str(), "change");
        assert_eq!(WatchEventKind::Remove.as_str(), "unlink");
        assert_eq!(WatchEventKind::Rename.as_str(), "rename");
    }

    #[test]
    fn watcher_starts_on_real_dir() {
        let events = Arc::new(Mutex::new(Vec::<WatchEvent>::new()));
        let events_clone = Arc::clone(&events);

        // Watch a directory that actually exists
        let handle = start_watch("/tmp", move |ev| {
            events_clone.lock().unwrap().push(ev);
        });

        assert!(handle.is_ok(), "watcher should start on /tmp");
        // handle drop stops the watcher
    }
}
