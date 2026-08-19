// Mirrors the notification "type" strings written by supabase/migrations/0027 — kept as
// a plain string union (not a DB enum) since notifications.type is free text, matching
// the flexibility of the underlying column.
export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  new_booking: "Nouvelle réservation",
  partner_found: "Partenaire trouvé",
  payment_requested: "Paiement demandé",
  payment_submitted: "Paiement à vérifier",
  payment_confirmed: "Paiement confirmé",
  payment_rejected: "Paiement refusé",
  booking_cancelled: "Réservation annulée",
  booking_awaiting_confirmation: "Réservation à confirmer",
  booking_confirmed: "Réservation confirmée",
  property_status_changed: "Statut de résidence modifié",
  new_intermediation: "Nouvelle demande d'intermédiation",
};
