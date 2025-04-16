use crate::state::*;
use tauri::{App, State};

//
// Session Config
//

#[tauri::command]
pub fn set_session_config(state: State<AppState>, config: SessionConfig) {
    let mut session = state.session.lock().unwrap();
    *session = Some(config)
}

#[tauri::command]
pub fn get_session_config(state: State<AppState>) -> Option<SessionConfig> {
    let session = state.session.lock().unwrap();
    session.clone()
}

//
// Phase Config
//

#[tauri::command]
pub fn add_phase(state: State<AppState>, data: PhaseInit) -> Result<(), String> {
    let mut phases = state
        .phases
        .lock()
        .map_err(|_| "Failed to lock phase map.")?;

    if phases.contains_key(&data.id) {
        return Err("Phase already exists with that ID".into());
    }

    phases.insert(
        data.id.clone(),
        Phase {
            name: data.name,
            bpm: data.bpm,
            count_in: data.count_in,
            assignments: Vec::new(),
        },
    );
    println!("Current phases: {:#?}", phases);

    Ok(())
}

#[tauri::command]
pub fn remove_phase(state: State<AppState>, phase_id: String) -> Result<(), String> {
    let mut phases = state
        .phases
        .lock()
        .map_err(|_| "Failed to lock phase map.")?;

    if phases.remove(&phase_id).is_none() {
        return Err("Phase not found.".into());
    }

    let mut current_phase = state.current_phase_id.lock().unwrap();
    if current_phase.as_deref() == Some(&phase_id) {
        *current_phase = None;
    }
    println!("Current phases: {:#?}", phases);

    Ok(())
}

#[tauri::command]
pub fn edit_phase(
    state: tauri::State<AppState>,
    phase_id: String,
    updates: PhaseUpdate,
) -> Result<(), String> {
    let mut phases = state
        .phases
        .lock()
        .map_err(|_| "Failed to lock phase map.")?;

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
pub fn set_current_phase(state: State<AppState>, phase_id: String) -> Result<(), String> {
    let phases = state
        .phases
        .lock()
        .map_err(|_| "Failed to lock phase map.")?;
    if !phases.contains_key(&phase_id) {
        return Err("Phase ID not found.".into());
    }
    drop(phases); // unlock before locking again

    let mut current = state
        .current_phase_id
        .lock()
        .map_err(|_| "Failed to lock current phase.")?;

    *current = Some(phase_id.clone());

    println!("Current phase set to: {}", phase_id);

    Ok(())
}

#[tauri::command]
pub fn get_current_phase(state: tauri::State<AppState>) -> Option<String> {
    state.current_phase_id.lock().ok().and_then(|p| p.clone())
}

#[tauri::command]
pub fn clear_current_phase(state: tauri::State<AppState>) -> Result<(), String> {
    let mut current = state
        .current_phase_id
        .lock()
        .map_err(|_| "Failed to lock current phase.")?;

    *current = None;
    println!("Current phase cleared.");

    Ok(())
}

//
// Canvas
//

// #[tauri::command]
// pub fn get_current_phase(state: State<AppState>) -> Option<String> {
//     state.current_phase_id.lock().unwrap().clone()
// }
// Change this to emitting the phase

//
// Palette Item
//

#[tauri::command]
pub fn add_rnbo_file(
    state: tauri::State<AppState>,
    item: RNBOPaletteItem,
) -> Result<(), String> {
    let mut rnbo = state.rnbo_patches.lock().map_err(|_| "Lock error")?;
    rnbo.push(item);

    println!("Current RNBO files:");
    for f in rnbo.iter() {
        println!("- {} ({})", f.label, f.path);
    }

    Ok(())
}

#[tauri::command]
pub fn remove_rnbo_file(
    state: tauri::State<AppState>,
    id: String,
) -> Result<(), String> {
    let mut rnbo = state.rnbo_patches.lock().map_err(|_| "Lock error")?;
    let before_len = rnbo.len();

    rnbo.retain(|item| item.id != id);

    if rnbo.len() == before_len {
        return Err("RNBO file not found.".into());
    }

    println!("RNBO file removed. Remaining files:");
    for f in rnbo.iter() {
        println!("- {} ({})", f.label, f.path);
    }

    Ok(())
}

#[tauri::command]
pub fn add_sheet_file(
    state: tauri::State<AppState>,
    item: SheetPaletteItem,
) -> Result<(), String> {
    let mut sheet = state.sheet_music.lock().map_err(|_| "Lock error")?;
    sheet.push(item);

    println!("Current sheet files:");
    for f in sheet.iter() {
        println!("- {} ({})", f.label, f.path);
    }

    Ok(())
}

#[tauri::command]
pub fn remove_sheet_file(
    state: tauri::State<AppState>,
    id: String,
) -> Result<(), String> {
    let mut sheet = state.sheet_music.lock().map_err(|_| "Lock error")?;
    let before_len = sheet.len();

    sheet.retain(|item| item.id != id);

    if sheet.len() == before_len {
        return Err("Sheet music file not found.".into());
    }

    println!("Sheet file removed. Remaining files:");
    for f in sheet.iter() {
        println!("- {} ({})", f.label, f.path);
    }

    Ok(())
}

#[tauri::command]
pub fn select_palette_file(
    state: tauri::State<AppState>,
    id: String,
    file_type: String,
) -> Result<(), String> {
    let selected = match file_type.as_str() {
        "rnbo" => {
            let rnbo = state.rnbo_patches.lock().map_err(|_| "Lock error")?;
            let file = rnbo.iter().find(|f| f.id == id).ok_or("RNBO file not found")?;
            SelectedFile {
                id: file.id.clone(),
                label: file.label.clone(),
                path: file.path.clone(),
                color: file.color.clone(),
                file_type: "rnbo".into(),
            }
        },
        "sheet" => {
            let sheet = state.sheet_music.lock().map_err(|_| "Lock error")?;
            let file = sheet.iter().find(|f| f.id == id).ok_or("Sheet file not found")?;
            SelectedFile {
                id: file.id.clone(),
                label: file.label.clone(),
                path: file.path.clone(),
                color: file.color.clone(),
                file_type: "sheet".into(),
            }
        },
        _ => return Err("Invalid type".into()),
    };

    let mut selected_file = state.selected_file.lock().map_err(|_| "Lock error")?;
    *selected_file = Some(selected);

    println!("Selected file updated.");

    Ok(())
}

#[tauri::command]
pub fn clear_selected_file(state: tauri::State<AppState>) -> Result<(), String> {
    let mut selected = state.selected_file.lock().map_err(|_| "Lock error")?;
    *selected = None;

    println!("Selected file cleared.");
    Ok(())
}



