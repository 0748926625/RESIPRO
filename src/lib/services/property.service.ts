const DIACRITICS = /\p{Diacritic}/gu;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 80);
}

const PROPERTY_IMAGES_BUCKET_SEGMENT = "/property-images/";

// property_images only stores the public URL; storage.objects.remove() needs the bare
// object path (propertyId/filename), which we recover from the URL we generated at
// upload time rather than adding a redundant column.
export function storagePathFromPublicUrl(url: string): string {
  const index = url.indexOf(PROPERTY_IMAGES_BUCKET_SEGMENT);
  return index === -1 ? url : url.slice(index + PROPERTY_IMAGES_BUCKET_SEGMENT.length);
}
