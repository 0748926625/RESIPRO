import Link from "next/link";
import { notFound } from "next/navigation";

import { PhotoManager } from "@/components/property/photo-manager";
import { PropertyForm } from "@/components/property/property-form";
import { PROPERTY_STATUSES } from "@/lib/constants/statuses";
import { storagePathFromPublicUrl } from "@/lib/services/property.service";
import { createClient } from "@/lib/supabase/server";

import { deletePropertyImage, submitForReview, updateProperty } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  [PROPERTY_STATUSES.DRAFT]: "Brouillon",
  [PROPERTY_STATUSES.PENDING_REVIEW]: "En attente de validation",
  [PROPERTY_STATUSES.APPROVED]: "Approuvée",
  [PROPERTY_STATUSES.REJECTED]: "Refusée",
  [PROPERTY_STATUSES.SUSPENDED]: "Suspendue",
  [PROPERTY_STATUSES.ARCHIVED]: "Archivée",
};

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{property.name}</h1>
          <p className="text-sm text-foreground/60">
            Statut : {STATUS_LABELS[property.status] ?? property.status}
          </p>
          <div className="flex gap-3">
            <Link href={`/owner/properties/${id}/availability`} className="text-xs text-foreground underline">
              Calendrier &amp; disponibilités
            </Link>
            <Link href={`/owner/properties/${id}/finance`} className="text-xs text-foreground underline">
              Finances
            </Link>
          </div>
        </div>
        {canSubmit ? (
          <form action={boundSubmit}>
            <button
              type="submit"
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
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
            managerPhoneVisibility: property.manager_phone_visibility,
            amenityIds: (propertyAmenities ?? []).map((row) => row.amenity_id),
          }}
        />
      </section>
    </div>
  );
}
