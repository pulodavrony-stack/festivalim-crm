'use client';

import { Component, ReactNode, ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.moduleName ? ` — ${this.props.moduleName}` : ''}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {this.props.moduleName ? `Ошибка в модуле «${this.props.moduleName}»` : 'Что-то пошло не так'}
          </h3>
          <p className="text-sm text-gray-500 mb-4 max-w-sm">
            {this.state.error?.message || 'Произошла неожиданная ошибка. Остальные части приложения работают нормально.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC-обёртка для функциональных компонентов
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  moduleName?: string
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary moduleName={moduleName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
