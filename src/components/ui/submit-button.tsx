"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Veuillez patienter…" : children}
    </button>
  );
}
