import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-6"
          style={{ background: '#FFF9F2' }}
          dir="rtl"
        >
          <div className="text-center max-w-sm space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-[#333]">משהו השתבש</h1>
            <p className="text-sm text-[#333]/60">
              אירעה שגיאה בלתי צפויה. אנא רענן את הדף ונסה שוב.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-6 rounded-xl text-sm font-semibold bg-[#D4AF37] text-white shadow-sm hover:shadow-md transition-all"
            >
              רענן את הדף
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
