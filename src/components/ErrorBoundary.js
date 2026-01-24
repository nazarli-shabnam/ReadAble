import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { error } from "../utils/logger";

/**
 * Error Boundary component for React Native
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the app
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to logger (which respects production guards)
    error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // if (errorReportingService) {
    //   errorReportingService.logError(error, errorInfo);
    // }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.title}>⚠️ Something went wrong</Text>
            <Text style={styles.message}>
              {this.props.message ||
                "An unexpected error occurred. Please try again."}
            </Text>
            {__DEV__ && this.state.error && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Error Details:</Text>
                <Text style={styles.detailsText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.detailsText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
            {this.props.showReload && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => {
                  // Reload app - in React Native, this might require navigation reset
                  if (this.props.onReload) {
                    this.props.onReload();
                  }
                }}
              >
                <Text style={styles.secondaryButtonText}>Reload App</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7fb",
    padding: 20,
  },
  errorContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginTop: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  detailsText: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#111827",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#e5e7eb",
  },
  secondaryButtonText: {
    color: "#111827",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 16,
  },
});

export default ErrorBoundary;
