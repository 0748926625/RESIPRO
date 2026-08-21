"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
    >
      Imprimer / PDF
    </button>
  );
}
