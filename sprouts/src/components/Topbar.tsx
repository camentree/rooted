import { RenameConversationButton, SidebarButton } from "./Buttons";

export default function Topbar() {
  return (
    <div className="flex flex-1 flex-row justify-between items-center bg-secondary dark:bg-secondary-dark min-w-0 min-h-0 px-4 h-[3rem]">
      <div className="flex-1 min-w-0">
        <RenameConversationButton />
      </div>
      <div className="w-5 h-5 flex-shrink-0">
        <SidebarButton />
      </div>
    </div>
  );
}
