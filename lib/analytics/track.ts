"use client";

export function track(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_name: eventName, properties }),
    keepalive: true,
  });
}
