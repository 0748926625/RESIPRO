import { cancelSharedBookingRequest } from "@/lib/bookings/shared-actions";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  searching_partner: "Recherche d'un deuxième participant",
  partner_found: "Partenaire trouvé",
  expired: "Expirée",
  cancelled: "Annulée",
  converted: "Convertie en réservation",
};

export default async function AdminSharedBookingsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shared_booking_requests")
    .select("id, requested_start, requested_end, status, properties(name, city)")
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as unknown as Array<{
    id: string;
    requested_start: string;
    requested_end: string;
    status: string;
    properties: { name: string; city: string } | null;
  }>;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Réservations partagées</h1>

      {requests.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune demande de partage pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10">
          {requests.map((request) => (
            <li key={request.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-foreground">
                  {request.properties?.name ?? "Résidence"} — {request.properties?.city}
                </p>
                <p className="text-foreground/60">
                  {new Date(request.requested_start).toLocaleString("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  – {new Date(request.requested_end).toLocaleTimeString("fr-FR", { timeStyle: "short" })}
                </p>
                <p className="text-xs text-foreground/50">{STATUS_LABELS[request.status] ?? request.status}</p>
              </div>
              {request.status === "searching_partner" ? (
                <form action={cancelSharedBookingRequest.bind(null, request.id, "/admin/shared-bookings")}>
                  <button type="submit" className="text-xs text-red-600 underline">
                    Annuler
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
