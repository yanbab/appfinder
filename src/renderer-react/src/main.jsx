import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "@/store/useTheme.jsx";
import { ShellProvider } from "@/store/useShell.jsx";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <ShellProvider>
          <App />
        </ShellProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
