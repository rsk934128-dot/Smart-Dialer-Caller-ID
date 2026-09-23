import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    try {
      // Clear potentially corrupt cached storage
      localStorage.removeItem('smart_dialer_contacts');
      localStorage.removeItem('smart_dialer_call_logs');
      localStorage.removeItem('smart_dialer_blocked');
      localStorage.removeItem('smart_dialer_last_backup');
      localStorage.removeItem('smart_dialer_theme');
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center animate-fadeIn">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
              <AlertTriangle className="w-8 h-8 animate-pulse" />
            </div>

            {/* Title & Desc */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-neutral-100">
                অ্যাপ্লিকেশনে সাময়িক সমস্যা দেখা দিয়েছে
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                স্মার্ট ডায়ালার লোড করার সময় একটি ত্রুটি ঘটেছে। নিচের বাটনে ক্লিক করে অ্যাপটি পুনরায় লোড করুন।
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>পুনরায় লোড করুন (Reload App)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-xs flex items-center justify-center gap-2 border border-neutral-700 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>ক্যাশ রিসেট ও ফ্রেশ স্টার্ট (Reset Local Cache)</span>
              </button>
            </div>

            {/* Collapsible Error Info */}
            <div className="pt-2 text-left border-t border-neutral-800">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 underline font-mono cursor-pointer"
              >
                {this.state.showDetails ? 'কারিগরি তথ্য লুকান' : 'কারিগরি তথ্য দেখুন (Technical details)'}
              </button>

              {this.state.showDetails && (
                <div className="mt-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-rose-300 max-h-40 overflow-y-auto space-y-1">
                  <div className="font-bold text-rose-400">
                    {this.state.error?.name}: {this.state.error?.message}
                  </div>
                  {this.state.error?.stack && (
                    <div className="text-neutral-500 whitespace-pre-wrap text-[9px]">
                      {this.state.error.stack}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
