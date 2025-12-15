"use client";

import { MobileSidebar } from "./Sidebar";
import { UserNav } from "./UserNav"; // Need to create this
import { ModeToggle } from "./ModeToggle"; // Optional dark mode toggle

export default function Header() {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <MobileSidebar />
        <div className="ml-auto flex items-center space-x-4">
          {/* <ModeToggle /> */}
          <UserNav />
        </div>
      </div>
    </div>
  );
}
