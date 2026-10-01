import React, { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "@/hooks/useTheme.jsx";
import { ShellProvider } from "@/hooks/useShell.jsx";

const params = new URLSearchParams(window.location.search);
const isSettings = params.get("view") === "settings" || window.location.hash === "#settings";

const Shell = !isSettings ? lazy(() => import("./components/Shell.jsx").then((m) => ({ default: m.Shell }))) : null;
const Settings = isSettings ? lazy(() => import("./components/Settings.jsx").then((m) => ({ default: m.Settings }))) : null;

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <Suspense fallback={null}>
          {isSettings ? (
            <Settings />
          ) : (
            <ShellProvider>
              <Shell />
            </ShellProvider>
          )}
        </Suspense>
      </ThemeProvider>
    </StrictMode>
  );
}
