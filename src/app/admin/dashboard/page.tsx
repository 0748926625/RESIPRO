import Link from "next/link";

import { computePlatformCommission } from "@/lib/services/dashboard.service";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { count: ownersCount },
    { count: clientsCount },
    { count: propertiesApprovedCount },
    { count: propertiesSuspendedCount },
    { count: propertiesPendingCount },
    { count: bookingsTodayCount },
    { count: upcomingBookingsCount },
    { count: sharedBookingsCount },
    { count: paymentsSubmittedCount },
    { count: intermediationNewCount },
    { count: awaitingOwnerCount },
    { data: settingsRows },
    { data: paidBookings },
  ] = await Promise.all([
    supabase.from("owners").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString()),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .gt("starts_at", now.toISOString())
      .not("status", "in", "(cancelled,rejected,completed,expired)"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("type", "shared"),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "payment_submitted"),
    supabase.from("intermediation_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "awaiting_owner_confirmation"),
    supabase.from("platform_settings").select("key, value").in("key", ["commission_type", "commission_value"]),
    supabase
      .from("bookings")
      .select("total_price")
      .in("status", ["payment_received", "awaiting_owner_confirmation", "confirmed", "checked_in", "checked_out", "completed"]),
  ]);

  const settings = Object.fromEntries((settingsRows ?? []).map((row) => [row.key, row.value]));
  const commissionType = (settings.commission_type as "fixed" | "percentage") ?? "percentage";
  const commissionValue = Number(settings.commission_value ?? 0);
  const platformCommission = computePlatformCommission(
    (paidBookings ?? []).map((b) => ({ totalPrice: b.total_price })),
    commissionType,
    commissionValue,
  );
  const platformRevenue = (paidBookings ?? []).reduce((sum, b) => sum + b.total_price, 0);

  const stats = [
    { label: "Propriétaires", value: ownersCount ?? 0 },
    { label: "Clients", value: clientsCount ?? 0 },
    { label: "Résidences actives", value: propertiesApprovedCount ?? 0 },
    { label: "Résidences suspendues", value: propertiesSuspendedCount ?? 0 },
    { label: "Réservations du jour", value: bookingsTodayCount ?? 0 },
    { label: "Réservations à venir", value: upcomingBookingsCount ?? 0 },
    { label: "Réservations partagées", value: sharedBookingsCount ?? 0 },
    { label: "Chiffre d'affaires plateforme", value: `${platformRevenue.toLocaleString("fr-FR")} XOF` },
    { label: "Commissions", value: `${platformCommission.toLocaleString("fr-FR")} XOF` },
  ];

  const alerts = [
    {
      count: paymentsSubmittedCount ?? 0,
      label: "paiement(s) à vérifier",
      href: "/admin/payments?status=payment_submitted",
    },
    {
      count: awaitingOwnerCount ?? 0,
      label: "réservation(s) en attente de confirmation du propriétaire",
      href: "/admin/bookings",
    },
    {
      count: intermediationNewCount ?? 0,
      label: "nouvelle(s) demande(s) d'intermédiation",
      href: "/admin/intermediation?status=new",
    },
    {
      count: propertiesPendingCount ?? 0,
      label: "résidence(s) en attente de validation",
      href: "/admin/properties?status=pending_review",
    },
  ].filter((alert) => alert.count > 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Tableau de bord Super Admin</h1>

      {alerts.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground">Alertes</h2>
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => (
              <li key={alert.label}>
                <Link
                  href={alert.href}
                  className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300"
                >
                  <span>{alert.count} {alert.label}</span>
                  <span className="underline">Voir</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-foreground/10 p-3">
            <p className="text-xs text-foreground/60">{stat.label}</p>
            <p className="text-lg font-semibold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
