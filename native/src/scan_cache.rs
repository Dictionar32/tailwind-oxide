//! In-memory scan cache using DashMap for concurrent access.
//!
//! This replaces scanner/src/cache.ts and smart-cache.ts with a Rust
//! implementation that holds the cache in process memory (zero I/O on
//! hot paths) and persists to disk on demand.

use dashmap::DashMap;
use once_cell::sync::Lazy;
use std::time::{SystemTime, UNIX_EPOCH};

// ─────────────────────────────────────────────────────────────────────────────
// Global in-memory cache (process-lifetime, shared across all scan calls)
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone)]
pub struct CacheEntry {
    pub classes: Vec<String>,
    pub content_hash: String,
    #[allow(dead_code)]
    pub mtime_ms: f64,
    #[allow(dead_code)]
    pub size: u32,
    pub hit_count: u32,
    pub last_seen_ms: f64,
}

static SCAN_CACHE: Lazy<DashMap<String, CacheEntry>> = Lazy::new(DashMap::new);

fn now_ms() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64() * 1000.0)
        .unwrap_or(0.0)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public cache API
// ─────────────────────────────────────────────────────────────────────────────

/// Get cached classes for a file if the hash still matches.
/// Returns `None` on cache miss or hash mismatch (file changed).
pub fn cache_get(file_path: &str, current_hash: &str) -> Option<Vec<String>> {
    let mut entry = SCAN_CACHE.get_mut(file_path)?;
    if entry.content_hash != current_hash {
        return None; // stale
    }
    entry.hit_count += 1;
    entry.last_seen_ms = now_ms();
    Some(entry.classes.clone())
}

/// Store extraction result in the in-memory cache.
pub fn cache_put(file_path: &str, hash: &str, classes: Vec<String>, mtime_ms: f64, size: u32) {
    SCAN_CACHE.insert(
        file_path.to_string(),
        CacheEntry {
            classes,
            content_hash: hash.to_string(),
            mtime_ms,
            size,
            hit_count: 0,
            last_seen_ms: now_ms(),
        },
    );
}

/// Invalidate a single entry (file deleted or explicitly evicted).
pub fn cache_invalidate(file_path: &str) {
    SCAN_CACHE.remove(file_path);
}

/// Return count of cached entries.
pub fn cache_size() -> usize {
    SCAN_CACHE.len()
}

/// Priority score for a file — higher = process first.
/// Same formula as SmartCache JS but computed in Rust.
#[allow(dead_code)]
pub fn priority_score(mtime_ms: f64, size: u32, cached: Option<&CacheEntry>, now: f64) -> f64 {
    let Some(c) = cached else {
        return 1_000_000_000.0;
    };
    let delta = (mtime_ms - c.mtime_ms).max(0.0);
    let size_diff = (size as f64 - c.size as f64).abs();
    let recency = if c.last_seen_ms > 0.0 {
        now - c.last_seen_ms
    } else {
        0.0
    };
    delta * 1000.0 + size_diff * 10.0 + c.hit_count as f64 * 100.0 - recency / 1000.0
}

/// Dump all entries as (path, classes, hash, mtime_ms, size, hit_count) tuples.
/// Used by cache_write to persist to disk.
#[allow(dead_code)]
pub fn cache_dump() -> Vec<(String, CacheEntry)> {
    SCAN_CACHE
        .iter()
        .map(|e| (e.key().clone(), e.value().clone()))
        .collect()
}

/// Load entries from disk back into the in-memory cache.
#[allow(dead_code)]
pub fn cache_load(entries: Vec<(String, String, Vec<String>, f64, u32, u32)>) {
    for (path, hash, classes, mtime_ms, size, hit_count) in entries {
        SCAN_CACHE.insert(
            path,
            CacheEntry {
                classes,
                content_hash: hash,
                mtime_ms,
                size,
                hit_count,
                last_seen_ms: 0.0,
            },
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cache_miss_on_empty() {
        assert!(cache_get("/no/such/file.tsx", "hash").is_none());
    }

    #[test]
    fn cache_put_and_get_hit() {
        let path = "/tmp/test_scan_cache_button.tsx";
        cache_put(
            path,
            "abc123",
            vec!["bg-blue-500".into(), "text-white".into()],
            1000.0,
            512,
        );
        let result = cache_get(path, "abc123");
        assert!(result.is_some());
        let classes = result.unwrap();
        assert!(classes.contains(&"bg-blue-500".to_string()));
    }

    #[test]
    fn cache_miss_on_hash_mismatch() {
        let path = "/tmp/test_scan_cache_card.tsx";
        cache_put(path, "oldhash", vec!["flex".into()], 1000.0, 256);
        // File changed — different hash
        assert!(cache_get(path, "newhash").is_none());
    }

    #[test]
    fn cache_invalidate_removes_entry() {
        let path = "/tmp/test_scan_cache_rm.tsx";
        cache_put(path, "xyz", vec!["p-4".into()], 1000.0, 100);
        cache_invalidate(path);
        assert!(cache_get(path, "xyz").is_none());
    }

    #[test]
    fn priority_new_file_is_max() {
        let score = priority_score(1000.0, 512, None, 2000.0);
        assert!(score >= 1_000_000_000.0);
    }

    #[test]
    fn priority_changed_beats_unchanged() {
        let old = CacheEntry {
            classes: vec![],
            content_hash: "h".into(),
            mtime_ms: 800.0,
            size: 512,
            hit_count: 2,
            last_seen_ms: 900_000.0,
        };
        let changed = priority_score(1000.0, 512, Some(&old), 1_000_000.0);
        let unchanged = priority_score(800.0, 512, Some(&old), 1_000_000.0);
        assert!(
            changed > unchanged,
            "changed={changed} unchanged={unchanged}"
        );
    }
}
