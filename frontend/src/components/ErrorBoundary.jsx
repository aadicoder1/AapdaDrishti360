import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "24px",
            margin: "20px",
            background: "#FEF2F2",
            border: "1px solid #EF4444",
            borderRadius: "12px",
            color: "#991B1B",
            fontFamily: "var(--font-body)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.4rem" }}>⚠️</span>
            <strong style={{ fontSize: "1.1rem" }}>Component Render Notice</strong>
          </div>
          <p style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
            {this.state.error?.message || "An unexpected error occurred while rendering this section."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "6px 14px",
              background: "#DC2626",
              color: "#FFF",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ↻ Retry Component Render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
