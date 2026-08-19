"use client";

import { useActionState } from "react";

import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from "@/lib/validations/property.schema";

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type Amenity = { id: string; label: string };

export function PropertyForm({
  action,
  amenities,
  defaultValues,
  submitLabel,
}: {
  action: (state: PropertyFormState, formData: FormData) => Promise<PropertyFormState>;
  amenities: Amenity[];
  defaultValues?: {
    name?: string;
    description?: string;
    propertyType?: string;
    city?: string;
    neighborhood?: string;
    address?: string;
    capacity?: number;
    bedrooms?: number;
    basePrice?: number;
    currency?: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    cleaningBufferMinutes?: number;
    houseRules?: string;
    managerPhoneVisibility?: string;
    amenityIds?: string[];
  };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const selectedAmenities = new Set(defaultValues?.amenityIds ?? []);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormField
        label="Nom"
        name="name"
        required
        defaultValue={defaultValues?.name}
        errors={state.fieldErrors?.name}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultValues?.description}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        {state.fieldErrors?.description?.map((error) => (
          <p key={error} className="text-xs text-red-600">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="propertyType" className="text-sm font-medium text-foreground">
          Type de résidence
        </label>
        <select
          id="propertyType"
          name="propertyType"
          defaultValue={defaultValues?.propertyType ?? "apartment"}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm"
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROPERTY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        {state.fieldErrors?.propertyType?.map((error) => (
          <p key={error} className="text-xs text-red-600">
            {error}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="Ville"
          name="city"
          required
          defaultValue={defaultValues?.city}
          errors={state.fieldErrors?.city}
        />
        <FormField
          label="Quartier"
          name="neighborhood"
          defaultValue={defaultValues?.neighborhood}
          errors={state.fieldErrors?.neighborhood}
        />
      </div>
      <FormField
        label="Adresse"
        name="address"
        defaultValue={defaultValues?.address}
        errors={state.fieldErrors?.address}
      />

      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Capacité"
          name="capacity"
          type="number"
          defaultValue={String(defaultValues?.capacity ?? 1)}
          errors={state.fieldErrors?.capacity}
        />
        <FormField
          label="Chambres"
          name="bedrooms"
          type="number"
          defaultValue={String(defaultValues?.bedrooms ?? 1)}
          errors={state.fieldErrors?.bedrooms}
        />
        <FormField
          label={`Tarif (${defaultValues?.currency ?? "XOF"})`}
          name="basePrice"
          type="number"
          defaultValue={String(defaultValues?.basePrice ?? 0)}
          errors={state.fieldErrors?.basePrice}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <FormField
          label="Heure d'arrivée"
          name="checkInTime"
          type="time"
          defaultValue={defaultValues?.checkInTime ?? ""}
          errors={state.fieldErrors?.checkInTime}
        />
        <FormField
          label="Heure de départ"
          name="checkOutTime"
          type="time"
          defaultValue={defaultValues?.checkOutTime ?? ""}
          errors={state.fieldErrors?.checkOutTime}
        />
        <FormField
          label="Nettoyage (min)"
          name="cleaningBufferMinutes"
          type="number"
          defaultValue={String(defaultValues?.cleaningBufferMinutes ?? 0)}
          errors={state.fieldErrors?.cleaningBufferMinutes}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="houseRules" className="text-sm font-medium text-foreground">
          Règles / informations importantes
        </label>
        <textarea
          id="houseRules"
          name="houseRules"
          rows={3}
          defaultValue={defaultValues?.houseRules}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="managerPhoneVisibility" className="text-sm font-medium text-foreground">
          Visibilité de votre numéro
        </label>
        <select
          id="managerPhoneVisibility"
          name="managerPhoneVisibility"
          defaultValue={defaultValues?.managerPhoneVisibility ?? "admin_only"}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm"
        >
          <option value="hidden">Jamais communiqué</option>
          <option value="admin_only">Visible par le Super Admin uniquement</option>
          <option value="revealed">Communiqué au client</option>
        </select>
        <p className="text-xs text-foreground/50">
          Le Super Admin décide quand vos coordonnées sont communiquées (§6).
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Équipements</legend>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {amenities.map((amenity) => (
            <label key={amenity.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="amenityIds"
                value={amenity.id}
                defaultChecked={selectedAmenities.has(amenity.id)}
              />
              {amenity.label}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
