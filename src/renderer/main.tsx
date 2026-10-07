import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { Shell } from "./components/Shell";
import { Settings } from "./components/Settings";
import { Error } from "./components/Error";
import { ThemeProvider } from "@/hooks";
import { initStoreListeners } from "@/stores";

initStoreListeners();

const params = new URLSearchParams(window.location.search);
const isSettings = params.get("view") === "settings" || window.location.hash === "#settings";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Error>
        <ThemeProvider>
          {isSettings ? <Settings /> : <Shell />}
        </ThemeProvider>
      </Error>
    </StrictMode>
  );
}
