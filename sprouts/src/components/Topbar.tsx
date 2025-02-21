import { ChangeModelButton, RenameConversationButton, SidebarButton } from "./Buttons";

export default function Topbar() {
  return (
    <div className="flex flex-row flex-1 items-center bg-inputBg min-w-0 min-h-0 px-4">
      <div className="flex flex-row flex-1 justify-baseline space-x-3">
        <RenameConversationButton />
        <ChangeModelButton />
      </div>
      <div className="relative right-0 translate-y-[3px]">
        <SidebarButton />
      </div>
    </div>
  );
}
