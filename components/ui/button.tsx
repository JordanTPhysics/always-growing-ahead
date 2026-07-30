"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border text-sm font-medium text-text disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "button-3d button-fill-dark border-[var(--border-strong)] bg-background text-white [--button-silhouette-bg:var(--border-strong)] hover:opacity-95",
        secondary:
          "button-3d button-fill-light border-border bg-surface [--button-silhouette-bg:var(--border)] hover:bg-background-soft",
        accent:
          "button-3d button-fill-dark border-[#7a5519] bg-foreground [--button-silhouette-bg:#7a5519] hover:opacity-95",
        ghost:
          "button-fill-light border-transparent bg-transparent shadow-none transition-[background-color,opacity] hover:bg-background-soft",
        outline:
          "button-3d button-fill-light border-border bg-surface text-background [--button-silhouette-bg:var(--border)] hover:bg-background-soft",
        link: "button-fill-light border-transparent bg-transparent shadow-none underline-offset-4 transition-[opacity] hover:underline",
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

const silhouetteWrapClassName: Partial<
  Record<NonNullable<VariantProps<typeof buttonVariants>["variant"]>, string>
> = {
  default: "[--button-silhouette-bg:var(--border-strong)]",
  secondary: "[--button-silhouette-bg:var(--border)]",
  accent: "[--button-silhouette-bg:#7a5519]",
  outline: "[--button-silhouette-bg:var(--border)]",
};

function is3dVariant(
  variant: VariantProps<typeof buttonVariants>["variant"]
): variant is keyof typeof silhouetteWrapClassName {
  return variant !== "ghost" && variant !== "link";
}

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
  const classes = cn(buttonVariants({ variant, size, className }));

  const face = (
    <Comp data-slot="button" className={classes} {...props} />
  );

  if (!is3dVariant(variant)) {
    return face;
  }

  return (
    <span
      className={cn(
        "button-3d-wrap rounded-md",
        silhouetteWrapClassName[variant ?? "default"]
      )}
    >
      {face}
    </span>
  );
}

export { Button, buttonVariants };
