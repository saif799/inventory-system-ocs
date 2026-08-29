import type { Metadata } from "next";
import { cookies } from "next/headers";

import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  SIDEBAR_COOKIE_NAME,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { requireAdminPage } from "@/lib/auth/guard";

/**
 * Every admin page renders through here, so one guard covers the whole
 * dashboard — including any page added later that forgets to guard itself.
 * proxy.ts already redirects unauthenticated requests; this is the layer that
 * still holds if the proxy is ever bypassed.
 *
 * /admin/login sits outside this group precisely so it does not hit this guard
 * (and so it renders without the sidebar).
 *
 * `noindex` stays: the dashboard is now behind a password, but there is no
 * reason for its URLs to sit in an index either.
 */
export const metadata: Metadata = {
  title: "OCS Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();

  // SidebarProvider writes this cookie on every toggle; reading it here means
  // the first paint already matches the owner's last choice instead of
  // flashing open. The name is owned by the sidebar component, not re-declared.
  const jar = await cookies();
  const defaultOpen = jar.get(SIDEBAR_COOKIE_NAME)?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-xl">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
