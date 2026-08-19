import { PropertyCard } from "@/components/marketplace/property-card";
import { SearchForm } from "@/components/marketplace/search-form";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  city?: string;
  propertyType?: string;
  minCapacity?: string;
  maxPrice?: string;
  amenities?: string | string[];
};

export default async function ResidencesSearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const amenityIds = params.amenities
    ? Array.isArray(params.amenities)
      ? params.amenities
      : [params.amenities]
    : [];

  const supabase = await createClient();
  const { data: allAmenities } = await supabase.from("amenities").select("id, label").order("label");

  let query = supabase
    .from("properties")
    .select("id, slug, name, city, neighborhood, capacity, base_price, currency, property_images(url, is_cover)")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (params.city) {
    query = query.ilike("city", `%${params.city}%`);
  }
  if (params.propertyType) {
    query = query.eq("property_type", params.propertyType);
  }
  if (params.minCapacity) {
    query = query.gte("capacity", Number(params.minCapacity));
  }
  if (params.maxPrice) {
    query = query.lte("base_price", Number(params.maxPrice));
  }

  if (amenityIds.length > 0) {
    const { data: matches } = await supabase
      .from("property_amenities")
      .select("property_id")
      .in("amenity_id", amenityIds);
    const matchingIds = [...new Set((matches ?? []).map((row) => row.property_id))];
    // A property matching *any* selected amenity is included — narrowing to *all*
    // selected amenities would need one subquery per amenity intersected together;
    // deferred until real usage shows this matters.
    query = query.in("id", matchingIds.length > 0 ? matchingIds : ["00000000-0000-0000-0000-000000000000"]);
  }

  const { data } = await query;
  const properties = (data ?? []) as unknown as Array<{
    id: string;
    slug: string;
    name: string;
    city: string;
    neighborhood: string | null;
    capacity: number;
    base_price: number;
    currency: string;
    property_images: { url: string; is_cover: boolean }[];
  }>;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-foreground">Résidences disponibles</h1>
      <SearchForm
        amenities={allAmenities ?? []}
        defaultValues={{
          city: params.city,
          propertyType: params.propertyType,
          minCapacity: params.minCapacity,
          maxPrice: params.maxPrice,
          amenities: amenityIds,
        }}
      />

      {properties.length === 0 ? (
        <p className="text-sm text-foreground/60">Aucune résidence ne correspond à cette recherche.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {properties.map((property) => {
            const cover = property.property_images.find((image) => image.is_cover) ?? property.property_images[0];
            return (
              <PropertyCard
                key={property.id}
                slug={property.slug}
                name={property.name}
                city={property.city}
                neighborhood={property.neighborhood}
                capacity={property.capacity}
                basePrice={property.base_price}
                currency={property.currency}
                coverUrl={cover?.url ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
