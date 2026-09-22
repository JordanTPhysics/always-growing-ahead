"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-semibold disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-text",
  {
    variants: {
      variant: {
        default:
          "button-gradient [--button-from:var(--button-happy-from)] [--button-to:var(--button-happy-to)] [--button-fg:var(--button-happy-fg)]",
        secondary:
          "button-gradient [--button-from:var(--button-secondary-from)] [--button-to:var(--button-secondary-to)] [--button-fg:var(--button-secondary-fg)]",
        accent:
          "button-gradient [--button-from:var(--button-accent-from)] [--button-to:var(--button-accent-to)] [--button-fg:var(--button-accent-fg)]",
        destructive:
          "button-gradient [--button-from:var(--button-danger-from)] [--button-to:var(--button-danger-to)] [--button-fg:var(--button-danger-fg)]",
        outline:
          "button-gradient [--button-from:var(--button-outline-from)] [--button-to:var(--button-outline-to)] [--button-fg:var(--button-outline-fg)] [--button-border:var(--border)]",
        ghost:
          "relative origin-center border-transparent bg-transparent text-background shadow-none transition-[transform,background-color] hover:z-10 hover:scale-105 hover:bg-background-soft focus-visible:z-10 focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-colors",
        link: "relative origin-center border-transparent bg-transparent text-background shadow-none underline-offset-4 transition-transform hover:z-10 hover:scale-105 hover:underline focus-visible:z-10 focus-visible:scale-105 motion-reduce:transform-none motion-reduce:transition-none",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-9 px-3 py-1.5",
        lg: "min-h-12 px-6 py-3",
        icon: "min-h-11 min-w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
