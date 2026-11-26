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

export function chatExpiryParts(expiresAt: Date | string):
  | { kind: "soon" }
  | { kind: "hours"; hours: number }
  | { kind: "days"; days: number } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
  if (hours <= 1) return { kind: "soon" };
  if (hours < 48) return { kind: "hours", hours };
  const days = Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  return { kind: "days", days };
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
                ? "ms-6 border-foreground/40 bg-foreground/10"
                : "me-6 border-background/25 bg-background-soft"
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
