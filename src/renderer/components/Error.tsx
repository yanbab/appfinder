import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './Button';
import { ShellIcon } from './ShellIcon';

export interface ErrorProps {
  children?: ReactNode;
}

export interface ErrorState {
  hasError: boolean;
  error: globalThis.Error | null;
}

export class Error extends Component<ErrorProps, ErrorState> {
  constructor(props: ErrorProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: globalThis.Error): ErrorState {
    return { hasError: true, error };
  }

  componentDidCatch(error: globalThis.Error, errorInfo: ErrorInfo): void {
    console.error('[Error caught rendering error]', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center p-6 bg-background text-foreground select-none">
          <div className="max-w-md w-full p-6 rounded-[var(--radius-card)] bg-card shadow-lg text-center space-y-3 border border-border">
            <div className="flex justify-center text-amber-500">
              <ShellIcon name="exclamationmark.triangle" className="size-10" />
            </div>
            <h2 className="text-base font-semibold leading-tight text-foreground">
              Something went wrong
            </h2>
            <p className="text-xs text-muted-foreground font-mono leading-relaxed max-h-32 overflow-y-auto p-2 bg-muted/40 rounded">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button variant="default" onClick={this.handleReload}>
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
export default Error;
