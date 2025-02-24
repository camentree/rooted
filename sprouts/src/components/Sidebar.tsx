import { useEffect, useState } from "react";

import { ChevronDownIcon } from "@heroicons/react/24/outline";

import { useConversation } from "../contexts/ConversationContext";
import { Conversation } from "../Types";
import { NewProjectButton, NewConversationButton, ChangeModelButton } from "./Buttons";

type ConversationTree = Record<string, ConversationTree | Conversation>;

type SidebarItemProps = {
  name: string;
  data: Conversation | ConversationTree;
  depth?: number;
  onSelect?: (conversation: Conversation | null) => void;
};

function SidebarItem({ name, data, depth = 0, onSelect }: SidebarItemProps) {
  const { currentConversation, setCurrentConversationByID } = useConversation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const isLeaf = "conversation_id" in data;
  const isSelected =
    isLeaf && data.conversation_id === currentConversation.conversation_id;

  function handleClick() {
    if (isLeaf) {
      const newConversation = data as Conversation;
      if (newConversation.conversation_id !== currentConversation.conversation_id) {
        setCurrentConversationByID(newConversation.conversation_id);
        onSelect?.(newConversation);
      }
    } else {
      setIsExpanded(!isExpanded);
    }
  }

  return (
    <div className="select-none space-y-1">
      <div
        onClick={handleClick}
        className={`flex items-center cursor-pointer py-2 rounded-md hover:bg-primary hover:dark:bg-secondary-dark opacity-60
      ${isLeaf ? "ml-4 text-textPrimary dark:text-textPrimary-dark" : "text-textSecondary dark:text-textSecondary-dark"}
      ${isSelected ? "!bg-blue-500" : ""}
      `}
        style={{ paddingLeft: `${depth * 0.5}rem` }}
      >
        {/* Directory Icon */}
        {!isLeaf && (
          <ChevronDownIcon
            className={`mr-1 w-4 h-4 text-gray-500 transition-transform duration-500 ${
              isExpanded ? "rotate-0" : "-rotate-90"
            }`}
            strokeWidth={3}
          />
        )}
        {/* Directory or File Name  */}
        <span className="text-sm lowercase">{name}</span>
      </div>

      {/* Directory Contents */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isExpanded ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {!isLeaf &&
          Object.entries(data as ConversationTree)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, value]) => (
              <SidebarItem
                key={key}
                name={key}
                data={value}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ))}
      </div>
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
    <div className="overflow-y-auto h-full w-full bg-sidebar dark:bg-sidebar-dark text-textPrimary dark:text-textPrimary-dark p-4">
      <div className="flex flex-row flex-1 justify-around">
        <div className="w-5 h-5 hover:scale-125 transition-transform transform duration-300">
          <NewProjectButton />
        </div>
        <div className="w-5 h-5 hover:scale-125 transition-transform transform duration-300">
          <NewConversationButton />
        </div>
      </div>
      <div className="my-10 w-full">
        <ChangeModelButton />
      </div>
      <div className="">
        {Object.entries(conversationsTree)
          .sort(([keyA], [keyB]) =>
            keyA === "projects" ? -1 : keyB === "projects" ? 1 : keyA.localeCompare(keyB)
          )
          .map(([key, value]) => (
            <SidebarItem key={key} name={key} data={value} onSelect={handleSelect} />
          ))}
      </div>
    </div>
  );
}
