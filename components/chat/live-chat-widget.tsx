"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { MdChat, MdClose } from "react-icons/md";
import { useRouter } from "@/lib/i18n/navigation";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/forms";
import {
  ChatMessageList,
  remainingChatHours,
} from "@/components/chat/chat-messages";
import { panelClassName } from "@/lib/ui-styles";
import type { ChatConversation, ChatMessage } from "@/lib/db/types";

type ChatPayload = {
  conversation: ChatConversation | null;
  messages?: ChatMessage[];
  unread?: number;
};

export function LiveChatWidget({ role }: { role?: string | null }) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [conversation, setConversation] = useState<ChatConversation | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "admin" || session?.user?.role === "admin";
  const isAuthenticated = status === "authenticated";
  const userId = session?.user?.id ? Number(session.user.id) : 0;

  const scrollToLatest = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadMeta = useCallback(async () => {
    if (!isAuthenticated || isAdmin) return;
    try {
      const response = await fetch("/api/chat?meta=1");
      if (!response.ok) return;
      const data = (await response.json()) as { unread?: number };
      setUnread(data.unread ?? 0);
    } catch {
      // ignore poll errors
    }
  }, [isAdmin, isAuthenticated]);

  const loadChat = useCallback(async () => {
    if (!isAuthenticated || isAdmin) return;
    try {
      const response = await fetch("/api/chat");
      if (!response.ok) {
        setError(t("loadFailed"));
        return;
      }
      const data = (await response.json()) as ChatPayload;
      setConversation(data.conversation);
      setMessages(data.messages ?? []);
      setUnread(0);
      setError(null);
    } catch {
      setError(t("loadFailed"));
    }
  }, [isAdmin, isAuthenticated, t]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;
    if (open) {
      void loadChat();
      const id = window.setInterval(() => void loadChat(), 3000);
      return () => window.clearInterval(id);
    }
    void loadMeta();
    const id = window.setInterval(() => void loadMeta(), 15000);
    return () => window.clearInterval(id);
  }, [isAdmin, isAuthenticated, loadChat, loadMeta, open]);

  useEffect(() => {
    scrollToLatest();
  }, [messages.length, open, scrollToLatest]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (isAdmin) return null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;

    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }
      if (!response.ok) {
        setError(t("sendFailed"));
        return;
      }
      const data = (await response.json()) as {
        conversation?: ChatConversation;
        message?: ChatMessage;
      };
      if (data.conversation) setConversation(data.conversation);
      if (data.message) {
        setMessages((current) =>
          current.some((item) => item.id === data.message!.id)
            ? current
            : [...current, data.message!]
        );
      }
      setBody("");
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
    <div className="pointer-events-none fixed end-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-end gap-3">
      {open ? (
        <section
          className={`${panelClassName} pointer-events-auto flex h-[min(28rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden`}
          aria-label={t("title")}
        >
          <header className="border-b border-border bg-background-soft px-4 py-3">
            <h2 className="text-base font-semibold text-text">{t("title")}</h2>
            <p className="mt-1 text-xs text-muted">{t("subtitle")}</p>
            {hoursLeft != null ? (
              <p className="mt-1 text-xs text-muted">
                {hoursLeft <= 1
                  ? t("expiresSoon")
                  : t("expiresIn", { hours: hoursLeft })}
              </p>
            ) : null}
          </header>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3">
            {!isAuthenticated ? (
              <div className="space-y-3">
                <p className="text-sm text-muted">{t("signInPrompt")}</p>
                <Button type="button" onClick={() => router.push("/sign-in")}>
                  {t("signIn")}
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted">{t("empty")}</p>
            ) : (
              <ChatMessageList
                messages={messages}
                currentUserId={userId}
                youLabel={t("you")}
                adminLabel={t("adminName")}
              />
            )}
          </div>

          {isAuthenticated ? (
            <form
              onSubmit={(event) => void onSubmit(event)}
              className="space-y-2 border-t border-border p-3"
            >
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder={t("placeholder")}
                className={inputClassName}
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" disabled={pending || !body.trim()}>
                {pending ? tCommon("status.loading") : t("send")}
              </Button>
            </form>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={
          open
            ? t("closeChat")
            : unread
              ? t("unread", { count: unread })
              : t("openChat")
        }
        className="chat-fab-pulse pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-white shadow-button hover:opacity-95"
      >
        {open ? (
          <MdClose className="h-7 w-7" aria-hidden="true" />
        ) : (
          <MdChat className="h-7 w-7" aria-hidden="true" />
        )}
        {!open && unread > 0 ? (
          <span className="absolute -end-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1 text-center text-xs leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
