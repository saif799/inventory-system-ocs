"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Drops the session cookie and sends the browser back to the login screen.
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
      className={cn("text-muted-foreground hover:bg-white/10", className)}
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only md:not-sr-only md:ms-2">Sign out</span>
    </Button>
  );
};

export default LogoutButton;
