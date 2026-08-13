"use client";

import { usePathname } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export function MainShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 px-4 py-8 sm:px-6",
        isHome ? "md:w-[80vw] md:max-w-[80vw]" : "max-w-5xl"
      )}
    >
      {children}
    </main>
  );
}
