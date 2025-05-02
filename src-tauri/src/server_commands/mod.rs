// src/server_commands/mod.rs

pub mod server_controller;
pub mod performance_types;
pub mod handlers;
use std::sync::Arc;
use local_ip_address::local_ip;
use serde_json::Value;
use tauri::State;
use crate::state::AppState;

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
        broadcast_to_all(controller.state.clone(), message).await;
        Ok(())
    } else {
        Err("Server not running.".into())
    }
}
