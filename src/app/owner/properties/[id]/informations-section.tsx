"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { PropertyForm, type PropertyFormState } from "@/components/property/property-form";

type Amenity = { id: string; label: string };

export function InformationsSection({
  propertyId,
  action,
  submitAction,
  canSubmit,
  amenities,
  defaultValues,
}: {
  propertyId: string;
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  submitAction: (propertyId: string) => Promise<void>;
  canSubmit: boolean;
  amenities: Amenity[];
  defaultValues: Parameters<typeof PropertyForm>[0]["defaultValues"];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSaved(name: string) {
    if (!canSubmit) return;
    if (confirm(`"${name}" enregistrée. La soumettre pour validation maintenant ?`)) {
      startTransition(async () => {
        await submitAction(propertyId);
        router.refresh();
      });
    }
  }

  return (
    <PropertyForm
      action={action}
      amenities={amenities}
      defaultValues={defaultValues}
      submitLabel="Enregistrer les modifications"
      onSaved={handleSaved}
    />
  );
}
