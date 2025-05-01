use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::task::JoinHandle;
use warp::Filter;
use futures_util::{StreamExt, SinkExt};

use crate::handlers::handle_message;
use crate::performance_types::PerformanceState;

/// Controls a TLS-enabled WebSocket server for real-time performances
pub struct ServerController {
    pub handle: Option<JoinHandle<()>>,
    pub state: Arc<Mutex<PerformanceState>>,
}

impl ServerController {
    /// Create a new controller with a session TTL in milliseconds
    pub fn new(ttl_ms: u64) -> Self {
        let mut state = PerformanceState::default();
        state.session_ttl_ms = ttl_ms;
        ServerController {
            handle: None,
            state: Arc::new(Mutex::new(state)),
        }
    }

    /// Start a WSS endpoint on the given port using Warp's built-in TLS
    pub fn start_tls(&mut self, ws_port: u16) -> Result<(), String> {
        let state = self.state.clone();

        // Define the WebSocket route
        let ws_route = warp::path("ws")
            .and(warp::ws())
            .map(move |ws: warp::ws::Ws| {
                let state = state.clone();
                ws.on_upgrade(move |socket| async move {
                    let (mut tx, mut rx) = socket.split();
                    let (sender, mut receiver) =
                        tokio::sync::mpsc::unbounded_channel::<Result<warp::ws::Message, warp::Error>>();

                    // Spawn writer task
                    tokio::spawn(async move {
                        while let Some(Ok(msg)) = receiver.recv().await {
                            let _ = tx.send(msg).await;
                        }
                    });

                    // Reader loop
                    while let Some(Ok(msg)) = rx.next().await {
                        if let Ok(text) = msg.to_str() {
                            if let Some(response) =
                                handle_message(text, state.clone(), sender.clone()).await
                            {
                                let _ = sender.send(Ok(response));
                            }
                        }
                    }
                })
            })
            .with(warp::cors().allow_any_origin());

        let addr = SocketAddr::from(([0, 0, 0, 0], ws_port));

        // Launch the server with TLS
        let cert_path = "certs/cert.pem";
        let key_path = "certs/key.pem";
        let server_future = warp::serve(ws_route)
            .tls()
            .cert_path(cert_path)
            .key_path(key_path)
            .run(addr);

        self.handle = Some(tokio::spawn(server_future));
        println!("🟢 WSS listening on wss://{}", addr);
        Ok(())
    }

    /// Stop the server and reset state
    pub fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
            println!("🛑 WSS server stopped");
        }
        if let Ok(mut state) = self.state.lock() {
            *state = PerformanceState::default();
        }
    }
}

/// Holds the running controller (or `None` if stopped)
#[derive(Clone, Default)]
pub struct ServerManager {
    pub controller: Arc<Mutex<Option<ServerController>>>,
}
