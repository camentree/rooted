import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { Conversation, Model } from "../Types";
import LoadingOverlay from "../components/LoadingOverlay";

const SOCKET_URL = "http://localhost:5001";

type ConversationContextType = {
  socket: Socket;
  currentModel: Model;
  currentConversation: Conversation;
  availableConversations: Conversation[];
  availableModels: Model[];
  setCurrentModel: (model: Model) => void;
  setCurrentConversationByID: (conversation_id: number) => void;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(
    null
  );
  const [currentModel, _setCurrentModel] = useState<Model>({
    name: "Mistral 7b",
    model_id: "mistral",
    client_id: "ollama",
  });
  const [availableConversations, setAvailableConversations] = useState<Conversation[]>(
    []
  );
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Initialize connection
  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socketInstance;

    function handleBackendInitialization() {
      setIsConnected(true);
      socketInstance.emit("request_models");
      socketInstance.emit("request_conversations");
    }

    function handleConversationsResponse(conversations: Conversation[]) {
      setAvailableConversations(conversations);
    }

    function handleConversationUpdate(conversation: Conversation) {
      setCurrentConversation(conversation);
    }

    function handleModelsResponse(models: Model[]) {
      setAvailableModels(models);
    }

    socketInstance.on("initialized", handleBackendInitialization);
    socketInstance.on("conversations_response", handleConversationsResponse);
    socketInstance.on("conversation_update", handleConversationUpdate);
    socketInstance.on("models_response", handleModelsResponse);
    socketInstance.emit("initialize");

    return () => {
      socketInstance.off("initialized", handleBackendInitialization);
      socketInstance.off("conversations_response", handleConversationsResponse);
      socketInstance.off("conversation_update", handleConversationUpdate);
      socketInstance.off("models_response", handleModelsResponse);
      socketInstance.disconnect();
    };
  }, []);

  // Update conversation response listener
  useEffect(() => {
    function handleConversationResponse(conversation: Conversation) {
      if (!socketRef.current || !isConnected || availableModels.length === 0) return;

      const lastModel = availableModels.find(
        (model) => model.model_id === conversation.messages.at(-1)?.model_id
      );

      setCurrentModel(lastModel || availableModels[0]);
      setCurrentConversation((prev) =>
        prev?.conversation_id === conversation.conversation_id ? prev : conversation
      );
      localStorage.setItem("conversationID", String(conversation.conversation_id));
      socketRef.current.emit("request_conversations");
    }

    if (!socketRef.current || !isConnected || availableModels.length === 0) {
      setIsFullyLoaded(true);
    }
    socketRef.current?.on("conversation_response", handleConversationResponse);
    return () => {
      socketRef.current?.off("conversation_response", handleConversationResponse);
    };
  }, [isConnected, availableModels]);

  useEffect(() => {
    if (!socketRef.current || !isFullyLoaded) return;

    const storedConvesationID = localStorage.getItem("conversationID");
    if (storedConvesationID) {
      socketRef.current.emit("request_conversation", {
        conversation_id: Number(storedConvesationID),
      });
    } else {
      socketRef.current.emit("request_daily_conversation");
    }
  }, [isConnected, isFullyLoaded]);

  // Don't render anything if not connected
  if (!isConnected || !socketRef.current || !currentConversation) {
    return null;
  }

  // Show loading screen if the socket is connected but conversation is still loading
  if (isConnected && !isFullyLoaded) {
    return <LoadingOverlay isLoading={true} />;
  }

  function setCurrentConversationByID(conversationID: number) {
    if (socketRef.current) {
      socketRef.current.emit("request_conversation", { conversation_id: conversationID });
      localStorage.setItem("conversationID", String(conversationID));
    }
  }

  function setCurrentModel(newModel: Model) {
    if (newModel !== currentModel) {
      localStorage.setItem("modelID", String(newModel.model_id));
      _setCurrentModel(newModel);
    }
  }

  return (
    <ConversationContext.Provider
      value={{
        socket: socketRef.current,
        currentConversation: currentConversation,
        availableConversations: availableConversations,
        setCurrentConversationByID: setCurrentConversationByID,
        currentModel: currentModel,
        setCurrentModel: setCurrentModel,
        availableModels: availableModels,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversation() {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("useConversation must be used within a ConversationProvider");
  }
  return context;
}
