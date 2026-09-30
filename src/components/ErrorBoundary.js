import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { error } from "../utils/logger";
import { THEMES, ThemeContext } from "../theme";
import { Button, Txt } from "./ui";

/**
 * Catches render errors anywhere below it and shows a recoverable screen
 * instead of a blank app.
 */
class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(err) {
    return { error: err };
  }

  componentDidCatch(err, errorInfo) {
    // `err`, not `error`: the logger's `error` must not be shadowed here.
    error("ErrorBoundary caught an error:", err, errorInfo);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const t = THEMES.light;
    return (
      <ThemeContext.Provider value={t}>
        <ScrollView contentContainerStyle={[styles.container, { backgroundColor: t.page }]}>
          <View style={[styles.box, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Txt variant="heading" accessibilityRole="header">
              Something went wrong
            </Txt>
            <Txt>{this.props.message || "An unexpected error occurred. Try again."}</Txt>
            {__DEV__ && (
              <Txt variant="caption" muted selectable>
                {String(this.state.error)}
              </Txt>
            )}
            <Button
              label="Try again"
              variant="primary"
              onPress={() => this.setState({ error: null })}
            />
          </View>
        </ScrollView>
      </ThemeContext.Provider>
    );
  }
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, justifyContent: "center" },
  box: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
  },
});

export default ErrorBoundary;
