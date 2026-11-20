"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Closes the mobile <details> menu after each navigation. */
export function MobileMenuCloser({ targetId }: { targetId: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    document.getElementById(targetId)?.removeAttribute("open");
  }, [pathname, search, targetId]);
  return null;
}
