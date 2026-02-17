import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('[ErrorBoundary] Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging (especially on mobile)
    console.error('[ErrorBoundary] Error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
    
    this.setState({ error, errorInfo });
    
    // Optional: Send to error tracking service
    // Example: trackError(error, errorInfo);
  }

  handleReload = () => {
    // Clear any problematic state before reload
    try {
      localStorage.removeItem('studio_authenti_pending_booking');
    } catch (e) {
      console.warn('[ErrorBoundary] Failed to clear localStorage:', e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4 sm:px-6"
          style={{ 
            background: 'linear-gradient(180deg, #FFF9F2 0%, #FFFFFF 100%)',
          }}
          dir="rtl"
        >
          <div className="text-center max-w-md w-full space-y-6 py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#D4B896]/20 flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-10 h-10 text-[#D4B896]" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-[#2D3440]">משהו השתבש</h1>
              <p className="text-sm text-[#2D3440]/70 leading-relaxed">
                אירעה שגיאה בלתי צפויה. אנא רענן את הדף ונסה שוב.
              </p>
            </div>

            {/* Error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-[#2D3440]/5 rounded-lg p-4 text-xs font-mono overflow-auto max-h-40">
                <summary className="cursor-pointer text-[#2D3440]/60 mb-2">פרטי שגיאה (פיתוח)</summary>
                <pre className="whitespace-pre-wrap break-words text-[#2D3440]/80">
                  {this.state.error.toString()}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReload}
              className="h-12 px-8 rounded-xl text-base font-semibold bg-[#D4B896] hover:bg-[#D4B896]/90 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto min-w-[160px]"
            >
              <RefreshCw className="w-5 h-5" />
              רענן את הדף
            </button>

            <p className="text-xs text-[#2D3440]/50">
              אם הבעיה נמשכת, אנא צור קשר עם התמיכה
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
