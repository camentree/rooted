import {
  ChevronDownIcon,
  CalendarIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon,
  FolderPlusIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/solid";
import { useState, useEffect, useRef } from "react";

import { useConversation } from "../contexts/ConversationContext";
import { useSidebar } from "../contexts/SidebarContext";
import { useSocket } from "../contexts/SocketContext";
import { Model } from "../Types";

type ChangeModelButtonProps = {
  onChange?: (newModel: Model) => void;
};

export function ChangeModelButton({ onChange }: ChangeModelButtonProps) {
  const { currentModel, setCurrentModel, availableModels } = useConversation();
  const [isOpen, setIsOpen] = useState(false);

  function handleChange(modelId: string) {
    const newModel = availableModels.find((model) => model.model_id === modelId);
    if (newModel && newModel.model_id !== currentModel.model_id) {
      setCurrentModel(newModel);
      onChange?.(newModel);
    }
    setIsOpen(false);
  }

  return (
    <div className="w-full">
      <button
        className="flex items-center justify-between w-full px-4 py-2 bg-primary dark:bg-secondary-dark text-textPrimary dark:text-textPrimary-dark rounded-md hover:bg-secondary dark:hover:bg-sidebar-dark transition-all"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {currentModel.name}
        <ChevronDownIcon
          className={`w-5 h-5 transition-transform duration-500 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`transition-all] duration-500 ease-in-out overflow-hidden ${
          isOpen ? "opacity-100 max-h-[100vh]" : "opacity-0 max-h-0 "
        }`}
      >
        <div className="mt-2 w-full bg-secondary dark:bg-sidebar-dark border border-gray-300 dark:border-gray-600 rounded-md shadow-md transition-all duration-300">
          {availableModels
            .filter((model) => model.model_id != currentModel.model_id)
            .map((model) => (
              <button
                key={model.model_id}
                className={`w-full text-left px-4 py-2 hover:bg-gray-300 dark:hover:bg-gray-700 transition-all ${
                  model.model_id === currentModel.model_id ? "font-bold" : ""
                }`}
                onClick={() => handleChange(model.model_id)}
              >
                {model.name}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

type NewConversationButtonProps = {
  onCreate?: () => void;
};
export function NewConversationButton({ onCreate }: NewConversationButtonProps) {
  const { socket } = useSocket();

  function handleClick() {
    socket.emit("request_conversation", { conversation_id: null });
    onCreate?.();
  }

  return (
    <button onClick={handleClick}>
      <CalendarIcon className="w-full h-full text-textPrimary dark:text-textPrimary-dark" />
    </button>
  );
}

type RenameConversationButtonProps = {
  onRename?: (newName: string) => void;
  children?: React.ReactNode;
};

export function RenameConversationButton({
  onRename,
  children = null,
}: RenameConversationButtonProps) {
  const { socket } = useSocket();
  const { currentConversation } = useConversation();
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
      className="flex items-center text-textPrimary dark:text-textPrimary-dark hover:text-gray-500 cursor-pointer space-x-2 w-full"
      onClick={() => setIsEditable(true)}
    >
      {isEditable ? (
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRename}
          className="dark:bg-secondary-dark text-textPrimary dark:text-textPrimary-dark rounded outline-none px-2 py-2 w-full max-w-full"
        />
      ) : (
        <span className="text-inherit truncate w-full">
          {children ?? (
            <span>
              <Square3Stack3DIcon className="w-[1rem] h-[1rem] flex-shrink-0 text-inherit" />
              {currentConversation.conversation_name.split("/").pop()}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export function SidebarButton() {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className="text-textPrimary dark:text-textPrimary-dark hover:text-gray-400"
    >
      {isSidebarOpen ? (
        <ArrowRightStartOnRectangleIcon className="w-full h-full text-inherit" />
      ) : (
        <ArrowLeftStartOnRectangleIcon className="w-full h-full text-inherit" />
      )}
    </button>
  );
}

type NewProjectButtonProps = {
  onCreate?: () => void;
};
export function NewProjectButton({ onCreate }: NewProjectButtonProps) {
  const { socket } = useSocket();

  function handleCreate() {
    socket.emit("request_conversation", { conversation_name: "projects/New Project" });
    onCreate?.();
  }

  return (
    <button onClick={handleCreate}>
      <FolderPlusIcon className="w-full h-full text-textPrimary dark:text-textPrimary-dark" />
    </button>
  );
}
