import type { ReactNode } from "react";

/** Root layout passes through; `<html>` / `<body>` live in `[locale]/layout`. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
