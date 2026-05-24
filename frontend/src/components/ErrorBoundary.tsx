import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../lib/i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = i18n.t.bind(i18n);

    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-4 text-text">
        <div className="w-full max-w-md rounded-2xl border border-border bg-bg-surface p-7 text-center shadow-2xl">
          <h1 className="font-display text-2xl font-bold">{t('errors.boundaryTitle')}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('errors.boundaryBody')}</p>
          <details className="mt-4 rounded-lg border border-border bg-bg-elevated p-3 text-left text-xs text-text-muted">
            <summary className="cursor-pointer select-none text-text">
              {error.name || 'Error'}
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono">
              {error.message}
              {error.stack ? `\n\n${error.stack}` : ''}
            </pre>
          </details>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-bg transition-colors hover:bg-primary-hover"
          >
            {t('errors.reload')}
          </button>
        </div>
      </div>
    );
  }
}
