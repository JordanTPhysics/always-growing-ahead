import type { ChatMessage } from "@/lib/db/types";

export function formatChatTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function remainingChatHours(expiresAt: Date | string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
}

export function ChatMessageList({
  messages,
  currentUserId,
  youLabel,
  adminLabel,
  userLabel,
}: {
  messages: ChatMessage[];
  currentUserId: number;
  youLabel: string;
  adminLabel: string;
  userLabel?: string;
}) {
  return (
    <ul className="space-y-3">
      {messages.map((message) => {
        const mine = message.sender_id === currentUserId;
        const label = mine
          ? youLabel
          : message.sender_role === "admin"
            ? adminLabel
            : (userLabel ?? youLabel);
        return (
          <li
            key={message.id}
            className={`rounded-md border p-3 ${
              mine
                ? "ms-6 border-foreground/30 bg-background-soft"
                : "me-6 border-border bg-surface"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-text">{label}</p>
              <time
                dateTime={new Date(message.created_at).toISOString()}
                className="shrink-0 text-xs text-muted"
              >
                {formatChatTime(message.created_at)}
              </time>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text">
              {message.body}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
