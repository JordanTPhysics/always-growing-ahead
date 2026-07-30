import { cn } from "@/lib/utils";

export function StarIcon({
  filled,
  className,
}: {
  filled: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.75}
    >
      <path
        strokeLinejoin="round"
        d="M12 2.5l2.86 5.8 6.4.93-4.63 4.51 1.09 6.37L12 17.77l-5.72 3.01 1.09-6.37L2.74 9.23l6.4-.93L12 2.5z"
      />
    </svg>
  );
}
