"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/admin", label: "Home" },
  { href: "/admin/add-shoes", label: "Add Shoes" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/arrivals", label: "Arrivages" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/notifier", label: "Notifier" },
  { href: "/admin/borrowers", label: "Borrowers" },
  { href: "/admin/rebalance", label: "Rebalance" },
  { href: "/admin/storefront", label: "Storefront" },
  { href: "/admin/settings", label: "Settings" },
] as const;

const NavBar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const linkClassName = (href: string) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-white/10 hover:text-accent-foreground dark:hover:bg-white/10",
      pathname === href
        ? "bg-white/15 text-accent-foreground shadow-inner dark:bg-white/10"
        : "text-muted-foreground"
    );

  return (
    <nav className="sticky top-0 z-40 border-b border-white/20 bg-background/60 shadow-sm backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/40 dark:border-white/10 dark:bg-background/40">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/admin"
          className="shrink-0 text-base font-semibold tracking-tight sm:text-lg"
        >
          OCS Inventory
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClassName(href)}>
              {label}
            </Link>
          ))}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden hover:bg-white/10"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 top-[57px] z-30 bg-black/20 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        id="mobile-nav"
        className={cn(
          "absolute left-0 right-0 top-full z-40 border-b border-white/20 bg-background/60 shadow-lg backdrop-blur-xl backdrop-saturate-150 transition-all duration-200 supports-[backdrop-filter]:bg-background/40 dark:border-white/10 dark:bg-background/40 md:hidden",
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-2 opacity-0 pointer-events-none"
        )}
      >
        <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(linkClassName(href), "w-full")}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
