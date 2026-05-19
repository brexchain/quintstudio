import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    const state = this.state as State;
    if (state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-8 text-center" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-black italic text-emerald-500 uppercase tracking-tighter">Diagnostic Alert</h1>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-left overflow-auto max-h-48">
              <p className="text-red-400 font-mono text-xs break-words whitespace-pre-wrap">
                {state.error?.toString()}
              </p>
            </div>
            <p className="text-white/60 font-medium text-sm">
              The harmonic engine encountered a resonance it couldn't resolve. Clear your local cache and reload if the issue persists.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-8 py-4 bg-emerald-500 text-white rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
              >
                Reload Interface
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full px-8 py-4 bg-white/5 text-white/40 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all border border-white/5"
              >
                Reset Deep Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this.props as Props).children;
  }
}
