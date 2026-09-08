"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClassName } from "@/components/ui/forms";
import {
  ChatMessageList,
  formatChatTime,
  remainingChatHours,
} from "@/components/chat/chat-messages";
import type {
  ChatConversation,
  ChatConversationListItem,
  ChatMessage,
  UserAccountSummary,
} from "@/lib/db/types";

export function AdminChatPanel() {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<
    ChatConversationListItem[]
  >([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [user, setUser] = useState<UserAccountSummary | null>(null);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const adminId = session?.user?.id ? Number(session.user.id) : 0;

  const loadList = useCallback(async () => {
    const response = await fetch("/api/admin/chat");
    if (!response.ok) return;
    const data = (await response.json()) as {
      conversations?: ChatConversationListItem[];
    };
    setConversations(data.conversations ?? []);
  }, []);

  const loadThread = useCallback(async (id: number) => {
    const response = await fetch(`/api/admin/chat/${id}`);
    if (!response.ok) {
      setError(t("loadFailed"));
      return;
    }
    const data = (await response.json()) as {
      conversation?: ChatConversation;
      messages?: ChatMessage[];
      user?: UserAccountSummary | null;
    };
    setConversation(data.conversation ?? null);
    setMessages(data.messages ?? []);
    setUser(data.user ?? null);
    setError(null);
  }, [t]);

  useEffect(() => {
    void loadList();
    const id = window.setInterval(() => void loadList(), 5000);
    return () => window.clearInterval(id);
  }, [loadList]);

  useEffect(() => {
    if (selectedId == null) return;
    void loadThread(selectedId);
    const id = window.setInterval(() => void loadThread(selectedId), 3000);
    return () => window.clearInterval(id);
  }, [loadThread, selectedId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, selectedId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (selectedId == null) return;
    const trimmed = body.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/chat/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!response.ok) {
        setError(t("sendFailed"));
        return;
      }
      const data = (await response.json()) as { message?: ChatMessage };
      if (data.message) {
        setMessages((current) =>
          current.some((item) => item.id === data.message!.id)
            ? current
            : [...current, data.message!]
        );
      }
      setBody("");
      void loadList();
    } catch {
      setError(t("sendFailed"));
    } finally {
      setPending(false);
    }
  }

  const hoursLeft = conversation
    ? remainingChatHours(conversation.expires_at)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{t("admin.heading")}</h2>
        <p className="mt-1 text-sm text-muted">{t("admin.hint")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card elevation="nested" className="max-h-[36rem] overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted">{t("admin.empty")}</p>
          ) : (
            <ul className="space-y-2">
              {conversations.map((item) => {
                const active = item.id === selectedId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-md border px-3 py-2 text-start ${
                        active
                          ? "border-foreground bg-background-soft"
                          : "border-border bg-surface hover:bg-background-soft"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {item.user_username || item.user_email}
                        </p>
                        {item.unread_count > 0 ? (
                          <span className="rounded-full bg-foreground px-1.5 text-xs text-white">
                            {item.unread_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">
                        {item.last_message_body || t("empty")}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {formatChatTime(item.last_message_at)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card elevation="nested" className="flex min-h-[28rem] flex-col p-4">
          {selectedId == null || !conversation ? (
            <p className="text-sm text-muted">{t("admin.select")}</p>
          ) : (
            <>
              {user ? (
                <div className="mb-4 rounded-md border border-border bg-background-soft p-3">
                  <p className="font-medium text-text">{user.email}</p>
                  {user.username ? (
                    <p className="text-sm text-muted">{user.username}</p>
                  ) : null}
                  {hoursLeft != null ? (
                    <p className="mt-1 text-xs text-muted">
                      {hoursLeft <= 1
                        ? t("expiresSoon")
                        : t("expiresIn", { hours: hoursLeft })}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="accent" size="sm">
                      <Link href={`/admin/users/${user.id}`}>
                        {t("admin.viewAccount")}
                      </Link>
                    </Button>
                    {user.worker_profile_id ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/workers/${user.worker_profile_id}`}>
                          {t("admin.viewWorker")}
                        </Link>
                      </Button>
                    ) : null}
                    {user.employer_profile_id ? (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={`/employers/${user.employer_profile_id}`}>
                          {t("admin.viewEmployer")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  {!user.worker_profile_id && !user.employer_profile_id ? (
                    <p className="mt-2 text-xs text-muted">
                      {t("admin.noProfiles")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted">{t("empty")}</p>
                ) : (
                  <ChatMessageList
                    messages={messages}
                    currentUserId={adminId}
                    youLabel={t("you")}
                    adminLabel={t("adminName")}
                    userLabel={user?.username || user?.email}
                  />
                )}
              </div>

              <form
                onSubmit={(event) => void onSubmit(event)}
                className="mt-4 space-y-2"
              >
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder={t("admin.placeholder")}
                  className={inputClassName}
                />
                {error ? <p className="text-sm text-danger">{error}</p> : null}
                <Button type="submit" disabled={pending || !body.trim()}>
                  {pending ? tCommon("status.loading") : t("admin.send")}
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
