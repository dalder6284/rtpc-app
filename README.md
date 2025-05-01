# Real-Time Performance Control in Mobile Node-Driven Sound Diffusion Systems

## Abstract

We present Real-Time Performance Control (RTPC), a system for coordinating beat-aligned sound diffusion across a network of mobile devices in live audio performances. RTPC is built around a modular architecture consisting of a central broker, an administrative interface for performance design and control, and mobile client nodes that operate as distributed playback units. The system employs a two-stage synchronization protocol that was originally designed to combine RTT-based estimation with acoustic beacon alignment using maximum length sequences (MLS) to achieve sub-millisecond clock agreement across clients. However, practical limitations of browser-based audio—specifically unpredictable input latency and inconsistent timing—rendered the beacon-based fine synchronization unreliable in deployment. As a result, RTPC defaults to coarse synchronization using only RTT measurements, which still enables coordinated playback with timing tolerances below 15 ms. Clients connect via browser, preload assigned RNBO patches and sheet music, and compute playback schedules locally using a shared beat grid. RTPC is implemented as a Tauri-based application with a Rust backend and a React frontend, enabling low-latency, hardware-free performance coordination in accessible and portable contexts.

---

## Development Instructions

RTPC is built using [Tauri](https://tauri.app/) and a React frontend. To run the development environment locally:

```bash
npm install
npm update
npm run tauri dev
```

This will launch the Tauri application, including both the server backend and the local frontend interface.

---

## Frontend Build Process

To update the frontend React application used by Tauri:

1. Navigate into the frontend directory:

   ```bash
   cd frontend
   ```

2. Build the frontend assets:

   ```bash
   npm run build
   ```

3. The output will be placed in:

   ```
   src-tauri/static/
   ```

   This directory is used by the Tauri backend to serve static assets to mobile clients.

---

## About

This system was developed as part of an undergraduate thesis project at Yale University.

- **Author**: Diego Alderete Sanchez  
- **Advisor**: Dr. Scott Petersen  
- **Department**: Computer Science  
- **Institution**: Yale University  
- **Date**: April 2024

---

## Figures

<!-- You can insert image links like below after uploading -->
<!-- ![System Architecture](figures/system-architecture.png) -->
<!-- ![Administrator Interface](figures/admin-interface.png) -->

(Add figures below this line as needed.)
