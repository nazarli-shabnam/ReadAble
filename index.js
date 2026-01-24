import { registerRootComponent } from 'expo';
import App from './App';
import ErrorBoundary from './src/components/ErrorBoundary';

// Wrap App with ErrorBoundary to catch any unhandled errors
const AppWithErrorBoundary = () => (
  <ErrorBoundary
    message="The app encountered an unexpected error. Please restart the app."
    showReload={false}
  >
    <App />
  </ErrorBoundary>
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(AppWithErrorBoundary);
