"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Drops the session cookie and sends the browser back to the login screen.
 * Rendered in the admin sidebar footer, and styled to survive its icon rail.
 *
 * Uses a full document navigation for the same reason LoginForm does: a
 * router.push() would return before the navigation finished and leave the
 * client Router Cache holding the signed-in render, so a "logged out" browser
 * could keep showing admin data until a hard reload.
 */
const LogoutButton = ({ className }: { className?: string }) => {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.assign("/admin/login");
    } catch {
      // Network failure: the cookie is still live, so stay put and let the
      // owner retry rather than pretending they are signed out.
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={logout}
      disabled={pending}
      className={cn(
        "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        // The sidebar footer is inside Sidebar's `group`, so the collapsed
        // icon rail shrinks this to a square and clips the label — the same
        // trick SidebarMenuButton uses. The label stays put in the mobile
        // sheet, which never collapses.
        "overflow-hidden group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-2",
        className,
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      <span className="ms-2 truncate">Sign out</span>
    </Button>
  );
};

export default LogoutButton;
