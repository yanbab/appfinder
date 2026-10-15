import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { ShellWindow } from "./components/ShellWindow";
import { ErrorWindow } from "./components/ErrorWindow";
import { ThemeProvider } from "@/hooks";
import { initStoreListeners } from "@/stores";

initStoreListeners();

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorWindow>
        <ThemeProvider>
          <ShellWindow />
        </ThemeProvider>
      </ErrorWindow>
    </StrictMode>
  );
}
