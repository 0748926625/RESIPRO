export const metadata = { title: "Hors ligne" };

// Precached by the service worker and served only when a navigation fails with no
// network — this app does not claim offline functionality for anything data-driven
// (§26, §40): searching, booking, and paying always require a real connection.
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">Vous êtes hors ligne</h1>
      <p className="text-sm text-foreground/60">
        Residence Pro a besoin d&apos;une connexion pour rechercher, réserver et payer en toute
        sécurité. Reconnectez-vous puis réessayez.
      </p>
    </div>
  );
}
