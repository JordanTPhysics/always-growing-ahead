"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SaveSearchButton({
  kind,
  getFilters,
}: {
  kind: "jobs" | "workers";
  getFilters: () => object;
}) {
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function saveSearch() {
    const name = window.prompt("Name this search");
    if (!name?.trim()) return;

    setStatus("idle");
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, filters: getFilters() }),
      });
      setStatus(response.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={() => void saveSearch()}>
        Save search
      </Button>
      {status === "saved" ? <span className="text-xs text-muted">Saved</span> : null}
      {status === "error" ? <span className="text-xs text-danger">Could not save</span> : null}
    </span>
  );
}
