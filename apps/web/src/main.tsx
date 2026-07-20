import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { applyInitialTheme } from "./app/theme";
import { ClerkAuthProvider } from "./features/account/ClerkAuthProvider";
import { AppErrorBoundary } from "./features/system/AppErrorBoundary";
import "./styles/global.css";

applyInitialTheme();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <ClerkAuthProvider>
          <App />
        </ClerkAuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
