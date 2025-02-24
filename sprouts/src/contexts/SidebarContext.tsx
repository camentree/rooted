import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type SidebarContextType = {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const storedState = sessionStorage.getItem("sidebarState");
    return storedState !== null ? JSON.parse(storedState) : window.innerWidth >= 768;
  });

  useEffect(() => {
    sessionStorage.setItem("sidebarState", String(isSidebarOpen));
  }, [isSidebarOpen]);

  function toggleSidebar() {
    setIsSidebarOpen((prev) => !prev);
  }

  return (
    <SidebarContext.Provider value={{ isSidebarOpen, setIsSidebarOpen, toggleSidebar }}>
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
