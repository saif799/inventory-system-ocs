import type { Metadata } from "next";
import NavBar from "@/components/navBar";

/**
 * The dashboard is unauthenticated (see CLAUDE.md), so keeping it out of the
 * index is the only thing standing between it and a search result. This
 * overrides the storefront-wide `index: true` set in the root layout.
 */
export const metadata: Metadata = {
  title: "OCS Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
