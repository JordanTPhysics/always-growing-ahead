import { useLocale } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export type NewsBannerItem = {
  text: string;
  href: string | null;
};

type NewsUpdatesBannerProps = {
  excerpts: NewsBannerItem[];
  label: string;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function ExcerptText({
  item,
  tabIndex,
}: {
  item: NewsBannerItem;
  tabIndex?: number;
}) {
  if (!item.href) return item.text;

  const className =
    "underline decoration-white/70 underline-offset-2 hover:decoration-white";

  if (isExternalHref(item.href)) {
    return (
      <a
        href={item.href}
        className={className}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={tabIndex}
      >
        {item.text}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} tabIndex={tabIndex}>
      {item.text}
    </Link>
  );
}

function Track({
  excerpts,
  hidden,
}: {
  excerpts: NewsBannerItem[];
  hidden?: boolean;
}) {
  return (
    <p
      className="shrink-0 whitespace-nowrap px-4 py-2 text-sm tracking-wide sm:text-base"
      aria-hidden={hidden || undefined}
    >
      {excerpts.map((item, index) => (
        <span key={`${item.text}-${item.href ?? ""}-${index}`}>
          {index > 0 ? " | " : null}
          <ExcerptText item={item} tabIndex={hidden ? -1 : undefined} />
        </span>
      ))}
      {" | "}
    </p>
  );
}

export function NewsUpdatesBanner({ excerpts, label }: NewsUpdatesBannerProps) {
  const locale = useLocale();
  if (excerpts.length === 0) return null;

  const animateScroll =
    locale === "en" ? "animate-scroll" : "animate-scroll-backward";

  return (
    <div
      className="group w-full overflow-hidden font-sans"
      role="region"
      aria-label={label}
    >
      <div
        className={`relative flex flex-row flex-nowrap bg-slate-700 ${animateScroll} group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]`}
      >
        <Track excerpts={excerpts} />
        <Track excerpts={excerpts} hidden />
      </div>
    </div>
  );
}
