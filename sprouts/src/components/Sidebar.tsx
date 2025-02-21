import { useEffect, useState } from "react";

import { useConversation } from "../contexts/ConversationContext";
import { Conversation } from "../Types";
import {
  RenameConversationButton,
  NewProjectButton,
  NewConversationButton,
} from "./Buttons";

type ConversationTree = Record<string, ConversationTree | Conversation>;

type SidebarItemProps = {
  name: string;
  data: Conversation | ConversationTree;
  onSelect?: (conversation: Conversation | null) => void;
};

function SidebarItem({ name, data, onSelect }: SidebarItemProps) {
  const { currentConversation, setCurrentConversationByID } = useConversation();

  const isLeaf: boolean = "conversation_id" in data;
  const isSelected: boolean =
    isLeaf && data.conversation_id === currentConversation.conversation_id;

  function handleClick() {
    if (isLeaf) {
      const newConversation = data as Conversation;
      if (newConversation.conversation_id !== currentConversation.conversation_id) {
        setCurrentConversationByID(newConversation.conversation_id);
        onSelect?.(newConversation);
      }
    }
  }
  return (
    <div>
      <div
        onClick={handleClick}
        className={`cursor-pointer select-none
          ${
            isLeaf
              ? "my-1 ml-4 text-white underline-offset-1 hover:underline px-2 py-1 rounded"
              : "mt-8 text-gray-500 text-xs uppercase font-bold"
          }
          ${isSelected ? "translate-x-[-2rem]" : ""}
          `}
      >
        <div>
          {isSelected && <RenameConversationButton />}
          {!isSelected && <span>{name}</span>}
        </div>
      </div>
      {!isLeaf &&
        Object.entries(data as ConversationTree)
          .sort(([keyA], [keyB]) => {
            return name === "conversations"
              ? keyB.localeCompare(keyA)
              : keyA.localeCompare(keyB);
          })
          .map(([key, value]) => (
            <SidebarItem key={key} name={key} data={value} onSelect={onSelect} />
          ))}
    </div>
  );
}

type SidebarProps = {
  onConversationSelect?: (conversation: Conversation | null) => void;
};

export default function Sidebar({ onConversationSelect }: SidebarProps) {
  const [conversationsTree, setConversationsTree] = useState<ConversationTree>({});
  const { availableConversations } = useConversation();
  const handleSelect = onConversationSelect ?? (() => {});

  useEffect(() => {
    setConversationsTree(buildConversationTree(availableConversations));
  }, [availableConversations]);

  function buildConversationTree(conversations: Conversation[]): ConversationTree {
    const tree: ConversationTree = {};

    conversations.forEach((conversation) => {
      if (!conversation.conversation_name.trim()) return;
      const parts = conversation.conversation_name.split("/");

      if (parts.length === 1) {
        tree[parts[0]] = conversation;
        return;
      }

      let currentLevel = tree;
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          currentLevel[part] = conversation;
        } else {
          if (!(part in currentLevel)) {
            currentLevel[part] = {};
          }
          currentLevel = currentLevel[part] as ConversationTree;
        }
      });
    });
    return tree;
  }

  return (
    <div className="overflow-y-auto h-full w-full bg-sidebarBg text-white p-4">
      <div className="flex flex-row flex-1 justify-around">
        <NewProjectButton />
        <NewConversationButton />
      </div>
      {Object.entries(conversationsTree)
        .sort(([keyA], [keyB]) =>
          keyA === "projects" ? -1 : keyB === "projects" ? 1 : keyA.localeCompare(keyB)
        )
        .map(([key, value]) => (
          <SidebarItem key={key} name={key} data={value} onSelect={handleSelect} />
        ))}
    </div>
  );
}
