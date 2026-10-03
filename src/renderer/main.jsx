import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { Shell } from "./components/Shell.jsx";
import { Settings } from "./components/Settings.jsx";
import { ThemeProvider } from "@/hooks/useTheme.jsx";
import { ShellProvider } from "@/hooks/useShell.jsx";

const params = new URLSearchParams(window.location.search);
const isSettings = params.get("view") === "settings" || window.location.hash === "#settings";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        {isSettings ? (
          <Settings />
        ) : (
          <ShellProvider>
            <Shell />
          </ShellProvider>
        )}
      </ThemeProvider>
    </StrictMode>
  );
}
