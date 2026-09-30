import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/hooks/useTheme";
import { ShellProvider } from "@/hooks/useShell";
import { ShellWindow } from "@/components/ShellWindow";
import { SettingsWindow } from '@/components/SettingsWindow';

import "./index.css";

// Check window to load
const params = new URLSearchParams(window.location.search);
const isSettings = params.get('view') === 'settings' || window.location.hash === '#settings';

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <ShellProvider>
          {isSettings ? <SettingsWindow /> : <ShellWindow />}
        </ShellProvider>
      </ThemeProvider>
    </StrictMode>
  );
}
