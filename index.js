import { registerRootComponent } from "expo";
import App from "./App";
import ErrorBoundary from "./src/components/ErrorBoundary";

const Root = () => (
  <ErrorBoundary message="ReadAble hit an unexpected problem. Your saved texts are safe. Try again, or restart the app if this keeps happening.">
    <App />
  </ErrorBoundary>
);

// registerRootComponent sets up the app the same way in Expo Go and native builds.
registerRootComponent(Root);
