import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './components';
import { colors, spacing } from './theme';

type State = { failed: boolean };

export class MobileErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error('mobile_render_error', { name: error.name, message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.screen}><Text style={styles.title}>The app needs a fresh start.</Text><Text style={styles.copy}>Your account and basket are safe. Try loading the application again.</Text><Button label="Try again" onPress={() => this.setState({ failed: false })} /></View>;
  }
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background }, title: { color: colors.text, fontSize: 28, fontWeight: '900' }, copy: { color: colors.muted, fontSize: 16, lineHeight: 24 } });
