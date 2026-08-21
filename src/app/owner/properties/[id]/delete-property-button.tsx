"use client";

import { useActionState } from "react";

import { archiveProperty, type ArchivePropertyState } from "./actions";

const initialState: ArchivePropertyState = {};

export function DeletePropertyButton({ propertyId, propertyName }: { propertyId: string; propertyName: string }) {
  const [state, formAction] = useActionState(archiveProperty.bind(null, propertyId), initialState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (
          !confirm(
            `Supprimer "${propertyName}" ? Cette résidence disparaîtra des recherches et ne sera plus réservable. Impossible si des réservations à venir existent encore.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-red-600/40 px-4 py-2 text-sm font-medium text-red-600"
      >
        Supprimer cette résidence
      </button>
      {state.error ? <p className="mt-2 text-sm text-red-600">{state.error}</p> : null}
    </form>
  );
}
