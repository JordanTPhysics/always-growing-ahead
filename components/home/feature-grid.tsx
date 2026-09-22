import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

export type HomeFeature = {
  title: string;
  body: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

const layouts = [
  {
    row: "md:h-[24rem] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
    imageFirst: false,
  },
  {
    row: "md:h-[28rem] md:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]",
    imageFirst: true,
  },
  {
    row: "md:h-[22rem] md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]",
    imageFirst: false,
  },
  {
    row: "md:h-[26rem] md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]",
    imageFirst: true,
  },
  {
    row: "md:h-[24rem] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
    imageFirst: false,
  },
] as const;

function FeatureText({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-6 py-8 sm:px-10 sm:py-12">
      <h2 className="feature-title-underline text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        {title}
      </h2>
      <p className="max-w-md text-base text-white/90 sm:text-lg">{body}</p>
    </div>
  );
}

function FeatureImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:h-full">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 60vw"
        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </div>
  );
}

export function FeatureGrid({
  kicker,
  items,
}: {
  kicker: string;
  items: HomeFeature[];
}) {
  return (
    <section className="space-y-4" aria-labelledby="home-features-heading">
      <p
        id="home-features-heading"
        className="text-sm font-medium uppercase tracking-[0.18em] text-muted"
      >
        {kicker}
      </p>
      <div className="flex flex-col gap-1">
        {items.map((item, index) => {
          const layout = layouts[index] ?? layouts[0];
          const text = <FeatureText title={item.title} body={item.body} />;
          const image = (
            <FeatureImage src={item.imageSrc} alt={item.imageAlt} />
          );

          return (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              className={cn(
                "group grid grid-cols-1 overflow-hidden text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                layout.row
              )}
            >
              {layout.imageFirst ? (
                <>
                  {image}
                  {text}
                </>
              ) : (
                <>
                  {text}
                  {image}
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
