import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";

import MainPage from "./pages/MainPage";
import SessionPage from "./pages/SessionPage";
import SyncPage from "./pages/SyncPage";

// 👇 Add this import
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "sonner"



ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="rtpc-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/sync" element={<SyncPage />} />
        </Routes>
        <Toaster richColors position="bottom-right" />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);
