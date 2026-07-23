"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { PageHeader } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import { Card, PageSection } from "@/components/ui/card";

type Notification = {
  id: number;
  title: string;
  body: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((response) => response.json())
      .then((data) => setNotifications(data.notifications ?? []))
      .catch(() => undefined);
  }, []);

  async function markRead(id?: number) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    if (!response.ok) return;
    setNotifications((current) =>
      current.map((notification) =>
        !id || notification.id === id
          ? { ...notification, read_at: notification.read_at ?? new Date().toISOString() }
          : notification
      )
    );
  }

  return (
    <PageSection>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => void markRead()}
          >
            {t("markAllRead")}
          </Button>
        }
      />
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card elevation="nested" className="p-5 text-muted">
            {t("empty")}
          </Card>
        ) : (
          notifications.map((notification) => {
            const content = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-medium">{notification.title}</h2>
                  {!notification.read_at ? (
                    <span className="rounded-full bg-background-soft px-2 py-0.5 text-xs text-muted">
                      {t("unread")}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted">{notification.body}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </>
            );
            const className = notification.read_at
              ? "block"
              : "block rounded-lg";

            return notification.link_url ? (
              <Link
                key={notification.id}
                href={notification.link_url}
                className={className}
                onClick={() => void markRead(notification.id)}
              >
                <Card
                  elevation="nested"
                  className={
                    notification.read_at
                      ? "p-4"
                      : "border-accent/40 bg-background-soft/60 p-4"
                  }
                >
                  {content}
                </Card>
              </Link>
            ) : (
              <button
                key={notification.id}
                type="button"
                className={`${className} w-full text-start`}
                onClick={() => void markRead(notification.id)}
              >
                <Card
                  elevation="nested"
                  className={
                    notification.read_at
                      ? "p-4"
                      : "border-accent/40 bg-background-soft/60 p-4"
                  }
                >
                  {content}
                </Card>
              </button>
            );
          })
        )}
      </div>
    </PageSection>
  );
}
