import { Component, StrictMode, type ErrorInfo, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: string | null;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Writing Register Diagnostic Tool failed to render.", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="app-shell">
          <section className="empty-analysis" role="alert">
            <h1>Writing Register Diagnostic Tool</h1>
            <p>
              The app could not finish loading in this browser. Refresh the page, and if this
              persists, check the browser console for the startup error.
            </p>
            <p>{this.state.error}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("App root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);
