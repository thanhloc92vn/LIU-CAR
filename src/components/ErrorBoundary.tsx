import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  // Đổi giá trị này (ví dụ tab đang mở) thì khung tự thử vẽ lại
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Một tab bị lỗi chỉ hiện thông báo tại chỗ, không làm trắng cả trang
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Lỗi hiển thị:', error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-4 text-sm space-y-2">
        <div className="font-semibold">Mục này gặp lỗi khi hiển thị</div>
        <div className="font-mono text-xs break-words">{error.message}</div>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="h-8 px-3 rounded-full bg-white border border-rose-200 text-xs font-medium hover:bg-rose-100"
        >
          Thử lại
        </button>
      </div>
    );
  }
}
