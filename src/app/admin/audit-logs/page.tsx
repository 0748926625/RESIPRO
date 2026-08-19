import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  property_status_changed: "Statut de résidence modifié",
  profile_status_changed: "Statut de compte modifié",
  owner_verification_changed: "Vérification propriétaire modifiée",
  booking_created: "Réservation créée",
  shared_booking_matched: "Réservation partagée jumelée",
  payment_submitted: "Paiement déclaré",
  payment_confirmed: "Paiement confirmé",
};

const ENTITY_LABELS: Record<string, string> = {
  property: "Résidence",
  profile: "Compte",
  owner: "Propriétaire",
  booking: "Réservation",
  payment: "Paiement",
};

type AuditLogRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string } | null;
};

function formatValue(value: Record<string, unknown> | null): string {
  if (!value) return "—";
  return Object.entries(value)
    .map(([key, val]) => `${key}: ${val}`)
    .join(", ");
}

export default async function AdminAuditLogsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, old_value, new_value, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const logs = (data ?? []) as unknown as AuditLogRow[];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Journal d&apos;audit</h1>
        <p className="text-sm text-foreground/60">
          Historique des actions sensibles (§30) — 100 dernières entrées.
        </p>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune action enregistrée pour le moment.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-foreground/10 rounded-md border border-foreground/10 text-sm">
          {logs.map((log) => (
            <li key={log.id} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{ACTION_LABELS[log.action] ?? log.action}</span>
                <span className="text-xs text-foreground/50">
                  {new Date(log.created_at).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="text-xs text-foreground/60">
                Par {log.actor?.full_name ?? "—"} · {ENTITY_LABELS[log.entity_type] ?? log.entity_type}
                {log.entity_id ? ` (${log.entity_id.slice(0, 8)})` : ""}
              </p>
              {log.old_value || log.new_value ? (
                <p className="text-xs text-foreground/50">
                  {formatValue(log.old_value)} → {formatValue(log.new_value)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
