import { PagePlaceholder } from "@/components/ui/page-placeholder";

export default async function ResidenceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <PagePlaceholder
      title={`Résidence : ${slug}`}
      description="Fiche résidence complète — photos, équipements, disponibilité (Phase 5)."
    />
  );
}
