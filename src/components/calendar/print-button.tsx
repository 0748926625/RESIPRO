"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background"
    >
      Imprimer / PDF
    </button>
  );
}
