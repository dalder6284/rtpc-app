use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;


//
// Session Info
//

#[derive(Clone, Serialize, Deserialize)]
pub struct SessionConfig {
    pub name: String,
    pub path: String,
    pub rows: usize,
    pub columns: usize,
}

//
// Palette Item
//

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RNBOPaletteItem {
    pub id: String,
    pub label: String,
    pub color: String,
    pub path: String, // absolute or relative path to the file
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SheetPaletteItem {
    pub id: String,
    pub label: String,
    pub color: String,
    pub path: String, // absolute or relative path to the file
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SelectedFile {
    pub id: String,
    pub label: String,
    pub path: String,
    pub color: String,
    pub file_type: String, // "rnbo" or "sheet"
}


//
// Seat Assignment
//

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assignment {
    pub seat_id: String,
    pub file_id: String,
    pub file_type: String,
}

//
// Phase
//
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseInit {
    pub id: String,
    pub name: String,
    pub bpm: u32,
    pub count_in: u32,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhaseUpdate {
    pub name: Option<String>,
    pub bpm: Option<u32>,
    pub count_in: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Phase {
    pub name: String,
    pub assignments: Vec<Assignment>,
    pub bpm: u32,
    pub count_in: u32,
}

//
// Global App State
//

#[derive(Default)]
pub struct AppState {
    pub session: Mutex<Option<SessionConfig>>,
    pub selected_file: Mutex<Option<SelectedFile>>,
    pub rnbo_patches: Mutex<Vec<RNBOPaletteItem>>,
    pub sheet_music: Mutex<Vec<SheetPaletteItem>>,
    pub phases: Mutex<HashMap<String, Phase>>,
    pub current_phase_id: Mutex<Option<String>>,
}
