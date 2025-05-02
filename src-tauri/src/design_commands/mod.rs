pub mod state;

use crate::design_commands::state::*;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{Emitter, State};

//
// Session Config
//

#[tauri::command]
pub async fn save_session_to_file(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    let session = state.session.lock().await;
    let path = session.as_ref().ok_or("No session loaded")?.path.clone();

    let save_state = SessionSaveState {
        config: session.clone().unwrap(), // safe unwrap because we just checked
        selected_file: state
            .selected_file
            .lock()
            .await
            .clone(),
        rnbo_patches: state.rnbo_patches.lock().await.clone(),
        sheet_music: state.sheet_music.lock().await.clone(),
        phases: state.phases.lock().await.clone(),
        current_phase_id: state
            .current_phase_id
            .lock()
            .await
            .clone(),
    };

    let json = serde_json::to_string_pretty(&save_state)
        .map_err(|e| format!("Serialization error: {}", e))?;

    fs::write(PathBuf::from(&path), json).map_err(|e| format!("Failed to write file: {}", e))?;

    println!("Session saved to {}", path);
    Ok(())
}

#[tauri::command]
pub async fn load_session_from_file(state: tauri::State<'_, Arc<AppState>>, path: String) -> Result<(), String> {
    let contents =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;

    let parsed: SessionSaveState =
        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    // apply parsed state to AppState
    {
        *state.session.lock().await = Some(parsed.config);
        *state.selected_file.lock().await = None;
        *state.rnbo_patches.lock().await = parsed.rnbo_patches;
        *state.sheet_music.lock().await = parsed.sheet_music;
        *state.phases.lock().await = parsed.phases;
        *state.current_phase_id.lock().await = parsed.current_phase_id;
    }

    println!("Session loaded from {}", path);
    Ok(())
}

#[tauri::command]
pub async fn get_app_state(state: tauri::State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let session = state.session.lock().await.clone();
    let selected_file = state.selected_file.lock().await.clone();
    let rnbo_patches = state.rnbo_patches.lock().await.clone();
    let sheet_music = state.sheet_music.lock().await.clone();
    let phases = state.phases.lock().await.clone();
    let current_phase_id = state.current_phase_id.lock().await.clone();

    serde_json::to_value(serde_json::json!({
        "session": session,
        "selected_file": selected_file,
        "rnbo_patches": rnbo_patches,
        "sheet_music": sheet_music,
        "phases": phases,
        "current_phase_id": current_phase_id
    }))
    .map_err(|e| format!("Serialization error: {}", e))
}


#[tauri::command]
pub async fn set_session_config(state: State<'_, AppState>, config: SessionConfig) -> Result<(), ()> {
    let mut session = state.session.lock().await;
    *session = Some(config);
    Ok(())
}

#[tauri::command]
pub async fn get_session_config(state: State<'_, AppState>) -> Result<Option<SessionConfig>, ()> {
    let session = state.session.lock().await;
    Ok(session.clone())
}

//
// Phase Config
//

#[tauri::command]
pub async fn add_phase(state: State<'_, AppState>, data: PhaseInit) -> Result<(), String> {
    let mut phases = state.phases.lock().await;

    if phases.contains_key(&data.id) {
        return Err("Phase already exists with that ID".into());
    }

    let config = state
        .session
        .lock()
        .await
        .clone()
        .ok_or("Session config is not set yet.")?;

    let total_seats = config.rows * config.columns;
    let assignments: Vec<SeatAssignment> = vec![
        SeatAssignment {
            rnbo_id: None,
            sheet_id: None,
        };
        total_seats
    ];

    phases.insert(
        data.id.clone(),
        Phase {
            name: data.name,
            bpm: data.bpm,
            count_in: data.count_in,
            assignments,
            index: data.index,
        },
    );

    println!("Current phases: {:#?}", phases);
    Ok(())
}


#[tauri::command]
pub async fn remove_phase(state: State<'_, AppState>, phase_id: String) -> Result<(), String> {
    let mut phases = state.phases.lock().await;

    if phases.remove(&phase_id).is_none() {
        return Err("Phase not found.".into());
    }

    let mut current_phase = state.current_phase_id.lock().await;
    if current_phase.as_deref() == Some(&phase_id) {
        *current_phase = None;
    }

    println!("Current phases: {:#?}", phases);
    Ok(())
}


#[tauri::command]
pub async fn edit_phase(
    state: tauri::State<'_, Arc<AppState>>,
    phase_id: String,
    updates: PhaseUpdate,
) -> Result<(), String> {
    let mut phases = state.phases.lock().await;

    let phase = phases.get_mut(&phase_id).ok_or("Phase not found.")?;

    if let Some(name) = updates.name {
        phase.name = if name.trim().is_empty() {
            "(untitled phase)".to_string()
        } else {
            name
        };
    }
    if let Some(bpm) = updates.bpm {
        phase.bpm = bpm;
    }
    if let Some(count_in) = updates.count_in {
        phase.count_in = count_in;
    }

    println!("Current phases: {:#?}", phases);
    Ok(())
}


#[tauri::command]
pub async fn set_current_phase(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    phase_id: String,
) -> Result<(), String> {
    let phases = state.phases.lock().await;
    if !phases.contains_key(&phase_id) {
        return Err("Phase ID not found.".into());
    }
    drop(phases); // unlock before locking again

    let mut current = state.current_phase_id.lock().await;
    *current = Some(phase_id.clone());

    println!("Current phase set to: {}", phase_id);

    app.emit("phase-changed", phase_id.clone())
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}


#[tauri::command]
pub async fn get_current_phase(state: tauri::State<'_, Arc<AppState>>) -> Result<Option<String>, ()> {
    let current = state.current_phase_id.lock().await;
    Ok(current.clone())
}

#[tauri::command]
pub async fn clear_current_phase(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
) -> Result<(), String> {
    let mut current = state.current_phase_id.lock().await;

    *current = None;
    println!("Current phase cleared.");

    app.emit("phase-changed", "")
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}


//
// Canvas
//

//
// Palette Item
//

#[tauri::command]
pub async fn add_rnbo_file(state: tauri::State<'_, Arc<AppState>>, item: RNBOPaletteItem) -> Result<(), String> {
    let mut rnbo = state.rnbo_patches.lock().await;
    rnbo.push(item);

    println!("Current RNBO files:");
    for f in rnbo.iter() {
        println!("- {} ({})", f.label, f.path);
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_rnbo_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let mut patches = state.rnbo_patches.lock().await;
    patches.retain(|item| item.id != id);

    // Also clear any references in phase assignments
    let mut phases = state.phases.lock().await;
    for phase in phases.values_mut() {
        for seat in &mut phase.assignments {
            if seat.rnbo_id.as_deref() == Some(&id) {
                seat.rnbo_id = None;
            }
        }
    }

    app.emit("palette-item-removed", id.clone()).ok();

    Ok(())
}


#[tauri::command]
pub async fn add_sheet_file(state: tauri::State<'_, Arc<AppState>>, item: SheetPaletteItem) -> Result<(), String> {
    let mut sheet = state.sheet_music.lock().await;
    sheet.push(item);

    println!("Current sheet files:");
    for f in sheet.iter() {
        println!("- {} ({})", f.label, f.path);
    }

    Ok(())
}

#[tauri::command]
pub async fn remove_sheet_file(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<AppState>>,
    id: String,
) -> Result<(), String> {
    let mut sheets = state.sheet_music.lock().await;
    sheets.retain(|item| item.id != id);

    // Also clear any references in phase assignments
    let mut phases = state.phases.lock().await;
    for phase in phases.values_mut() {
        for seat in &mut phase.assignments {
            if seat.sheet_id.as_deref() == Some(&id) {
                seat.sheet_id = None;
            }
        }
    }

    app.emit("palette-item-removed", id.clone()).ok();

    Ok(())
}


#[tauri::command]
pub async fn get_selected_file(state: tauri::State<'_, Arc<AppState>>) -> Result<Option<SelectedFile>, String> {
    let selected = state.selected_file.lock().await;
    Ok(selected.clone())
}

#[tauri::command]
pub async fn select_palette_file(
    state: tauri::State<'_, Arc<AppState>>,
    id: String,
    file_type: String,
) -> Result<(), String> {
    let selected = match file_type.as_str() {
        "rnbo" => {
            let rnbo = state.rnbo_patches.lock().await;
            let file = rnbo.iter().find(|f| f.id == id).ok_or("RNBO file not found")?;
            SelectedFile {
                id: file.id.clone(),
                label: file.label.clone(),
                path: file.path.clone(),
                color: file.color.clone(),
                file_type: "rnbo".into(),
            }
        }
        "sheet" => {
            let sheet = state.sheet_music.lock().await;
            let file = sheet.iter().find(|f| f.id == id).ok_or("Sheet file not found")?;
            SelectedFile {
                id: file.id.clone(),
                label: file.label.clone(),
                path: file.path.clone(),
                color: file.color.clone(),
                file_type: "sheet".into(),
            }
        }
        _ => return Err("Invalid type".into()),
    };

    let mut selected_file = state.selected_file.lock().await;
    *selected_file = Some(selected);

    println!("Selected file updated.");

    Ok(())
}


#[tauri::command]
pub async fn clear_selected_file(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut selected = state.selected_file.lock().await;
    *selected = None;

    println!("Selected file cleared.");
    Ok(())
}

#[tauri::command]
pub async fn assign_selected_file_to_seat(
    state: tauri::State<'_, Arc<AppState>>,
    phase_id: String,
    seat_index: usize,
    file_id: String,
    file_type: String,
) -> Result<(), String> {
    let mut phases = state.phases.lock().await;
    let phase = phases.get_mut(&phase_id).ok_or("Phase not found")?;

    if seat_index >= phase.assignments.len() {
        return Err("Invalid seat index".into());
    }

    let assignment = &mut phase.assignments[seat_index];
    match file_type.as_str() {
        "rnbo" => assignment.rnbo_id = Some(file_id.clone()),
        "sheet" => assignment.sheet_id = Some(file_id.clone()),
        _ => return Err("Invalid file type".into()),
    }

    println!("Seat {seat_index} updated with {file_type} {file_id}");
    Ok(())
}

#[tauri::command]
pub async fn unassign_file_from_seat(
    state: State<'_, AppState>,
    phase_id: String,
    seat_index: usize,
    file_type: String,
) -> Result<(), String> {
    let mut phases = state.phases.lock().await;
    let phase = phases.get_mut(&phase_id).ok_or("Phase not found")?;

    if seat_index >= phase.assignments.len() {
        return Err("Invalid seat index".into());
    }

    let assignment = &mut phase.assignments[seat_index];

    match file_type.as_str() {
        "rnbo" => assignment.rnbo_id = None,
        "sheet" => assignment.sheet_id = None,
        _ => return Err("Invalid file type".into()),
    }

    println!("Unassigned {file_type} from seat {seat_index}");
    Ok(())
}

#[tauri::command]
pub async fn get_assignments_for_phase(
    state: tauri::State<'_, Arc<AppState>>,
    phase_id: String,
) -> Result<Vec<SeatAssignment>, String> {
    let phases = state.phases.lock().await;
    let phase = phases.get(&phase_id).ok_or("Phase not found")?;

    Ok(phase.assignments.clone())
}


#[tauri::command]
pub async fn get_rnbo_item(state: tauri::State<'_, Arc<AppState>>, id: String) -> Result<RNBOPaletteItem, String> {
    let rnbo = state.rnbo_patches.lock().await;

    rnbo.iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| format!("No RNBO item found with id {}", id))
}

#[tauri::command]
pub async fn get_sheet_item(
    state: tauri::State<'_, Arc<AppState>>,
    id: String,
) -> Result<SheetPaletteItem, String> {
    let sheet = state.sheet_music.lock().await;

    sheet
        .iter()
        .find(|item| item.id == id)
        .cloned()
        .ok_or_else(|| format!("No sheet item found with id {}", id))
}
