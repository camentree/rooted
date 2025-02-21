import { useEffect, useState, useRef } from "react";
import { Message, BackendState } from "../Types";
import MarkdownRenderer from "./MarkdownRenderer";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

type ChatMessageProps = {
  message: Message;
  state: BackendState;
  onClick?: () => void;
};

export default function ChatMessage({ message, state, onClick }: ChatMessageProps) {
  const [showMetadata, setShowMetadata] = useState<boolean>(false);
  const [isDraggingCursor, setIsDraggingCursor] = useState(false);

  function formatTimestamp(timestamp: number): string {
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInSeconds < 60) return "Just now";
    if (diffInMinutes < 60)
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    if (diffInHours < 6) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;

    return new Date(timestamp).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleMessageMouseDown() {
    setIsDraggingCursor(false);
  }

  function handleMessageMouseUp() {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      setIsDraggingCursor(true);
    }
  }

  function handleMessageClick() {
    if (onClick && !isDraggingCursor && message.context !== null) {
      onClick();
    }
  }

  function toggleShowMetadata() {
    setShowMetadata((prev) => !prev);
  }

  return (
    <div
      className={`flex min-h-0 min-w-0 ${
        message.role === "user" ? "justify-end ml-6" : "justify-start mr-6"
      }`}
    >
      <div className="flex flex-col items-start">
        <div className="relative flex flex-col">
          {/* Message Bubble */}
          <div
            className={`
              inline-block rounded-s-2xl rounded-e-2xl max-w-max
              ${message.role === "user" ? "bg-chatBubbleUser text-white px-4 py-2 self-end" : "bg-chatBubbleBot text-gray-300 self-start"}
              ${message.context !== null ? "cursor-pointer" : ""}
            `}
            onClick={handleMessageClick}
            onMouseDown={handleMessageMouseDown}
            onMouseUp={handleMessageMouseUp}
            onMouseEnter={toggleShowMetadata}
            onMouseLeave={toggleShowMetadata}
          >
            {state === "failed" && (
              <div className="text-red-300">Could not reach backend... Try again.</div>
            )}
            <div className="flex items-center gap-1">
              <span className="markdown inline-block rounded">
                <MarkdownRenderer content={message.content} />
              </span>
            </div>
          </div>
          {/* Metadata */}
          <div
            className={`text-xs text-gray-500 mt-1 transition-opacity duration-300 space-x-4 flex flex-column
            ${showMetadata ? "opacity-50" : "opacity-0"}
            ${message.role === "user" ? "self-end px-2" : "self-start"}
          `}
          >
            {message.context !== null && message.role === "user" && (
              <span className="flex">
                <InformationCircleIcon className="w-4 h-4" />
              </span>
            )}
            <span className="flex">
              {formatTimestamp(Number(message.created_at_utc) * 1000)}
            </span>
            {message.model_id !== null && (
              <span className="flex"> ({message.model_id})</span>
            )}
            {message.context !== null && message.role !== "user" && (
              <span className="flex">
                <InformationCircleIcon className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
