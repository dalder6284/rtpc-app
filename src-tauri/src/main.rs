// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod design_commands;
mod server_commands;

use std::sync::Arc;

use state::AppState;
use server_controller::ServerManager;
use design_commands::*;
use server_commands::*;

use tauri_plugin_dialog;


fn main() {
    let app_state = Arc::new(AppState::default());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .manage(ServerManager::default())
        .invoke_handler(tauri::generate_handler![
            set_session_config,
            get_session_config,
            add_phase,
            remove_phase,
            edit_phase,
            set_current_phase,
            get_current_phase,
            clear_current_phase,
            add_rnbo_file,
            remove_rnbo_file,
            add_sheet_file,
            remove_sheet_file,
            select_palette_file,
            clear_selected_file,
            assign_selected_file_to_seat,
            unassign_file_from_seat,
            get_selected_file,
            get_assignments_for_phase,
            get_rnbo_item,
            get_sheet_item,
            save_session_to_file,
            load_session_from_file,
            get_app_state,

            start_server,
            stop_server,
            get_local_ip,
            broadcast_json,
            broadcast_phase_start
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application.");
}