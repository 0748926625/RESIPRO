import Link from "next/link";

export function PropertyCard({
  slug,
  name,
  city,
  neighborhood,
  capacity,
  basePrice,
  currency,
  coverUrl,
}: {
  slug: string;
  name: string;
  city: string;
  neighborhood: string | null;
  capacity: number;
  basePrice: number;
  currency: string;
  coverUrl: string | null;
}) {
  return (
    <Link
      href={`/residences/${slug}`}
      className="flex flex-col overflow-hidden rounded-lg border border-foreground/10 transition-colors hover:border-foreground/30"
    >
      <div className="aspect-video bg-foreground/5">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={name} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="flex flex-col gap-1 p-3">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-sm text-foreground/60">
          {neighborhood ? `${neighborhood}, ` : ""}
          {city}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground/60">{capacity} pers.</span>
          <span className="font-medium text-foreground">
            {basePrice} {currency}
          </span>
        </div>
      </div>
    </Link>
  );
}
