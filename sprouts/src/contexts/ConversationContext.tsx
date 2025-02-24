import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Conversation, Model } from "../Types";
import { useSocket } from "./SocketContext";
import LoadingOverlay from "../components/LoadingOverlay";

type ConversationContextType = {
  currentModel: Model;
  currentConversation: Conversation;
  availableConversations: Conversation[];
  availableModels: Model[];
  setCurrentModel: (model: Model) => void;
  setCurrentConversationByID: (conversation_id: number) => void;
};

const ConversationContext = createContext<ConversationContextType | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
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
  const [isLoaded, setIsLoaded] = useState(false);

  // handle new socket
  useEffect(() => {
    socket.emit("request_models");
    socket.emit("request_conversations");

    function handleConversationsResponse(conversations: Conversation[]) {
      setAvailableConversations(conversations);
    }

    function handleConversationUpdate(conversation: Conversation) {
      setCurrentConversation(conversation);
    }

    function handleModelsResponse(models: Model[]) {
      setAvailableModels(models);
    }

    function handleConversationResponse(conversation: Conversation) {
      if (!socket) return;
      setCurrentConversation((prev) =>
        prev?.conversation_id === conversation.conversation_id ? prev : conversation
      );
      socket.emit("request_conversations");
    }

    socket.on("conversation_response", handleConversationResponse);
    socket.on("conversations_response", handleConversationsResponse);
    socket.on("conversation_update", handleConversationUpdate);
    socket.on("models_response", handleModelsResponse);
    setIsLoaded(true);

    return () => {
      socket.off("conversation_response", handleConversationResponse);
      socket.off("conversations_response", handleConversationsResponse);
      socket.off("conversation_update", handleConversationUpdate);
      socket.off("models_response", handleModelsResponse);
      setIsLoaded(false);
    };
  }, [socket]);

  // handle first conversation loading
  useEffect(() => {
    if (!isLoaded) return;

    const storedConvesationID = localStorage.getItem("conversationID");

    socket.emit("request_conversation", {
      conversation_id:
        storedConvesationID !== undefined ? Number(storedConvesationID) : null,
    });
  }, [socket, isLoaded]);

  // handle conversation change
  useEffect(() => {
    if (!currentConversation) return;

    const lastModelUsed = availableModels.find(
      (model) => model.model_id === currentConversation.messages.at(-1)?.model_id
    );
    setCurrentModel(lastModelUsed || availableModels[0]);

    localStorage.setItem("conversationID", String(currentConversation.conversation_id));
    return () => {};
  }, [currentConversation, availableModels]);

  function setCurrentConversationByID(conversationID: number) {
    if (socket) {
      socket.emit("request_conversation", { conversation_id: conversationID });
      localStorage.setItem("conversationID", String(conversationID));
    }
  }

  function setCurrentModel(newModel: Model) {
    if (newModel !== currentModel) {
      localStorage.setItem("modelID", String(newModel.model_id));
      _setCurrentModel(newModel);
    }
  }

  if (!currentConversation || !currentModel) {
    return <LoadingOverlay isLoading={true} />;
  }

  return (
    <ConversationContext.Provider
      value={{
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
