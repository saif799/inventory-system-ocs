import type { Metadata } from "next";
import NavBar from "@/components/navBar";
import { requireAdminPage } from "@/lib/auth/guard";

/**
 * Every admin page renders through here, so one guard covers the whole
 * dashboard — including any page added later that forgets to guard itself.
 * proxy.ts already redirects unauthenticated requests; this is the layer that
 * still holds if the proxy is ever bypassed.
 *
 * /admin/login sits outside this group precisely so it does not hit this guard
 * (and so it renders without a nav bar).
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

  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
