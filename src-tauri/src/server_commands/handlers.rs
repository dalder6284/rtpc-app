use crate::server_commands::performance_types::{ClientInfo, PerformanceState};
use chrono::Utc;
use serde_json::{json, Value};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc::UnboundedSender;
use warp::ws::Message;
use uuid::Uuid;

/// Main entry point for handling incoming WebSocket messages
pub async fn handle_message(
    msg: &str,
    state: Arc<Mutex<PerformanceState>>,
    sender: UnboundedSender<Result<Message, warp::Error>>,  // new connection sender
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
        "j" => handle_join(&parsed, state.clone(), sender.clone()),
        "rj" => handle_rejoin(&parsed, state.clone(), sender.clone()),
        "time_request" => handle_time_request(&parsed),
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
pub fn handle_join(
    parsed: &Value,
    state: Arc<Mutex<PerformanceState>>,
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

    // Create new client ID and expiration
    let client_id = Uuid::new_v4().to_string();
    let expires_at = Utc::now().timestamp_millis() as u64
        + state.lock().ok()?.session_ttl_ms;

    // Insert into state
    let mut locked = state.lock().ok()?;
    if locked.seat_map.contains_key(&seat) {
        let err = json!({"type":"error","message":"Seat is already taken"});
        return Some(Message::text(err.to_string()));
    }
    locked.id_map.insert(client_id.clone(), seat.clone());
    locked.seat_map.insert(
        seat.clone(),
        ClientInfo { id: client_id.clone(), expires_at, sender: Some(sender.clone()) },
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
pub fn handle_rejoin(
    parsed: &Value,
    state: Arc<Mutex<PerformanceState>>,
    sender: UnboundedSender<Result<Message, warp::Error>>,
) -> Option<Message> {
    // Extract client ID
    let client_id = parsed.get("id").and_then(Value::as_str).unwrap_or("");
    if client_id.is_empty() {
        let err = json!({"type":"error","message":"Rejoin failed: missing id"});
        return Some(Message::text(err.to_string()));
    }

    let mut locked = state.lock().ok()?;
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
        ClientInfo { id: client_id.to_string(), expires_at, sender: Some(sender.clone()) },
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

/// Broadcast a JSON message to all connected clients
pub fn broadcast_to_all(state: Arc<Mutex<PerformanceState>>, json_msg: Value) {
    let msg = match serde_json::to_string(&json_msg) {
        Ok(s) => Message::text(s),
        Err(_) => return,
    };
    if let Ok(locked) = state.lock() {
        for (seat, client_info) in locked.seat_map.iter() {
            println!("[broadcast] seat={} sender_present={}", seat, client_info.sender.is_some());
            if let Some(sender) = &client_info.sender {
                if let Err(e) = sender.send(Ok(msg.clone())) {
                    println!("[broadcast] failed to send to seat {}: {:?}", seat, e);
                }
            }
        }
    }
}
