import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./lib/amplify";
import { initAwsRum } from "./lib/rum";
import App from "./App";
import "./index.css";

initAwsRum().catch(() => undefined);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
