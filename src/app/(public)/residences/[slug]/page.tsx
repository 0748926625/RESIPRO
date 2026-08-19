import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Property = {
  id: string;
  name: string;
  description: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  capacity: number;
  bedrooms: number;
  base_price: number;
  currency: string;
  check_in_time: string | null;
  check_out_time: string | null;
  house_rules: string | null;
  property_images: { url: string; is_cover: boolean }[];
  property_amenities: { amenities: { label: string } | null }[];
};

async function getApprovedProperty(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(
      "id, name, description, city, neighborhood, address, capacity, bedrooms, base_price, currency, check_in_time, check_out_time, house_rules, property_images(url, is_cover), property_amenities(amenities(label))",
    )
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle();

  return data as unknown as Property | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getApprovedProperty(slug);

  if (!property) {
    return { title: "Résidence introuvable" };
  }

  const description =
    property.description?.slice(0, 160) ?? `${property.name} à ${property.city} — Residence Pro`;

  return {
    title: property.name,
    description,
    openGraph: {
      title: property.name,
      description,
      images: property.property_images[0]?.url ? [property.property_images[0].url] : undefined,
    },
  };
}

export default async function ResidenceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getApprovedProperty(slug);

  if (!property) {
    notFound();
  }

  const cover = property.property_images.find((image) => image.is_cover) ?? property.property_images[0];
  const gallery = property.property_images.filter((image) => image !== cover);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="aspect-video overflow-hidden rounded-lg bg-foreground/5">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={property.name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      {gallery.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {gallery.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.url}
              src={image.url}
              alt=""
              className="aspect-video rounded-md object-cover"
            />
          ))}
        </div>
      ) : null}

      <div>
        <h1 className="text-2xl font-semibold text-foreground">{property.name}</h1>
        <p className="text-sm text-foreground/60">
          {property.neighborhood ? `${property.neighborhood}, ` : ""}
          {property.city}
        </p>
      </div>

      <div className="flex flex-wrap gap-6 text-sm text-foreground/80">
        <span>{property.capacity} personnes</span>
        <span>{property.bedrooms} chambre(s)</span>
        <span className="font-medium text-foreground">
          {property.base_price} {property.currency}
        </span>
        {property.check_in_time ? <span>Arrivée dès {property.check_in_time}</span> : null}
        {property.check_out_time ? <span>Départ avant {property.check_out_time}</span> : null}
      </div>

      {property.description ? (
        <p className="whitespace-pre-line text-sm text-foreground/80">{property.description}</p>
      ) : null}

      {property.property_amenities.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">Équipements</h2>
          <div className="flex flex-wrap gap-2 text-xs text-foreground/70">
            {property.property_amenities.map((entry, index) =>
              entry.amenities ? (
                <span key={index} className="rounded-full border border-foreground/15 px-3 py-1">
                  {entry.amenities.label}
                </span>
              ) : null,
            )}
          </div>
        </div>
      ) : null}

      {property.house_rules ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">Règles et informations importantes</h2>
          <p className="whitespace-pre-line text-sm text-foreground/80">{property.house_rules}</p>
        </div>
      ) : null}

      <p className="text-xs text-foreground/50">
        La réservation et le contact du gérant se font via la plateforme — vos coordonnées ne sont
        jamais communiquées automatiquement (§6).
      </p>
    </div>
  );
}
