export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center gap-2 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      {description ? <p className="text-sm text-foreground/60">{description}</p> : null}
      <p className="text-xs text-foreground/40">
        Cette page sera implémentée dans une phase ultérieure du plan.
      </p>
    </div>
  );
}
