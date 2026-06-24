import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-display mb-3">Algo salió mal</h1>
            <p className="text-slate-500 mb-4">{this.state.error.message}</p>
            <button className="btn btn-primary" onClick={this.reset}>
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
