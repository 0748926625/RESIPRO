import Link from "next/link";

import { INTERMEDIATION_STATUS_LABELS } from "@/lib/constants/statuses";
import type { IntermediationStatus } from "@/lib/constants/statuses";
import { createClient } from "@/lib/supabase/server";

import {
  assignProperty,
  linkBooking,
  markCancelled,
  markClientReferred,
  markCompleted,
  markContacted,
} from "./actions";

type RequestRow = {
  id: string;
  full_name: string;
  phone: string;
  requested_city: string | null;
  requested_neighborhood: string | null;
  requested_date: string | null;
  requested_start: string | null;
  requested_end: string | null;
  budget: number | null;
  party_size: number | null;
  preferences: string | null;
  comments: string | null;
  status: IntermediationStatus;
  client_profile_id: string | null;
  assigned_property_id: string | null;
  created_at: string;
};

const FILTERS = [
  { value: "new", label: "Nouvelles" },
  { value: "contacted", label: "Contactées" },
  { value: "residence_found", label: "Résidence proposée" },
  { value: "client_referred", label: "Mises en relation" },
  { value: "all", label: "Toutes" },
];

export default async function AdminIntermediationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status ?? "new";

  const supabase = await createClient();
  let query = supabase
    .from("intermediation_requests")
    .select(
      "id, full_name, phone, requested_city, requested_neighborhood, requested_date, requested_start, requested_end, budget, party_size, preferences, comments, status, client_profile_id, assigned_property_id, created_at",
    )
    .order("created_at", { ascending: false });

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter as IntermediationStatus);
  }

  const [{ data }, { data: properties }] = await Promise.all([
    query,
    supabase.from("properties").select("id, name, city").eq("status", "approved").order("name"),
  ]);

  const requests = (data ?? []) as RequestRow[];

  // Only needed for requests already client_referred, to let the admin link the booking
  // that resulted from the intermediation.
  const clientIds = requests
    .filter((request) => request.status === "client_referred" && request.client_profile_id)
    .map((request) => request.client_profile_id as string);

  let bookingsByClient = new Map<string, { id: string; booking_code: string }[]>();
  if (clientIds.length > 0) {
    const { data: segments } = await supabase
      .from("booking_segments")
      .select("participant_profile_id, bookings(id, booking_code)")
      .in("participant_profile_id", clientIds);

    const grouped = new Map<string, { id: string; booking_code: string }[]>();
    for (const segment of (segments ?? []) as unknown as {
      participant_profile_id: string;
      bookings: { id: string; booking_code: string } | null;
    }[]) {
      if (!segment.bookings) continue;
      const list = grouped.get(segment.participant_profile_id) ?? [];
      list.push(segment.bookings);
      grouped.set(segment.participant_profile_id, list);
    }
    bookingsByClient = grouped;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Intermédiation</h1>

      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/intermediation?status=${filter.value}`}
            className={`rounded-full px-3 py-1 ${
              activeFilter === filter.value
                ? "bg-foreground text-background"
                : "border border-foreground/15 text-foreground/70"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune demande dans ce filtre.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-foreground">{request.full_name}</p>
                <span className="text-xs text-foreground/50">{INTERMEDIATION_STATUS_LABELS[request.status]}</span>
              </div>
              <p className="text-foreground/70">{request.phone}</p>
              <p className="text-foreground/70">
                {request.requested_city ?? "—"}
                {request.requested_neighborhood ? `, ${request.requested_neighborhood}` : ""}
                {request.requested_date ? ` · ${request.requested_date}` : ""}
                {request.requested_start ? ` ${request.requested_start.slice(0, 5)}` : ""}
                {request.requested_end ? `–${request.requested_end.slice(0, 5)}` : ""}
              </p>
              {request.budget || request.party_size ? (
                <p className="text-foreground/70">
                  {request.budget ? `Budget : ${request.budget}` : ""}
                  {request.party_size ? ` · ${request.party_size} personne(s)` : ""}
                </p>
              ) : null}
              {request.preferences ? <p className="text-foreground/60">Préférences : {request.preferences}</p> : null}
              {request.comments ? <p className="text-foreground/60">Commentaires : {request.comments}</p> : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {request.status === "new" ? (
                  <form action={markContacted.bind(null, request.id)}>
                    <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
                      Marquer contacté
                    </button>
                  </form>
                ) : null}

                {request.status === "contacted" || request.status === "new" ? (
                  <form action={assignProperty.bind(null, request.id)} className="flex items-center gap-1">
                    <select name="propertyId" className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs">
                      <option value="">Choisir une résidence…</option>
                      {(properties ?? []).map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name} — {property.city}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                      Proposer
                    </button>
                  </form>
                ) : null}

                {request.status === "residence_found" ? (
                  <form action={markClientReferred.bind(null, request.id)}>
                    <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background">
                      Marquer mis en relation
                    </button>
                  </form>
                ) : null}

                {request.status === "client_referred" && request.client_profile_id ? (
                  <form action={linkBooking.bind(null, request.id)} className="flex items-center gap-1">
                    <select name="bookingId" className="rounded-md border border-foreground/15 bg-transparent px-2 py-1 text-xs">
                      <option value="">Lier une réservation…</option>
                      {(bookingsByClient.get(request.client_profile_id) ?? []).map((booking) => (
                        <option key={booking.id} value={booking.id}>
                          {booking.booking_code}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-md border border-foreground/20 px-3 py-1.5 text-xs">
                      Lier
                    </button>
                  </form>
                ) : null}

                {request.status !== "completed" && request.status !== "cancelled" ? (
                  <>
                    <form action={markCompleted.bind(null, request.id)}>
                      <button type="submit" className="text-xs text-foreground/60 underline">
                        Terminer
                      </button>
                    </form>
                    <form action={markCancelled.bind(null, request.id)}>
                      <button type="submit" className="text-xs text-red-600 underline">
                        Annuler
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
