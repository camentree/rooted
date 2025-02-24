import { useState, useEffect, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { useConversation } from "../contexts/ConversationContext";
import { useSidebar } from "../contexts/SidebarContext";
import TextInput from "./TextInput";
import ChatMessage from "./ChatMessage";
import Modal from "./Modal";
import { Message, MessageState, BackendState } from "../Types";
import { useSocket } from "../contexts/SocketContext";

export default function Chat() {
  const { socket } = useSocket();
  const { currentConversation, currentModel } = useConversation();
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [backendState, setBackendState] = useState<BackendState>("idle");
  const [messagesState, setMessagesState] = useState<Record<string, BackendState>>({});
  const [isLastMessageVisible, setIsLastMessageVisible] = useState<boolean>(true);
  const [textareaHeight, setTextareaHeight] = useState<number>(80);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  const [lastSentMessageId, setLastSentMessageId] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  if (!currentConversation) {
    return (
      <div className="text-textPrimary dark:text-textPrimary-dark p-4">
        No conversation selected.
      </div>
    );
  }

  const scrollToLastMessage = useCallback(() => {
    requestAnimationFrame(() => {
      if (!chatContainerRef.current || messages.length === 0) return;

      const lastMessageID = messages[messages.length - 1]?.message_id;
      const lastMessageElement = document.getElementById(lastMessageID);

      if (lastMessageElement) {
        chatContainerRef.current.scrollTo({
          top: lastMessageElement.offsetTop - chatContainerRef.current.offsetTop,
          behavior: "smooth",
        });
      }
    });
  }, [messages]);

  // respond to initialization
  useEffect(() => {
    function handleBackendUpdate({ message_id, state }: MessageState) {
      setBackendState(state);
      setMessagesState((prev) => ({
        ...prev,
        [message_id]: state,
      }));
    }

    function handleMessageStreamResponse({
      message_id,
      content,
    }: {
      message_id: string;
      content: string;
    }) {
      setMessages((prev: Message[]) =>
        prev.map((msg) =>
          msg.message_id === message_id ? { ...msg, content: msg.content + content } : msg
        )
      );
    }

    function handleMessageMetadataResponse({
      message_id,
      context,
    }: {
      message_id: string;
      context: string;
    }) {
      setMessages((prev: Message[]) =>
        prev.map((msg) =>
          msg.message_id === message_id ? { ...msg, context: context } : msg
        )
      );
    }

    setMessages(currentConversation.messages);
    socket.on("backend_update", handleBackendUpdate);
    socket.on("message_stream_response", handleMessageStreamResponse);
    socket.on("message_metadata_response", handleMessageMetadataResponse);

    return () => {
      socket.off("backend_update", handleBackendUpdate);
      socket.off("message_stream_response", handleMessageStreamResponse);
      socket.off("message_metadata_response", handleMessageMetadataResponse);
    };
  }, [currentConversation, socket]);

  // respond to sidebar changes
  useEffect(() => {
    function handleClick() {
      if (isSidebarOpen && chatContainerRef.current) {
        toggleSidebar();
      }
    }

    if (window.innerWidth < 768) {
      // sidebar is relative after 48rem
      chatContainerRef.current?.addEventListener("click", handleClick);
    } else {
      chatContainerRef.current?.removeEventListener("click", handleClick);
    }
    return () => {
      chatContainerRef.current?.removeEventListener("click", handleClick);
    };
  }, [isSidebarOpen]);

  // respond to initial message rendering
  useEffect(() => {
    if (messages.length > 0 && !isInitialized) {
      scrollToLastMessage();
      setIsInitialized(true);
    }
  }, [messages, isInitialized]);

  // respond to new messages or changes to textarea height
  useEffect(() => {
    function handleLastMessageVisibility() {
      const lastMessageElement = document.getElementById(
        messages[messages.length - 1]?.message_id
      );

      if (!chatContainerRef.current || messages.length === 0 || !lastMessageElement)
        return true;

      const chatContainer = chatContainerRef.current;
      const lastMessageBottom =
        lastMessageElement.offsetTop + lastMessageElement.scrollHeight;
      const currentScrollTop = chatContainer.scrollTop;
      const screenHeight = chatContainer.clientHeight;
      setIsLastMessageVisible(
        currentScrollTop + screenHeight - textareaHeight >= lastMessageBottom
      );
    }

    handleLastMessageVisibility();
    chatContainerRef.current?.addEventListener("scroll", handleLastMessageVisibility);
    window.addEventListener("resize", handleLastMessageVisibility);
    return () => {
      chatContainerRef.current?.removeEventListener(
        "scroll",
        handleLastMessageVisibility
      );
      window.removeEventListener("resize", handleLastMessageVisibility);
    };
  }, [messages, textareaHeight]);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!chatContainerRef.current || !lastSentMessageId) return;
      const lastSentElement = document.getElementById(lastSentMessageId);
      if (!lastSentElement) return;

      chatContainerRef.current.scrollTo({
        top: lastSentElement.offsetTop - chatContainerRef.current.offsetTop,
        behavior: "smooth",
      });

      setLastSentMessageId(null);
    });
  }, [lastSentMessageId]);

  function sendMessage(input: string) {
    if (!input || !input.trim()) return;

    if (backendState === "thinking" || backendState === "writing") {
      return;
    }

    const userMessageID = uuidv4();
    const exchangeID = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    const userMessage: Message = {
      message_id: userMessageID,
      exchange_id: exchangeID,
      conversation_id: currentConversation.conversation_id,
      role: "user",
      content: input,
      context: null,
      model_id: null,
      created_at_utc: now,
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessagesState((prev) => ({
      ...prev,
    }));
    setLastSentMessageId(userMessageID);

    const assistantMessageID = uuidv4();
    const assistantMessage: Message = {
      message_id: assistantMessageID,
      exchange_id: exchangeID,
      conversation_id: currentConversation.conversation_id,
      role: "assistant",
      content: "",
      context: null,
      model_id: currentModel["model_id"],
      created_at_utc: now,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    socket.emit("new_message", {
      user_message: userMessage,
      assistant_message: assistantMessage,
    });

    setTimeout(() => {
      setMessagesState((prev) => {
        const newState = { ...prev };
        const status = newState[assistantMessageID];

        if (!status || status === "initialized") {
          console.error(
            `Error: Message with id "${assistantMessageID}" was not received.`
          );
          setBackendState("idle");
          newState[assistantMessageID] = "failed";
        }
        return newState;
      });
    }, 3000);
  }

  function stopStream() {
    socket.emit("stop");
    setBackendState("idle");
  }

  function formatDate(date: Date) {
    const now = new Date();
    const differenceInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (differenceInDays === 0) {
      return `Today ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    }

    if (differenceInDays < 7) {
      return `${date.toLocaleDateString("en-US", {
        weekday: "long",
      })} ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    }

    return `${date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })} at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  function renderMessages(
    _messages: Message[],
    _messagesState: Record<string, BackendState>
  ) {
    let lastDate: string | null = null;

    return _messages.map((message, idx) => {
      if (message.created_at_utc === null) return null;

      const createdAtUTC = new Date(Number(message.created_at_utc) * 1000);

      const currentDate = createdAtUTC.toISOString().substring(0, 10);
      const isNewDay = lastDate !== currentDate;
      lastDate = currentDate;
      return (
        <div key={idx} id={message.message_id}>
          {isNewDay && (
            <div className="text-center text-textSecondary dark:text-textSecondary-dark text-xs opacity-70">
              {formatDate(createdAtUTC)}
            </div>
          )}
          <ChatMessage
            message={message}
            state={_messagesState[message.message_id]}
            onClick={() => setActiveMessage(message)}
          />
        </div>
      );
    });
  }

  return (
    <div className="relative flex-1 min-h-0 min-w-0 flex flex-col w-[90vw] max-w-full sm:max-w-[36rem] lg:max-w-[45rem] mx-auto">
      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 min-h-0 min-w-0 overflow-y-auto pt-6 w-full pb-[50vh]"
        style={{ marginBottom: textareaHeight + 40 }}
      >
        <div
          ref={messagesContainerRef}
          className="flex flex-col min-h-0 min-w-0 space-y-6 w-[90%] mx-auto"
        >
          {renderMessages(messages, messagesState)}
        </div>
        {/* Thinking Indicator */}
        {backendState !== "thinking" && (
          <div className="flex ml-[1rem] justify-start">
            <div className="py-2 bg-primary dark:bg-primary-dark text-textPrimary dark:text-textPrimary-dark rounded-s-2xl rounded-e-2xl">
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-textSecondary dark:bg-textSecondary-dark rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-textSecondary dark:bg-textSecondary-dark rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-textSecondary dark:bg-textSecondary-dark rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fading Overlay */}
      <div
        className="absolute bottom-0 left-0 w-full h-[10rem] pointer-events-none bg-gradient-to-b from-transparent to-primary  dark:to-primary-dark "
        style={{ bottom: `${textareaHeight + 12}px` }}
      ></div>

      {/* Scroll Button */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 z-10"
        style={{ bottom: `${textareaHeight + 60}px` }}
      >
        <button
          onClick={scrollToLastMessage}
          className={`p-1 aspect-square flex items-center justify-center rounded-full shadow-lg w-8 h-8
      bg-sidebar dark:bg-sidebar-dark hover:scale-150 transition-all duration-500 ${isLastMessageVisible ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        >
          <ChevronDownIcon
            className="w-5 h-5 text-textPrimary dark:text-textPrimary-dark relative translate-y-0.5 "
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Input Box */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[100vw] max-w-[100vw] sm:max-w-[36rem] lg:max-w-[45rem] sm:mb-4">
        <TextInput
          isResponding={backendState === "writing"}
          onSubmit={sendMessage}
          onStop={stopStream}
          onHeightChange={(height) => {
            setTextareaHeight(height);
          }}
        />
      </div>
      <Modal
        isOpen={!!activeMessage}
        onClose={() => setActiveMessage(null)}
        title="Context"
      >
        <p className="text-sm">{activeMessage?.context}</p>
      </Modal>
    </div>
  );
}
