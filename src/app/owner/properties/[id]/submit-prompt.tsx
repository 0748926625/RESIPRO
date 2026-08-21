"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// A non-blocking banner, not a confirm() dialog — a blocking dialog fired the instant the
// new property's detail page mounted, before the owner had any chance to scroll down and
// add photos/logo/signature first. Visibility is seeded once from ?created=1 via a lazy
// useState initializer (not passed down as a prop the parent re-renders): stripping that
// query param below is a client-side navigation, and if the parent's own render still
// gated on it, this component would unmount itself within moments of appearing, before a
// human could realistically act on it.
export function SubmitPrompt({
  propertyId,
  propertyName,
  submitAction,
}: {
  propertyId: string;
  propertyName: string;
  submitAction: (propertyId: string) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [visible] = useState(() => searchParams.get("created") === "1");
  const [dismissed, setDismissed] = useState(false);
  const strippedRef = useRef(false);

  useEffect(() => {
    if (!visible || strippedRef.current) return;
    strippedRef.current = true;
    // Strip ?created=1 so a refresh doesn't re-show the banner — safe now that visibility
    // no longer depends on this param after the initial mount.
    router.replace(`/owner/properties/${propertyId}`);
  }, [visible, propertyId, router]);

  if (!visible || dismissed) return null;

  function handleSubmit() {
    startTransition(async () => {
      await submitAction(propertyId);
      router.refresh();
      setDismissed(true);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
      <p className="text-foreground">
        &quot;{propertyName}&quot; a été créée. Ajoutez des photos, un logo ou une signature si besoin, puis
        soumettez-la pour validation quand vous êtes prêt.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
        >
          {isPending ? "Envoi…" : "Soumettre pour validation"}
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="text-xs text-foreground/60 underline">
          Plus tard
        </button>
      </div>
    </div>
  );
}
