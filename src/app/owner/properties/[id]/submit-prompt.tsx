"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  const [, startTransition] = useTransition();
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    // Strip ?created=1 immediately so a refresh (or the confirm() dialog reappearing in
    // dev's double-effect) never re-asks.
    router.replace(`/owner/properties/${propertyId}`);

    if (confirm(`"${propertyName}" a été créée. La soumettre pour validation maintenant ?`)) {
      startTransition(async () => {
        await submitAction(propertyId);
        router.refresh();
      });
    }
  }, [propertyId, propertyName, submitAction, router]);

  return null;
}
