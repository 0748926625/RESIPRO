import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandingUploader } from "@/components/property/branding-uploader";
import { PhotoManager } from "@/components/property/photo-manager";
import { PropertyForm } from "@/components/property/property-form";
import { PROPERTY_STATUSES } from "@/lib/constants/statuses";
import { storagePathFromPublicUrl } from "@/lib/services/property.service";
import { createClient } from "@/lib/supabase/server";

import { deletePropertyImage, setPropertyBranding, submitForReview, updateProperty } from "./actions";
import { DeletePropertyButton } from "./delete-property-button";
import { SubmitPrompt } from "./submit-prompt";

const STATUS_LABELS: Record<string, string> = {
  [PROPERTY_STATUSES.DRAFT]: "Brouillon",
  [PROPERTY_STATUSES.PENDING_REVIEW]: "En attente de validation",
  [PROPERTY_STATUSES.APPROVED]: "Approuvée",
  [PROPERTY_STATUSES.REJECTED]: "Refusée",
  [PROPERTY_STATUSES.SUSPENDED]: "Suspendue",
  [PROPERTY_STATUSES.ARCHIVED]: "Archivée",
};

const PHONE_VISIBILITY_LABELS: Record<string, string> = {
  hidden: "Jamais communiqué",
  admin_only: "Visible par le Super Admin uniquement",
  revealed: "Communiqué par le Super Admin à un client",
};

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const supabase = await createClient();

  const [{ data: property }, { data: amenities }, { data: images }, { data: propertyAmenities }] =
    await Promise.all([
      supabase.from("properties").select("*").eq("id", id).single(),
      supabase.from("amenities").select("id, label").order("label"),
      supabase
        .from("property_images")
        .select("id, url, is_cover")
        .eq("property_id", id)
        .order("position"),
      supabase.from("property_amenities").select("amenity_id").eq("property_id", id),
    ]);

  if (!property) {
    notFound();
  }

  const canSubmit = property.status === "draft" || property.status === "rejected";
  const boundUpdate = updateProperty.bind(null, id);
  const boundSubmit = submitForReview.bind(null, id);

  const imagesWithActions = (images ?? []).map((image) => ({
    ...image,
    deleteAction: deletePropertyImage.bind(null, id, image.id, storagePathFromPublicUrl(image.url)),
  }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8">
      {created === "1" && canSubmit ? (
        <SubmitPrompt propertyId={id} propertyName={property.name} submitAction={submitForReview} />
      ) : null}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{property.name}</h1>
          <p className="text-sm text-foreground/60">
            Statut : {STATUS_LABELS[property.status] ?? property.status}
          </p>
          <p className="text-xs text-foreground/50">
            Votre numéro : {PHONE_VISIBILITY_LABELS[property.manager_phone_visibility] ?? property.manager_phone_visibility}{" "}
            — décidé par le Super Admin (§6).
          </p>
          <div className="flex gap-3">
            <Link href={`/owner/properties/${id}/availability`} className="text-xs text-foreground underline">
              Calendrier &amp; disponibilités
            </Link>
            <Link href={`/owner/properties/${id}/finance`} className="text-xs text-foreground underline">
              Finances
            </Link>
            <Link href={`/owner/properties/${id}/invoices`} className="text-xs text-foreground underline">
              Factures
            </Link>
          </div>
        </div>
        {canSubmit ? (
          <form action={boundSubmit}>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Soumettre pour validation
            </button>
          </form>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Photos</h2>
        <PhotoManager propertyId={id} images={imagesWithActions} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-foreground">Logo &amp; signature</h2>
        <p className="text-xs text-foreground/60">
          Utilisés sur les factures de cette résidence (§ réservations hors plateforme).
        </p>
        <div className="flex flex-wrap gap-6">
          <BrandingUploader
            propertyId={id}
            field="logo_url"
            currentUrl={property.logo_url}
            label="Logo"
            shape="square"
            action={setPropertyBranding}
          />
          <BrandingUploader
            propertyId={id}
            field="signature_url"
            currentUrl={property.signature_url}
            label="Signature"
            shape="wide"
            action={setPropertyBranding}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Informations</h2>
        <PropertyForm
          action={boundUpdate}
          amenities={amenities ?? []}
          submitLabel="Enregistrer les modifications"
          defaultValues={{
            name: property.name,
            description: property.description ?? undefined,
            propertyType: property.property_type,
            city: property.city,
            neighborhood: property.neighborhood ?? undefined,
            address: property.address ?? undefined,
            capacity: property.capacity,
            bedrooms: property.bedrooms,
            basePrice: property.base_price,
            currency: property.currency,
            checkInTime: property.check_in_time,
            checkOutTime: property.check_out_time,
            cleaningBufferMinutes: property.cleaning_buffer_minutes,
            houseRules: property.house_rules ?? undefined,
            allowsHalfDay: property.allows_half_day,
            amenityIds: (propertyAmenities ?? []).map((row) => row.amenity_id),
          }}
        />
      </section>

      {property.status !== "archived" ? (
        <section className="flex flex-col gap-3 rounded-lg border border-red-600/20 p-4">
          <h2 className="text-sm font-medium text-foreground">Zone de danger</h2>
          <p className="text-xs text-foreground/60">
            Supprimer une résidence la retire des recherches et des disponibilités futures.
            L&apos;historique des réservations et des paiements reste conservé.
          </p>
          <DeletePropertyButton propertyId={id} propertyName={property.name} />
        </section>
      ) : null}
    </div>
  );
}
