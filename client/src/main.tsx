import { createRoot } from "react-dom/client";
import App from "./App";
import { AppBridgeProvider } from "./contexts/AppBridgeContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <AppBridgeProvider>
    <App />
  </AppBridgeProvider>
);
