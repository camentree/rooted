import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type MemoryModalProps = {
  memoryRequest: string | null;
  onClose: () => void;
  onSave: (memory: string) => void;
};

export default function MemoryModal({
  memoryRequest,
  onClose,
  onSave,
}: MemoryModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState<boolean>(false);

  setShow(memoryRequest !== null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!memoryRequest) return null;

  return createPortal(
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50
          transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div
        ref={modalRef}
        className="bg-white text-gray-800 p-6 rounded-md shadow-lg border border-gray-300 max-w-lg w-full"
      >
      </div>
    </div>,
    document.body
  );
}
