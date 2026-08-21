"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function BrandingUploader({
  propertyId,
  field,
  currentUrl,
  label,
  shape = "square",
  action,
}: {
  propertyId: string;
  field: "logo_url" | "signature_url";
  currentUrl: string | null;
  label: string;
  shape?: "square" | "wide";
  action: (propertyId: string, field: "logo_url" | "signature_url", url: string | null) => Promise<void>;
}) {
  const [url, setUrl] = useState(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCapture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const supabase = createClient();
    const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    const path = `${propertyId}/branding/${field}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("property-images").upload(path, file);
    if (uploadError) {
      setError("Échec de l'envoi de la photo.");
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("property-images").getPublicUrl(path);

    await action(propertyId, field, publicUrlData.publicUrl);
    setUrl(publicUrlData.publicUrl);
    setIsUploading(false);
  }

  async function handleRemove() {
    await action(propertyId, field, null);
    setUrl(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className={`rounded-md border border-foreground/10 object-contain ${
            shape === "square" ? "h-24 w-24" : "h-20 w-48"
          }`}
        />
      ) : (
        <p className="text-xs text-foreground/50">Aucune photo pour le moment.</p>
      )}
      <div className="flex items-center gap-3">
        <label className="flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-dashed border-foreground/30 px-3 py-2 text-sm text-foreground/70">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCapture}
            disabled={isUploading}
          />
          {isUploading ? "Envoi…" : "Prendre une photo"}
        </label>
        {url ? (
          <button type="button" onClick={handleRemove} className="text-xs text-danger underline">
            Supprimer
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
