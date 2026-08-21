import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { DAY_OF_WEEK_LABELS } from "@/lib/validations/availability.schema";

import { joinSharedBooking, requestClassicBooking, requestSharedBooking } from "./actions";
import { BookingCalendar } from "./booking-calendar";

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
  allows_half_day: boolean;
  house_rules: string | null;
  property_images: { url: string; is_cover: boolean }[];
  property_amenities: { amenities: { label: string } | null }[];
};

async function getApprovedProperty(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select(
      "id, name, description, city, neighborhood, address, capacity, bedrooms, base_price, currency, check_in_time, check_out_time, allows_half_day, house_rules, property_images(url, is_cover), property_amenities(amenities(label))",
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
    property.description?.slice(0, 160) ?? `${property.name} à ${property.city} — ResiPro`;

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

  const supabase = await createClient();
  const [{ data: rules }, { data: blockRows }, { data: viewerData }, { data: openRequests }] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("day_of_week, open_time, close_time")
      .eq("property_id", property.id)
      .eq("is_active", true)
      .order("day_of_week")
      .order("open_time"),
    supabase
      .from("availability_blocks")
      .select("starts_at, ends_at")
      .eq("property_id", property.id)
      .order("starts_at"),
    supabase.auth.getUser(),
    supabase
      .from("shared_booking_requests")
      .select("id, requested_start, requested_end, initiator_profile_id, expires_at")
      .eq("property_id", property.id)
      .eq("status", "searching_partner")
      .order("requested_start"),
  ]);

  const activeBlocks = (blockRows ?? []).map((block) => ({
    start: new Date(block.starts_at),
    end: new Date(block.ends_at),
  }));
  const checkInTime = (property.check_in_time ?? "13:00:00").slice(0, 5);

  // A shared request is always exactly one canonical half-day slot (7h "day" half or 17h
  // "night" half — see migration 0036); the only joinable candidate is the other half of
  // that same day cycle. Requests created under the old free-form model won't match
  // either duration and are simply not offered as joinable.
  const now = new Date();
  const viewerId = viewerData.user?.id;
  const joinableRequests = property.allows_half_day
    ? (openRequests ?? [])
        .filter((request) => request.initiator_profile_id !== viewerId)
        .filter((request) => !request.expires_at || new Date(request.expires_at) > now)
        .map((request) => {
          const requestedStart = new Date(request.requested_start);
          const requestedEnd = new Date(request.requested_end);
          const durationHours = (requestedEnd.getTime() - requestedStart.getTime()) / 3600000;

          let candidate: { start: Date; end: Date } | null = null;
          if (durationHours === 7) {
            candidate = { start: requestedEnd, end: new Date(requestedStart.getTime() + 24 * 3600000) };
          } else if (durationHours === 17) {
            candidate = { start: new Date(requestedStart.getTime() - 17 * 3600000), end: requestedStart };
          }

          return { id: request.id, requestedStart, requestedEnd, candidate };
        })
        .filter((request) => request.candidate !== null)
        .map((request) => ({ ...request, candidate: request.candidate! }))
    : [];

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

      {rules && rules.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">Horaires d&apos;ouverture</h2>
          <ul className="flex flex-col gap-1 text-sm text-foreground/80">
            {rules.map((rule, index) => (
              <li key={index}>
                {DAY_OF_WEEK_LABELS[rule.day_of_week]} : {rule.open_time.slice(0, 5)} – {rule.close_time.slice(0, 5)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!viewerData.user ? (
        <div className="flex flex-col gap-1 rounded-lg border border-foreground/10 bg-foreground/5 p-3 text-sm">
          <p className="text-foreground/80">
            Vous pouvez consulter les disponibilités librement.{" "}
            <Link href={`/login?next=/residences/${slug}`} className="underline">
              Connectez-vous
            </Link>{" "}
            pour finaliser une réservation.
          </p>
        </div>
      ) : null}

      <BookingCalendar
        action={requestClassicBooking.bind(null, property.id)}
        blocks={activeBlocks}
        checkInTime={checkInTime}
        allowsHalfDay={property.allows_half_day}
        mode="classic"
        title="Réserver"
        priceLabel={`${property.base_price} ${property.currency}`}
        submitLabel="Réserver ce créneau"
      />

      {property.allows_half_day ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-foreground">Réservation partagée à deux</h2>
          <p className="text-xs text-foreground/60">
            Une demi-journée réservée seule attend un deuxième client pour l&apos;autre demi-journée de la même
            journée.
          </p>
          {joinableRequests.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {joinableRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-foreground/80">
                    Un participant a réservé{" "}
                    {request.requestedStart.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}{" "}
                    – {request.requestedEnd.toLocaleTimeString("fr-FR", { timeStyle: "short" })}
                  </span>
                  <form
                    action={joinSharedBooking.bind(
                      null,
                      request.id,
                      request.candidate.start.toISOString(),
                      request.candidate.end.toISOString(),
                    )}
                  >
                    <button
                      type="submit"
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    >
                      Rejoindre {request.candidate.start.toLocaleTimeString("fr-FR", { timeStyle: "short" })}–
                      {request.candidate.end.toLocaleTimeString("fr-FR", { timeStyle: "short" })}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-foreground/60">
              Aucune demande de partage en attente pour cette résidence pour le moment.
            </p>
          )}
          <BookingCalendar
            action={requestSharedBooking.bind(null, property.id)}
            blocks={activeBlocks}
            checkInTime={checkInTime}
            allowsHalfDay={property.allows_half_day}
            mode="shared"
            title="Créer une demande de partage"
            priceLabel={`${Math.round(property.base_price / 2)} ${property.currency} / personne`}
            submitLabel="Créer la demande"
          />
        </div>
      ) : null}

      <p className="text-xs text-foreground/50">
        La réservation et le contact du gérant se font via la plateforme — vos coordonnées ne sont
        jamais communiquées automatiquement (§6).
      </p>
    </div>
  );
}
