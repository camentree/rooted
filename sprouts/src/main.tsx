import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { SocketProvider } from "./contexts/SocketContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { ConversationProvider } from "./contexts/ConversationContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SocketProvider>
      <SidebarProvider>
        <ConversationProvider>
          <App />
        </ConversationProvider>
      </SidebarProvider>
    </SocketProvider>
  </React.StrictMode>
);
