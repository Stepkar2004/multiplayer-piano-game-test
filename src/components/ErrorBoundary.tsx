import React from 'react';

export class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null as Error | null };

  constructor(props: {children: React.ReactNode}) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg w-full">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto text-gray-800">
              {this.state.error?.message}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}
