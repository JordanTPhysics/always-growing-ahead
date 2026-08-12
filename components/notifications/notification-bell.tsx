"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/lib/i18n/routing";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell({
  className = cn(buttonVariants({ variant: "secondary", size: "sm" }), "relative"),
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) {
          setUnread(
            (data.notifications ?? []).filter(
              (notification: { read_at: string | null }) => !notification.read_at
            ).length
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const badge = unread ? (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-center text-xs leading-5 text-white mx-2">
      {unread > 99 ? "99+" : unread}
    </span>
  ) : null;

  return (
    <Link
      href="/notifications"
      aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      className={className}
    >
      {children ? (
        <>
          <span>{children}</span>
          {badge}
        </>
      ) : (
        <>
          <span aria-hidden="true" className="text-xl">🔔</span>
          {badge ? (
            <span className="absolute -end-1 -top-1">{badge}</span>
          ) : null}
        </>
      )}
    </Link>
  );
}
