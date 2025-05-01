use std::collections::HashMap;
use warp::ws::Message;
use tokio::sync::mpsc::UnboundedSender;


#[derive(Debug, Default)]
pub struct ClientInfo {
    pub id: String,
    pub expires_at: u64,
    pub sender: Option<UnboundedSender<Result<Message, warp::Error>>>, // new
}

#[derive(Debug, Default)]
pub struct PerformanceState {
    pub bpm: f64,
    pub start_time: Option<u64>,
    pub session_ttl_ms: u64,

    pub seat_map: HashMap<String, ClientInfo>, // seat -> client info
    pub id_map: HashMap<String, String>,       // client_id -> seat
}