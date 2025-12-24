"use client";

import { MobileSidebar } from "./Sidebar";
import { UserNav } from "./UserNav";
import { NotificationBell } from "./notification-bell";
import { ModeToggle } from "./ModeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export default function Header() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <MobileSidebar />
        <div className="ml-auto flex items-center space-x-2">
          <LanguageSwitcher />
          <ModeToggle />
          <NotificationBell />
          <UserNav />
        </div>
      </div>
    </div>
  );
}
