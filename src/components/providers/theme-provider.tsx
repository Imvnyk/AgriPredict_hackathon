"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useParams, usePathname } from "next/navigation";
import * as React from "react";

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();
  const params = useParams();
  const isLinkInBioPage =
    typeof params.handle === "string" && /^\/[^/]+\/?$/.test(pathname ?? "");
  const isBookingPage = /^\/[^/]+\/booking(?:\/|$)/.test(pathname ?? "");
  const isBookingEmbed = /^\/embed\/booking\/[^/]+(?:\/|$)/.test(
    pathname ?? "",
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
      forcedTheme={
        isLinkInBioPage || isBookingPage || isBookingEmbed
          ? "light"
          : props.forcedTheme
      }
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (forcedTheme || event.defaultPrevented || event.repeat) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (!event.key || event.key.toLowerCase() !== "d") {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [resolvedTheme, setTheme, forcedTheme]);

  return null;
}

export { ThemeProvider };
