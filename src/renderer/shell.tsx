import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { ThemeProvider } from '@/hooks';
import { initStoreListeners } from '@/stores';
import { ErrorWindow } from './components/ErrorWindow';
import { ShellWindow } from './components/ShellWindow';

initStoreListeners();

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorWindow>
        <ThemeProvider>
          <ShellWindow />
        </ThemeProvider>
      </ErrorWindow>
    </StrictMode>,
  );
}
