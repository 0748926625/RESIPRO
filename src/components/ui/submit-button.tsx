"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity active:opacity-80 disabled:opacity-60"
    >
      {pending ? "Veuillez patienter…" : children}
    </button>
  );
}
