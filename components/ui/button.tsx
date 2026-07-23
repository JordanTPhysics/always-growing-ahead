"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium transition-[box-shadow,background-color,opacity] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border-strong)] bg-background text-white shadow-button hover:opacity-95 hover:shadow-button-hover",
        secondary:
          "border-border bg-surface text-text shadow-button hover:bg-background-soft hover:shadow-button-hover",
        accent:
          "border-[#7a5519] bg-foreground text-white shadow-button hover:opacity-95 hover:shadow-button-hover",
        ghost:
          "border-transparent bg-transparent text-text shadow-none hover:bg-background-soft hover:text-text",
        outline:
          "border-border bg-surface text-text shadow-button hover:bg-background-soft hover:shadow-button-hover",
        link: "border-transparent bg-transparent text-text shadow-none underline-offset-4 hover:underline",
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
