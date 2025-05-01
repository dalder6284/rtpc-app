use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::task::JoinHandle;
use warp::Filter;
use futures_util::{StreamExt, SinkExt};

use crate::handlers::handle_message;
use crate::performance_types::PerformanceState;

/// Controls a TLS-enabled WebSocket server and static file server for real-time performances
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

    /// Start a WSS endpoint and serve static files on the given port using Warp's built-in TLS
    pub fn start_tls(&mut self, ws_port: u16) -> Result<(), String> {
        let state = self.state.clone();

        // Define the WebSocket route for /ws
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
                                // Use sender.send, which is non-blocking for unbounded channel
                                let _ = sender.send(Ok(response));
                            }
                        }
                    }
                })
            });

        // Define the static files route
        // This serves files from the specified directory for any path
        // that doesn't match a preceding route.
        // *** IMPORTANT: Adjust the path ("./static") based on where
        // your frontend build outputs relative to the final executable. ***
        let static_files_route = warp::fs::dir("./static"); // Example: assuming dist contents are copied to `./static`

        // Combine the routes: Try WebSocket first, then static files for everything else
        // The order matters: /ws must be checked before the static file server
        let routes = ws_route.or(static_files_route);

        // Apply CORS to the combined routes if needed (likely only relevant for the WSS)
        let routes_with_cors = routes.with(warp::cors().allow_any_origin());


        let addr = SocketAddr::from(([0, 0, 0, 0], ws_port));

        // Launch the server with TLS
        let cert_path = "certs/cert.pem";
        let key_path = "certs/key.pem";
        let server_future = warp::serve(routes_with_cors) // Use the combined routes
            .tls()
            .cert_path(cert_path)
            .key_path(key_path)
            .run(addr);

        self.handle = Some(tokio::spawn(server_future));
        // Update the print message to reflect serving both
        println!("🟢 WSS/HTTP listening on wss://{}", addr);
        Ok(())
    }

    /// Stop the server and reset state
    pub fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
            println!("🛑 WSS/HTTP server stopped");
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