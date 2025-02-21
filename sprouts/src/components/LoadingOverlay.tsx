import { useState, useEffect } from "react";

export default function LoadingOverlay({ isLoading }: { isLoading: boolean }) {
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (isLoading) {
      timeout = setTimeout(() => setShowOverlay(true), 200);
    } else {
      setShowOverlay(false);
    }

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-500 ${
        showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
      } z-50`}
    >
      <div
        className={`w-16 h-16 border-4 border-gray-300 border-t-transparent rounded-full ${isLoading ? "animate-spin" : ""}`}
      />
    </div>
  );
}
