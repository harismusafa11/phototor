/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface Props {
  children: ReactNode;
}

export interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Phototor Studio Error Boundary caught runtime error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-[#0d0d12] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#15151c] border border-[#2c2c38] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-[#242432] pb-3 text-red-400">
              <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white tracking-tight">Something Went Wrong</h2>
                <p className="text-xs text-gray-400">Phototor Studio encountered a rendering error</p>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed bg-[#0b0b0f] p-3 rounded-lg border border-[#20202b] font-mono overflow-x-auto max-h-32">
              {this.state.error?.toString() || 'An unexpected error occurred.'}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="px-3.5 py-2 bg-[#22222d] hover:bg-[#2c2c3a] text-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Try Re-rendering
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
