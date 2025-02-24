import { useConversation } from "../contexts/ConversationContext";
import { SidebarButton, RenameConversationButton } from "./Buttons";
import { Square3Stack3DIcon } from "@heroicons/react/24/solid";

export default function Topbar() {
  const { currentConversation } = useConversation();

  const fileParts = currentConversation.conversation_name
    .split("/")
    .flatMap((part, idx) => (idx === 0 ? part : ["/", part]));

  return (
    <div className="flex flex-1 flex-row justify-between items-center bg-secondary dark:bg-secondary-dark min-w-0 min-h-0 px-4 h-[3rem]">
      <div className="flex items-center">
        <RenameConversationButton>
          <div className="inline-flex flex-row flex-1 min-w-0 overflow-hidden text-textPrimary dark:text-textPrimary-dark items-center hover:text-gray-400">
            <Square3Stack3DIcon className="flex w-[1rem] h-[1rem] flex-shrink-0 text-inherit mr-2" />
            <div className="flex flex-row flex-wrap items-center text-sm text-inherit truncate space-x-3">
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
