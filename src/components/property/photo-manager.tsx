"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type PropertyImage = {
  id: string;
  url: string;
  is_cover: boolean;
  deleteAction: () => Promise<void>;
};

export function PhotoManager({
  propertyId,
  images,
}: {
  propertyId: string;
  images: PropertyImage[];
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${propertyId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage.from("property-images").upload(path, file);
    if (uploadError) {
      setError("Échec de l'envoi de la photo.");
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("property-images").getPublicUrl(path);

    const { error: insertError } = await supabase.from("property_images").insert({
      property_id: propertyId,
      url: publicUrlData.publicUrl,
      is_cover: images.length === 0,
    });

    setIsUploading(false);

    if (insertError) {
      setError("Photo envoyée mais impossible de l'enregistrer.");
      return;
    }

    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative aspect-video overflow-hidden rounded-md border border-foreground/10"
            >
              {/* Property photos are user-uploaded and arbitrary in size/host — next/image's
                  static optimization doesn't fit here without a remotePatterns allowlist per
                  Supabase project (§44 revisits this once deployment domains are fixed). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" />
              <form action={image.deleteAction} className="absolute right-1 top-1">
                <button
                  type="submit"
                  className="rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  Supprimer
                </button>
              </form>
              {image.is_cover ? (
                <span className="absolute left-1 top-1 rounded bg-foreground px-2 py-0.5 text-[10px] text-background">
                  Couverture
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-foreground/60">Aucune photo pour le moment.</p>
      )}
      <label className="flex w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-foreground/30 px-3 py-2 text-sm text-foreground/70">
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={isUploading} />
        {isUploading ? "Envoi…" : "Ajouter une photo"}
      </label>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
