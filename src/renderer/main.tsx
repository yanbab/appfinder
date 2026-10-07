import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { Shell } from "./components/Shell.jsx";
import { Settings } from "./components/Settings.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { ThemeProvider } from "@/hooks/useTheme.jsx";
import { initStoreListeners } from "@/stores";

initStoreListeners();

const params = new URLSearchParams(window.location.search);
const isSettings = params.get("view") === "settings" || window.location.hash === "#settings";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          {isSettings ? <Settings /> : <Shell />}
        </ThemeProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
