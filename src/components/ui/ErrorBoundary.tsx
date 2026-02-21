import { Component, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Une erreur est survenue</h1>
            <p className="text-slate-500 mb-4">
              L'application a rencontré un problème inattendu.
            </p>
            {this.state.error && (
              <div className="bg-slate-50 p-3 rounded mb-6 text-sm text-slate-600 font-mono text-left overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
