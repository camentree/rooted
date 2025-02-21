import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.tsx";
import { ConversationProvider } from "./contexts/ConversationContext";
import { SidebarProvider } from "./contexts/SidebarContext";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConversationProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </ConversationProvider>
  </StrictMode>
);
