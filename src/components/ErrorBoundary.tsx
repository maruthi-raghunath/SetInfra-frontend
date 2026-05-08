import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="layout-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="screen-wide" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 className="title" style={{ color: 'var(--danger-color)' }}>Something went wrong.</h1>
            <p className="message error">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <p>Please refresh the page or contact the administrator.</p>
            <button 
              className="btn" 
              style={{ marginTop: '20px' }}
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
