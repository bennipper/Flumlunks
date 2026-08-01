import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./theme/global.css";
import { RouterProvider } from "./app/router";
import { AppProvider } from "./app/AppContext";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </RouterProvider>
  </StrictMode>
);
