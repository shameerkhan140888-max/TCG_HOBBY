"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const corporateNavigation = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setIsHydrated(true), []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function closeMenuAndRestoreFocus() {
    setIsOpen(false);
    menuButtonRef.current?.focus();
  }

  return (
    <header className="site-header">
      <div className="site-shell brand-masthead">
        <a className="header-logo" href="/" aria-label="Capital Hobby Group home">
          <img src="/brand/capital-hobby-group-horizontal.svg" alt="Capital Hobby Group" />
        </a>
      </div>
      <div className="site-shell header-inner">
        <button
          ref={menuButtonRef}
          className="menu-button"
          type="button"
          aria-expanded={isOpen}
          aria-controls="corporate-navigation"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          disabled={!isHydrated}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <nav
          id="corporate-navigation"
          className={isOpen ? "site-nav site-nav-open" : "site-nav"}
          aria-label="Primary navigation"
        >
          {corporateNavigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            );
          })}
          <button className="menu-close" type="button" onClick={closeMenuAndRestoreFocus}>
            Close menu
          </button>
        </nav>
      </div>
    </header>
  );
}
