import type { IpcBridge } from './ipc';

declare global {
  interface Window {
    ipc: IpcBridge;
  }
}

export {};
