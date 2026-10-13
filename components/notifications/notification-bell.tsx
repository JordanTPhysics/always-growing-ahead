"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@/lib/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function useUnreadNotificationCount(enabled: boolean) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled]);

  return unread;
}

export function UnreadCountBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-danger px-1 text-center text-xs leading-5 text-white",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function NotificationBell({
  unread,
  className = cn(buttonVariants({ variant: "secondary", size: "sm" }), "relative"),
  children,
}: {
  unread: number;
  className?: string;
  children?: ReactNode;
}) {
  const badge = <UnreadCountBadge count={unread} className={children ? "mx-2" : undefined} />;

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
          {unread > 0 ? (
            <span className="absolute -end-1 -top-1">
              <UnreadCountBadge count={unread} />
            </span>
          ) : null}
        </>
      )}
    </Link>
  );
}
