use crate::server_commands::performance_types::{ClientInfo, PerformanceState};
use chrono::Utc;
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc::UnboundedSender;
use warp::ws::Message;
use uuid::Uuid;
use crate::state::AppState;
use std::collections::{HashMap, HashSet};
use sha2::{Sha256, Digest};
use tokio::fs;


/// Main entry point for handling incoming WebSocket messages
pub async fn handle_message(
    msg: &str,
    perf_state: Arc<tokio::sync::Mutex<PerformanceState>>,
    app_state: Arc<AppState>,
    sender: UnboundedSender<Result<Message, warp::Error>>,
) -> Option<Message> {
    // Parse incoming string as JSON
    let parsed: Value = match serde_json::from_str(msg) {
        Ok(val) => val,
        Err(_) => {
            return Some(Message::text(
                r#"{"type":"error","message":"Invalid JSON"}"#,
            ));
        }
    };

    match parsed.get("type").and_then(Value::as_str).unwrap_or("") {
        "ping" => Some(Message::text(r#"{"type":"pong"}"#)),
        "j" => handle_join(&parsed, perf_state.clone(), sender.clone()).await,
        "rj" => handle_rejoin(&parsed, perf_state.clone(), sender.clone()).await,
        "time_request" => handle_time_request(&parsed),
        "ready" => handle_ready(app_state.clone(), &parsed, perf_state.clone(), sender.clone()).await,
        "file_request" => handle_file_request(&parsed, perf_state.clone(), sender.clone(), app_state.clone()).await,
        _ => Some(Message::text(r#"{"type":"error","message":"Unknown message type"}"#)),
    }
}

/// Handle a time_request message by replying with a tq_result
fn handle_time_request(parsed: &Value) -> Option<Message> {
    let client_ts = parsed.get("client_time").and_then(Value::as_i64).unwrap_or(0);
    let server_ts = Utc::now().timestamp_millis();
    let resp = json!({
        "type": "tq_result",
        "client_time": client_ts,
        "server_time": server_ts
    });
    println!("[time_request] {:?}", resp);
    Some(Message::text(resp.to_string()))
}

/// Handle a new client joining the session
pub async fn handle_join(
    parsed: &Value,
    state: Arc<tokio::sync::Mutex<PerformanceState>>,
    sender: UnboundedSender<Result<Message, warp::Error>>,
) -> Option<Message> {
    // Extract seat as String
    let seat = parsed
        .get("seat")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| parsed.get("seat").and_then(Value::as_i64).map(|n| n.to_string()))
        .unwrap_or_else(|| "".to_string());

    if seat.is_empty() {
        let err = json!({"type":"error","message":"Invalid seat format"});
        return Some(Message::text(err.to_string()));
    }

    // Lock to access TTL and insert data
    let mut locked = state.lock().await;

    if locked.seat_map.contains_key(&seat) {
        let err = json!({"type":"error","message":"Seat is already taken"});
        return Some(Message::text(err.to_string()));
    }

    let client_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now().timestamp_millis() as u64 + locked.session_ttl_ms;

    locked.id_map.insert(client_id.clone(), seat.clone());
    locked.seat_map.insert(
        seat.clone(),
        ClientInfo {
            id: client_id.clone(),
            expires_at,
            sender: Some(sender.clone()),
        },
    );

    // Reply
    let resp = json!({
        "type": "joined",
        "id": client_id,
        "seat": seat,
        "expiresAt": expires_at
    });

    Some(Message::text(resp.to_string()))
}


/// Handle a client rejoining an existing session
pub async fn handle_rejoin(
    parsed: &Value,
    state: Arc<tokio::sync::Mutex<PerformanceState>>,
    sender: UnboundedSender<Result<Message, warp::Error>>,
) -> Option<Message> {
    // Extract client ID
    let client_id = parsed.get("id").and_then(Value::as_str).unwrap_or("");
    if client_id.is_empty() {
        let err = json!({"type":"error","message":"Rejoin failed: missing id"});
        return Some(Message::text(err.to_string()));
    }

    let mut locked = state.lock().await;

    // Retrieve seat for this client
    let seat = match locked.id_map.get(client_id) {
        Some(s) => s.clone(),
        None => {
            let err = json!({"type":"error","message":"Rejoin failed: session not found"});
            return Some(Message::text(err.to_string()));
        }
    };

    // Update or recreate ClientInfo for the seat
    let expires_at = locked.seat_map.get(&seat)?.expires_at;
    locked.seat_map.insert(
        seat.clone(),
        ClientInfo {
            id: client_id.to_string(),
            expires_at,
            sender: Some(sender.clone()),
        },
    );

    // Reply
    let resp = json!({
        "type": "joined",
        "id": client_id,
        "seat": seat,
        "expiresAt": expires_at
    });

    Some(Message::text(resp.to_string()))
}

pub async fn handle_ready(
    app_state: Arc<AppState>,
    parsed: &Value,
    perf_state: Arc<Mutex<PerformanceState>>,
    _sender: UnboundedSender<Result<Message, warp::Error>>,
) -> Option<Message> {
    // Extract client ID
    let client_id = parsed.get("id").and_then(Value::as_str).unwrap_or("");
    if client_id.is_empty() {
        let err = json!({"type":"error","message":"missing id"});
        return Some(Message::text(err.to_string()));
    }

    let locked = perf_state.lock().await;
    let seat = match locked.id_map.get(client_id) {
        Some(s) => s.clone(),
        None => {
            let err = json!({"type":"error","message":"Client ID is no longer valid"});
            return Some(Message::text(err.to_string()));
        }
    };

    let seat_index: usize = match seat.parse() {
        Ok(index) => index,
        Err(_) => {
            let err = json!({"type":"error","message":"Seat must be a valid number"});
            return Some(Message::text(err.to_string()));
        }
    };

    let phases_map = app_state.phases.lock().await;

    let id_pairs: Vec<(Option<String>, Option<String>)> = phases_map
        .values()
        .filter_map(|phase| {
            phase.assignments.get(seat_index).map(|assign| {
                (assign.rnbo_id.clone(), assign.sheet_id.clone())
            })
        })
        .collect();

    let rnbo_ids: HashSet<String> = id_pairs.iter().filter_map(|(r, _)| r.clone()).collect();
    let sheet_ids: HashSet<String> = id_pairs.iter().filter_map(|(_, s)| s.clone()).collect();

    println!("[ready] rnbo_ids and sheet_ids for seat {}: {:?}", seat_index, rnbo_ids);

    let rnbo_lookup: HashMap<String, String> = app_state
        .rnbo_patches
        .lock()
        .await
        .iter()
        .map(|item| (item.id.clone(), item.path.clone()))
        .collect();

    let sheet_lookup: HashMap<String, String> = app_state
        .sheet_music
        .lock()
        .await
        .iter()
        .map(|item| (item.id.clone(), item.path.clone()))
        .collect();

    async fn hash_file(path: &str) -> Option<String> {
        let data = fs::read(path).await.ok()?;
        Some(hex::encode(Sha256::digest(&data)))
    }

    let mut patch_list = Vec::new();
    for id in &rnbo_ids {
        if let Some(path) = rnbo_lookup.get(id) {
            if let Some(hash) = hash_file(path).await {
                patch_list.push(json!({ "name": id, "hash": hash }));
            }
        }
    }

    let mut sheet_list = Vec::new();
    for id in &sheet_ids {
        if let Some(path) = sheet_lookup.get(id) {
            if let Some(hash) = hash_file(path).await {
                sheet_list.push(json!({ "name": id, "hash": hash }));
            }
        }
    }

    let manifest = json!({
        "type": "file_manifest",
        "patch_files": patch_list,
        "sheet_files": sheet_list
    });

    Some(Message::text(manifest.to_string()))
}

pub async fn handle_file_request(
    parsed: &Value,
    _perf_state: Arc<Mutex<PerformanceState>>,
    sender: UnboundedSender<Result<Message, warp::Error>>,
    app_state: Arc<AppState>,
) -> Option<Message> {
    let file_id = match parsed.get("id").and_then(Value::as_str) {
        Some(s) => s.to_string(),
        None => {
            let err = json!({"type":"error","message":"missing file id"});
            return Some(Message::text(err.to_string()));
        }
    };

    let file_type = match parsed.get("fileType").and_then(Value::as_str) {
        Some(s) => s,
        None => {
            let err = json!({"type":"error","message":"missing fileType"});
            return Some(Message::text(err.to_string()));
        }
    };

    let (lookup_vec, type_str) = if file_type == "patch" {
        let rnbo = app_state.rnbo_patches.lock().await.clone();
        let list: Vec<(String, String)> = rnbo.into_iter().map(|item| (item.id, item.path)).collect();
        (list, "patch")
    } else if file_type == "sheet" {
        let sheets = app_state.sheet_music.lock().await.clone();
        let list = sheets.into_iter().map(|item| (item.id, item.path)).collect();
        (list, "sheet")
    } else {
        let err = json!({"type":"error","message":"unknown fileType"});
        return Some(Message::text(err.to_string()));
    };

    let path = match lookup_vec.into_iter().find(|(id, _)| id == &file_id) {
        Some((_, p)) => p,
        None => {
            let err = json!({"type":"error","message":"file not found"});
            let _ = sender.send(Ok(Message::text(err.to_string())));
            return None;
        }
    };

    let sender = sender.clone();
    let file_id_clone = file_id.clone();
    let type_str = type_str.to_string();

    tokio::spawn(async move {
        let data = match fs::read(&path).await {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Failed to read {}: {}", path, e);
                return;
            }
        };

        const CHUNK_SZ: usize = 64 * 1024;
        let total_chunks = (data.len() + CHUNK_SZ - 1) / CHUNK_SZ;

        for (i, chunk) in data.chunks(CHUNK_SZ).enumerate() {
            let is_last = (i + 1) == total_chunks;
            let header = json!({
                "type":     "file_chunk",
                "id":       file_id_clone,
                "fileType": type_str,
                "isLast":   is_last
            })
            .to_string();

            let mut buf = Vec::with_capacity(4 + header.len() + chunk.len());
            buf.extend((header.len() as u32).to_be_bytes());
            buf.extend(header.as_bytes());
            buf.extend(chunk);
            println!("Sending chunk {}, header len = {}, header = {}", i, header.len(), header);

            if let Err(e) = sender.send(Ok(Message::binary(buf))) {
                eprintln!("Error sending chunk {}: {:?}", i, e);
                break;
            }
        }
    });

    None
}

pub async fn broadcast_to_all(state: Arc<tokio::sync::Mutex<PerformanceState>>, json_msg: Value) {
    let msg = match serde_json::to_string(&json_msg) {
        Ok(s) => Message::text(s),
        Err(_) => return,
    };

    let locked = state.lock().await;
    for (seat, client_info) in locked.seat_map.iter() {
        println!(
            "[broadcast] seat={} sender_present={}",
            seat,
            client_info.sender.is_some()
        );
        if let Some(sender) = &client_info.sender {
            if let Err(e) = sender.send(Ok(msg.clone())) {
                println!("[broadcast] failed to send to seat {}: {:?}", seat, e);
            }
        }
    }
}
