// src/server_commands/mod.rs

pub mod server_controller;
pub mod performance_types;
pub mod handlers;
use std::sync::Arc;
use chrono::Utc;
use local_ip_address::local_ip;
use serde_json::{json, Value};
use tauri::State;
use crate::state::{AppState, PhaseStartPayload, AssignmentPayload};
use std::collections::HashMap;

use self::server_controller::{ServerController, ServerManager};
use self::handlers::broadcast_to_all;

/// Start the TLS-enabled WebSocket server
#[tauri::command]
pub async fn start_server(
    manager: State<'_, ServerManager>,
    app_state: State<'_, Arc<AppState>>,
    ws_port: u16,
    ttl_ms: u64,
) -> Result<(), String> {
    let mut ctrl = ServerController::new(ttl_ms, app_state.inner().clone());
    ctrl.start_tls(ws_port)?;
    *manager.controller.lock().await = Some(ctrl);
    Ok(())
}

// Stop the server and reset state
#[tauri::command]
pub async fn stop_server(
    manager: State<'_, ServerManager>,
) -> Result<(), String> {
    if let Some(ctrl) = manager.controller.lock().await.as_mut() {
        ctrl.stop().await;
        Ok(())
    } else {
        Err("Server not running".into())
    }
}

/// Get the machine's local IP address
#[tauri::command]
pub fn get_local_ip() -> Result<String, String> {
    local_ip()
        .map(|ip| ip.to_string())
        .map_err(|e| format!("Failed to get local IP: {}", e))
}

/// Broadcast a JSON payload to all connected clients
#[tauri::command]
pub async fn broadcast_json(
    manager: State<'_, ServerManager>,
    message: Value,
) -> Result<(), String> {
    if let Some(controller) = manager.controller.lock().await.as_ref() {
        broadcast_to_all(controller.perf_state.clone(), message).await;
        Ok(())
    } else {
        Err("Server not running.".into())
    }
}

#[tauri::command]
pub async fn broadcast_phase_start(
    manager: State<'_, ServerManager>,
    app_state: State<'_, Arc<AppState>>,
    phase_id: String,
  ) -> Result<(), String> {
    // 1. Grab the phase out of AppState
    let phases_map = app_state.phases.lock().await;
    let phase = phases_map
      .get(&phase_id)
      .cloned()
      .ok_or_else(|| format!("Phase `{}` not found", phase_id))?;
    drop(phases_map);
  
    // 2. Turn Vec<SeatAssignment> → HashMap<seat_string, AssignmentPayload>
    let assignments: HashMap<_, _> = phase
      .assignments
      .into_iter()
      .enumerate()
      .filter_map(|(i, sa)| {
        match (sa.rnbo_id, sa.sheet_id) {
          (Some(rnbo), Some(sheet)) => Some((
            i.to_string(),
            AssignmentPayload { rnbo_id: rnbo, sheet_id: sheet },
          )),
          _ => None,
        }
      })
      .collect();
  
    // 3. Now timestamp in ms
    let start_time = Utc::now().timestamp_millis();
  
    // 4. Build your strongly-typed payload
    let payload = PhaseStartPayload {
      msg_type: "phase_start",
      bpm: phase.bpm,
      start_time,
      assignments,
    };
  
    // 5. Broadcast via your WebSocket manager
    let guard = manager.controller.lock().await;
    if let Some(ctrl) = guard.as_ref() {
      // clone only the Arc-backed perf_state
      broadcast_to_all(ctrl.perf_state.clone(), json!(payload)).await;
      Ok(())
    } else {
      Err("Server is not running".into())
    }
  }

