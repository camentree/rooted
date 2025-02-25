import { useEffect } from "react";
import { useSidebar } from "./contexts/SidebarContext";

import Chat from "./components/Chat";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";

import "./App.css";
import "./styles/globals.css";

function App() {
  const { isSidebarOpen } = useSidebar();

  useEffect(() => {
    function handleTab(event: KeyboardEvent) {
      if (event.key === "Tab") {
        event.preventDefault();
      }
    }
    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
    };
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-primary dark:bg-primary-dark">
      {/* Body */}
      <div
        className={`flex flex-col flex-1 transition-all duration-500 w-full ${
          isSidebarOpen ? "" : "md:mr-[-15rem]"
        }`}
      >
        {/* Topbar */}
        <div className="flex w-full max-h-30px border-b border-gray-200/20 z-30">
          <Topbar />
        </div>

        {/* Chat Container */}
        <div className="flex-1 flex min-h-0 min-w-0 flex-col">
          <Chat />
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed md:relative top-0 w-[15rem] h-full border-l border-gray-200/20 z-40 transition-all duration-500 overflow-hidden ${
          isSidebarOpen ? "right-0 opacity-100" : "-right-[15rem] opacity-0"
        }`}
      >
        <Sidebar />
      </div>
    </div>
  );
}

export default App;
