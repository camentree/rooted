import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { useConversation } from "../contexts/ConversationContext";
import { useSidebar } from "../contexts/SidebarContext";
import TextInput from "./TextInput";
import ChatMessage from "./ChatMessage";
import Modal from "./Modal";
import { Message, MessageState, BackendState } from "../Types";

export default function Chat() {
  const { socket, currentConversation, currentModel } = useConversation();
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  const [messages, setMessages] = useState<Message[]>([]);
  const [backendState, setBackendState] = useState<BackendState>("idle");
  const [messagesState, setMessagesState] = useState<Record<string, BackendState>>({});
  const [isAtBottom, setIsAtBottom] = useState<boolean>(true);
  const [textareaHeight, setTextareaHeight] = useState<number>(80);
  const [expandChatContainer, setExpandChatContainer] = useState<boolean>(false);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  if (!currentConversation) {
    return <div className="text-white p-4">No conversation selected.</div>;
  }

  // initialize
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
      role,
      token,
    }: {
      message_id: string;
      role: string;
      token: string;
    }) {
      setMessages((prev: Message[]) =>
        prev.map((msg) =>
          msg.message_id === message_id && msg.role === role
            ? { ...msg, content: msg.content + token }
            : msg
        )
      );
    }

    function handleMessageMetadataResponse({
      message_id,
      context,
    }: {
      message_id: string;
      role: string;
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

  // handle sidebar open
  useEffect(() => {
    function handleClick() {
      if (isSidebarOpen && chatContainerRef.current) {
        toggleSidebar();
      }
    }

    if (window.innerWidth < 500) {
      chatContainerRef.current?.addEventListener("click", handleClick);
    } else {
      chatContainerRef.current?.removeEventListener("click", handleClick);
    }
    return () => {
      chatContainerRef.current?.removeEventListener("click", handleClick);
    };
  }, [isSidebarOpen]);

  // update after messages render
  useEffect(() => {
    if (messages.length === 0) return;
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [messages]);

  // check if last message is visible
  useEffect(() => {
    const checkIfAtBottom = () => {
      if (!chatContainerRef.current || messages.length === 0) return;

      const lastMessageID = messages[messages.length - 1]?.message_id;
      const lastMessageElement = document.getElementById(lastMessageID);
      if (!lastMessageElement || !chatContainerRef.current) return;

      const chatContainer = chatContainerRef.current;
      const lastMessageBottom =
        lastMessageElement.offsetTop + lastMessageElement.scrollHeight;
      const currentScrollTop = chatContainer.scrollTop;
      const screenHeight = chatContainer.clientHeight;

      setIsAtBottom(currentScrollTop + screenHeight >= lastMessageBottom);
    };

    chatContainerRef.current?.addEventListener("scroll", checkIfAtBottom);
    checkIfAtBottom();
    return () => {
      chatContainerRef.current?.removeEventListener("scroll", checkIfAtBottom);
    };
  }, [messages, textareaHeight]);

  // ergonomic scrolling
  useEffect(() => {
    function updateExpandChatContainer() {
      if (!messagesContainerRef.current || !textareaHeight) return;

      const messagesBottom = messagesContainerRef.current.scrollHeight;
      const buffer = 30;
      const windowSize = window.innerHeight - textareaHeight - buffer - 2.5 * 16; // the scroll button is w-5 which is 2.5 rem and 1rem = 16 because of the root font size
      setExpandChatContainer(messagesBottom >= windowSize);
    }

    updateExpandChatContainer();
    window.addEventListener("resize", updateExpandChatContainer);
    return () => {
      window.removeEventListener("resize", updateExpandChatContainer);
    };
  }, [messages, textareaHeight]);

  function sendMessage(input: string) {
    if (!input || !input.trim()) return;

    if (backendState === "thinking" || backendState === "writing") {
      return;
    }

    const userMessageID = uuidv4();
    const assistantMessageID = uuidv4();
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

    setMessages((prev) => [...prev, userMessage]);
    setMessagesState((prev) => ({
      ...prev,
      [assistantMessageID]: "initialized",
    }));
    scrollToLastMessage();

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

  function scrollToBottom() {
    if (
      !chatContainerRef.current ||
      !messagesContainerRef.current ||
      messages.length === 0
    )
      return;
    const buffer = 60;
    chatContainerRef.current.scrollTo({
      top:
        messagesContainerRef.current.scrollHeight -
        chatContainerRef.current.clientHeight +
        buffer,
      behavior: "smooth",
    });
  }

  function scrollToLastMessage() {
    if (
      !chatContainerRef.current ||
      !messagesContainerRef.current ||
      messages.length === 0
    )
      return;

    const lastMessageID = messages[messages.length - 1].message_id;
    const lastMessageElement = document.getElementById(lastMessageID);
    if (lastMessageElement && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: lastMessageElement.offsetTop - chatContainerRef.current.offsetTop,
        behavior: "smooth",
      });
    }
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
        <div key={idx}>
          {isNewDay && (
            <div className="text-center text-gray-500 text-xs opacity-70">
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
        className="flex-1 min-h-0 min-w-0 overflow-y-auto pt-6 w-full"
        style={{ marginBottom: textareaHeight + 40 }}
      >
        <div
          ref={messagesContainerRef}
          className="flex flex-col min-h-0 min-w-0 space-y-6 w-[90%] mx-auto"
        >
          {renderMessages(messages, messagesState)}
        </div>
        {/* Thinking Indicator */}
        {backendState === "thinking" && (
          <div className="flex ml-[1rem] justify-start mt-4">
            <div className="py-2 bg-chatBubbleBot text-gray-300 rounded-s-2xl rounded-e-2xl">
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        {/* Invisible Space for Ergonomic Scrolling */}
        {expandChatContainer && <div style={{ height: "50vh" }} aria-hidden="true"></div>}
      </div>

      {/* Fading Overlay */}
      <div
        className="absolute bottom-0 left-0 w-full h-[10rem] pointer-events-none bg-gradient-to-b from-transparent to-chatBg"
        style={{ bottom: `${textareaHeight + 12}px` }}
      ></div>

      {/* Scroll Button */}
      <div
        className="absolute left-1/2 transform -translate-x-1/2 z-10"
        style={{ bottom: `${textareaHeight + 60}px` }}
      >
        <button
          onClick={scrollToBottom}
          className={`p-1 aspect-square flex items-center justify-center rounded-full shadow-lg w-8 h-8
      bg-sidebarBg transition-all duration-500 ${isAtBottom ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
        >
          <ChevronDownIcon
            className="w-5 h-5 text-gray-300 relative translate-y-0.5 "
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
