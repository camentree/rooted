import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
};

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

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

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return createPortal(
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md flex items-center justify-center z-50
        transition-opacity duration-500 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div
        ref={modalRef}
        className={`relative bg-primary  dark:bg-primary-dark text-textPrimary dark:text-textPrimary-dark p-4 rounded-md border border-gray-200/20 w-[80vw] h-[80vh] overflow-y-auto
          transition-all duration-500 ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-2 p-2 bg-gray-700 text-textPrimary dark:text-textPrimary-dark rounded-md hover:scale-150 transform transition-transform duration-500"
        >
          <XMarkIcon className="w-3 h-3 text-inherit" />
        </button>

        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body
  );
}
