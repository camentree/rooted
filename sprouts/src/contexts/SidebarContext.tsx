import { createContext, useContext, useState, ReactNode } from "react";

type SidebarContextType = {
  isSidebarOpen: boolean;
  toggleSidebar: (isOpen?: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const storedState = localStorage.getItem("sidebarState");
    return storedState !== null ? JSON.parse(storedState) : window.innerWidth >= 768;
  });

  function toggleSidebar() {
    setIsSidebarOpen((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarState", JSON.stringify(newState));
      return newState;
    });
  }

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}
