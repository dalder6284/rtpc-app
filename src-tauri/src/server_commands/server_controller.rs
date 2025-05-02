use futures_util::{SinkExt, StreamExt};
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use warp::Filter;

use crate::handlers::handle_message;
use crate::performance_types::PerformanceState;
use crate::state::AppState;

/// Controls a TLS-enabled WebSocket server and static file server for real-time performances
pub struct ServerController {
    pub handle: Option<JoinHandle<()>>,
    pub perf_state: Arc<Mutex<PerformanceState>>,
    pub app_state: Arc<AppState>,
}

impl ServerController {
    /// Create a new controller with a session TTL in milliseconds
    pub fn new(ttl_ms: u64, app_state: Arc<AppState>) -> Self {
        let mut state = PerformanceState::default();
        state.session_ttl_ms = ttl_ms;
        ServerController {
            handle: None,
            perf_state: Arc::new(Mutex::new(state)),
            app_state,
        }
    }

    /// Start a WSS endpoint and serve static files on the given port using Warp's built-in TLS
    pub fn start_tls(&mut self, ws_port: u16) -> Result<(), String> {
        let perf_state = self.perf_state.clone();
        let app_state = self.app_state.clone();

        // Define the WebSocket route for /ws
        let ws_route = warp::path("ws")
            .and(warp::ws())
            .map(move |ws: warp::ws::Ws| {
                let perf_state = perf_state.clone();
                let app_state = app_state.clone();
                ws.on_upgrade(move |socket| async move {
                    let (mut tx, mut rx) = socket.split();
                    let (sender, mut receiver) = tokio::sync::mpsc::unbounded_channel::<
                        Result<warp::ws::Message, warp::Error>,
                    >();

                    // Writer task
                    tokio::spawn(async move {
                        while let Some(Ok(msg)) = receiver.recv().await {
                            let _ = tx.send(msg).await;
                        }
                    });

                    // Reader loop
                    while let Some(Ok(msg)) = rx.next().await {
                        if let Ok(text) = msg.to_str() {
                            if let Some(response) = handle_message(
                                text,
                                perf_state.clone(),
                                app_state.clone(),
                                sender.clone(),
                            )
                            .await
                            {
                                let _ = sender.send(Ok(response));
                            }
                        }
                    }
                })
            });

        let static_files_route = warp::fs::dir("./static");
        let routes = ws_route.or(static_files_route);
        let routes_with_cors = routes.with(warp::cors().allow_any_origin());

        let addr = SocketAddr::from(([0, 0, 0, 0], ws_port));

        let server_future = warp::serve(routes_with_cors)
            .tls()
            .cert_path("certs/cert.pem")
            .key_path("certs/key.pem")
            .run(addr);

        self.handle = Some(tokio::spawn(server_future));
        println!("🟢 WSS/HTTP listening on wss://{}", addr);
        Ok(())
    }

    /// Stop the server and reset state
    pub async fn stop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
            println!("🛑 WSS/HTTP server stopped");
        }

        let mut state = self.perf_state.lock().await;
        *state = PerformanceState::default();
    }
}

/// Holds the running controller (or `None` if stopped)
#[derive(Clone, Default)]
pub struct ServerManager {
    pub controller: Arc<Mutex<Option<ServerController>>>,
}
