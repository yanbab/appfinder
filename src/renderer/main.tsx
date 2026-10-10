import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { ShellWindow } from "./components/ShellWindow";
import { SettingsWindow } from "./components/SettingsWindow";
import { ErrorWindow } from "./components/ErrorWindow";
import { ThemeProvider } from "@/hooks";
import { initStoreListeners, useShellStore, useAppStore, useTermStore } from "@/stores";

initStoreListeners();

if (typeof window !== "undefined") {
  (window as any).shellStore = useShellStore;
  (window as any).appStore = useAppStore;
  (window as any).termStore = useTermStore;
}

const params = new URLSearchParams(window.location.search);
const isSettings = params.get("view") === "settings" || window.location.hash === "#settings";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorWindow>
        <ThemeProvider>
          {isSettings ? <SettingsWindow /> : <ShellWindow />}
        </ThemeProvider>
      </ErrorWindow>
    </StrictMode>
  );
}
