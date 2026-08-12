type NewsUpdatesBannerProps = {
  excerpts: string[];
  label: string;
};

export function NewsUpdatesBanner({ excerpts, label }: NewsUpdatesBannerProps) {
  if (excerpts.length === 0) return null;

  // Trailing separator so the loop between duplicated halves stays consistent.
  const track = `${excerpts.join(" / ")} / `;

  return (
    <div
      className="group w-full overflow-hidden font-sans"
      role="region"
      aria-label={label}
    >
      <div className="relative flex flex-row flex-nowrap animate-scroll bg-slate-700">
        <p className="shrink-0 whitespace-nowrap px-4 py-2 text-sm tracking-wide sm:text-base">
          {track}
        </p>
        <p
          className="shrink-0 whitespace-nowrap px-4 py-2 text-sm tracking-wide sm:text-base"
          aria-hidden
        >
          {track}
        </p>
      </div>
    </div>
  );
}
