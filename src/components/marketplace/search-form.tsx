const PROPERTY_TYPE_OPTIONS = [
  { value: "", label: "Tous types" },
  { value: "apartment", label: "Appartement" },
  { value: "studio", label: "Studio" },
  { value: "house", label: "Maison" },
  { value: "villa", label: "Villa" },
  { value: "room", label: "Chambre" },
];

export function SearchForm({
  amenities,
  defaultValues,
}: {
  amenities: { id: string; label: string }[];
  defaultValues: {
    city?: string;
    propertyType?: string;
    minCapacity?: string;
    maxPrice?: string;
    amenities?: string[];
  };
}) {
  const selected = new Set(defaultValues.amenities ?? []);

  return (
    <form action="/residences" method="GET" className="flex flex-col gap-4 rounded-lg border border-foreground/10 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label htmlFor="city" className="text-xs font-medium text-foreground/70">
            Ville / quartier
          </label>
          <input
            id="city"
            name="city"
            type="text"
            defaultValue={defaultValues.city}
            placeholder="Ex. Cocody"
            className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="propertyType" className="text-xs font-medium text-foreground/70">
            Type
          </label>
          <select
            id="propertyType"
            name="propertyType"
            defaultValue={defaultValues.propertyType ?? ""}
            className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm"
          >
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="minCapacity" className="text-xs font-medium text-foreground/70">
            Nombre de personnes
          </label>
          <input
            id="minCapacity"
            name="minCapacity"
            type="number"
            min={1}
            defaultValue={defaultValues.minCapacity}
            className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:w-48">
        <label htmlFor="maxPrice" className="text-xs font-medium text-foreground/70">
          Budget maximum
        </label>
        <input
          id="maxPrice"
          name="maxPrice"
          type="number"
          min={0}
          defaultValue={defaultValues.maxPrice}
          className="rounded-md border border-foreground/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
      </div>

      {amenities.length > 0 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-foreground/70">Équipements</legend>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {amenities.map((amenity) => (
              <label key={amenity.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="amenities"
                  value={amenity.id}
                  defaultChecked={selected.has(amenity.id)}
                />
                {amenity.label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <button
        type="submit"
        className="w-fit rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
      >
        Rechercher
      </button>
    </form>
  );
}
