import { useConversation } from "../contexts/ConversationContext";
import { SidebarButton, RenameConversationButton } from "./Buttons";

export default function Topbar() {
  const { currentConversation } = useConversation();

  const fileParts = currentConversation.conversation_name
    .split("/")
    .flatMap((part, idx) => (idx === 0 ? part : ["/", part]));

  return (
    <div className="flex flex-1 flex-row justify-between items-center bg-secondary dark:bg-secondary-dark min-w-0 min-h-0 px-4 h-[3rem]">
      <div className="opacity-50 flex items-center w-full">
        <RenameConversationButton>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex flex-row flex-wrap items-center text-textPrimary dark:text-textPrimary-dark text-sm truncate space-x-3">
              {fileParts.map((part, idx) => (
                <div key={idx}>{part}</div>
              ))}
            </div>
          </div>
        </RenameConversationButton>
      </div>

      {/* Sidebar Button */}
      <div className="w-5 h-5 flex-shrink-0">
        <SidebarButton />
      </div>
    </div>
  );
}
