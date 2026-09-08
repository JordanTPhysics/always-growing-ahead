import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { PillToggle } from "@/components/ui/pill-toggle";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

const invalidControlClassName =
  "[&_input]:border-danger [&_textarea]:border-danger [&_select]:border-danger [&_input]:focus:ring-danger [&_textarea]:focus:ring-danger [&_select]:focus:ring-danger";

export function Field({
  label,
  children,
  hint,
  error,
  invalid: invalidProp,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  invalid?: boolean;
}) {
  const invalid = Boolean(error) || Boolean(invalidProp);
  const marked = Children.map(children, (child) => {
    if (!invalid || !isValidElement(child)) return child;
    if (typeof child.type !== "string") return child;
    if (!["input", "textarea", "select"].includes(child.type)) return child;
    return cloneElement(
      child as ReactElement<{ "aria-invalid"?: boolean }>,
      { "aria-invalid": true }
    );
  });

  return (
    <label className={cn("block space-y-1.5", invalid && invalidControlClassName)}>
      <span
        className={cn(
          "text-sm font-medium",
          invalid ? "text-danger" : "text-text"
        )}
      >
        {label}
      </span>
      {marked}
      {error ? (
        <span className="block text-xs text-danger" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export type FormMode = "preview" | "edit";

export function FormModeTabs({
  mode,
  onChange,
  previewLabel,
  editLabel,
}: {
  mode: FormMode;
  onChange: (mode: FormMode) => void;
  previewLabel: string;
  editLabel: string;
}) {
  return (
    <PillToggle
      value={mode}
      onChange={onChange}
      fullWidth
      ariaLabel={`${previewLabel} / ${editLabel}`}
      options={[
        { value: "preview", label: previewLabel },
        { value: "edit", label: editLabel },
      ]}
    />
  );
}

export const inputClassName =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text outline-none ring-accent focus:ring-2";
