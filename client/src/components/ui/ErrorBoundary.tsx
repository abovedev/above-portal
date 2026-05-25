import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
          <AlertTriangle className="w-10 h-10 text-priority-urgent opacity-60" />
          <div>
            <p className="text-text-primary font-medium mb-1">Something went wrong</p>
            <p className="text-sm text-text-muted font-mono">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
