import {
  CodeBracketIcon,
  CalendarIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  FolderPlusIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/solid";
import { useState, useEffect, useRef } from "react";

import { useConversation } from "../contexts/ConversationContext";
import { useSidebar } from "../contexts/SidebarContext";
import { Model } from "../Types";

type ChangeModelButtonProps = {
  onChange?: (newModel: Model) => void;
};

export function ChangeModelButton({ onChange }: ChangeModelButtonProps) {
  const { currentModel, setCurrentModel, availableModels } = useConversation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen && !dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isOpen && event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleChange(newModel: Model) {
    setIsOpen(false);
    setCurrentModel(newModel);
    onChange?.(newModel);
  }

  return (
    <div className="relative inline-block text-left">
      <div
        className="flex items-center text-white hover:text-gray-500 cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <CodeBracketIcon className="w-8 h-8 p-2 text-inherit" />
        <span className="text-inherit">{currentModel.name}</span>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 mt-1 ml-[1rem] w-48 bg-chatBg border border-gray-700 rounded-md shadow-lg z-50"
        >
          {availableModels
            .filter((model) => model.model_id !== currentModel.model_id)
            .map((model) => (
              <div
                key={model.model_id}
                onClick={() => handleChange(model)}
                className="px-4 py-2 text-white cursor-pointer hover:bg-gray-700"
              >
                {model.name}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

type NewConversationButtonProps = {
  onCreate?: () => void;
};
export function NewConversationButton({ onCreate }: NewConversationButtonProps) {
  const { socket } = useConversation();

  function handleClick() {
    socket.emit("request_conversation");
    onCreate?.();
  }

  return (
    <button onClick={handleClick}>
      <CalendarIcon className="w-8 h-8 hover:text-gray-500 text-white p-2 flex items-center" />
    </button>
  );
}

type RenameConversationButtonProps = {
  onRename?: (newName: string) => void;
};

export function RenameConversationButton({ onRename }: RenameConversationButtonProps) {
  const { socket, currentConversation } = useConversation();
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>(currentConversation.conversation_name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditable) {
      setNewName(currentConversation.conversation_name);
      inputRef.current?.focus();
    }
  }, [isEditable]);

  function handleRename() {
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== currentConversation.conversation_name) {
      socket.emit("update_conversation", {
        conversation_id: currentConversation.conversation_id,
        name: trimmedName,
      });
      socket.emit("request_conversations");
      onRename?.(trimmedName);
    }
    setIsEditable(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleRename();
    if (event.key === "Escape") setIsEditable(false);
  }

  return (
    <div
      className="flex items-center text-white hover:text-gray-500 cursor-pointer"
      onClick={() => setIsEditable(true)}
    >
      <Square3Stack3DIcon className="w-8 h-8 text-inherit p-2" />
      {isEditable ? (
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRename}
          className="bg-gray-700 text-white px-2 py-1 rounded outline-none focus:ring"
        />
      ) : (
        <span className="text-inherit">
          {currentConversation.conversation_name.split("/").pop()}
        </span>
      )}
    </div>
  );
}

export function SidebarButton() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <button onClick={toggleSidebar} className="z-50">
      {isSidebarOpen ? (
        <ArrowRightStartOnRectangleIcon className="w-8 h-8 hover:text-gray-500 text-white p-2 flex items-center" />
      ) : (
        <ArrowLeftStartOnRectangleIcon className="w-8 h-8 hover:text-gray-500 text-white p-2 flex items-center" />
      )}
    </button>
  );
}

type NewProjectButtonProps = {
  onCreate?: () => void;
};
export function NewProjectButton({ onCreate }: NewProjectButtonProps) {
  const { socket } = useConversation();
  const [showPrompt, setShowPrompt] = useState(false);
  const [projectName, setProjectName] = useState("projects/");

  function handleCreate() {
    socket.emit("request_conversation", { conversation_name: projectName });
    onCreate?.();
    setShowPrompt(false);
    setProjectName("projects/");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") handleCreate();
    if (event.key === "Escape") setShowPrompt(false);
  }

  return (
    <div className="flex items-center">
      <button onClick={() => setShowPrompt(!showPrompt)}>
        <FolderPlusIcon className="w-8 h-8 hover:text-gray-500 text-white p-2 flex items-center" />
      </button>
      {showPrompt && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
        >
          <input
            autoFocus
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setShowPrompt(false)}
            placeholder="Project"
            className="bg-gray-700 text-white px-2 py-1 rounded outline-none focus:ring"
          />
        </form>
      )}
    </div>
  );
}
