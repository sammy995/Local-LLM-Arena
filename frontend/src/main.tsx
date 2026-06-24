import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Offline-bundled variable fonts (no Google Fonts phone-home — privacy is the product).
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/hanken-grotesk";
import "@fontsource-variable/jetbrains-mono";

import App from "./App";
import "./index.css";
import "./components/uiverse/uiverse.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
