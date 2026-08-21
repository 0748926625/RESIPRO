"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

// Supabase's magic-link verification always redirects here with the session in the URL
// *fragment* (#access_token=...&refresh_token=...) — confirmed empirically, even when the
// original request carried a PKCE code_challenge — never as a ?code= query param. Our
// shared browser client (@supabase/ssr's createBrowserClient) hardcodes flowType: "pkce"
// with no override, so its automatic URL detection rejects this fragment internally
// (AuthPKCEGrantCodeExchangeError, swallowed) and never calls setSession. We therefore
// parse the fragment ourselves and hand the tokens to setSession() directly, which is
// flow-agnostic and still persists into the same cookie storage @supabase/ssr wires up.
function readHashParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.hash.slice(1));
}

function readErrorFromHash(): string | null {
  const description = readHashParams()?.get("error_description");
  return description ? description.replace(/\+/g, " ") : null;
}

export default function MagicLinkCompletePage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(readErrorFromHash);

  useEffect(() => {
    const next = searchParams.get("next") || "/login";
    const hashParams = readHashParams();
    const accessToken = hashParams?.get("access_token");
    const refreshToken = hashParams?.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: setSessionError }) => {
      if (setSessionError) {
        setError(setSessionError.message);
        return;
      }
      window.location.href = next;
    });
  }, [searchParams]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-sm flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-sm">
      {error ? (
        <>
          <p className="font-medium text-foreground">Ce lien n&apos;est plus valide.</p>
          <p className="text-foreground/60">{error}</p>
          <a href="/login" className="underline">
            Retour à la connexion
          </a>
        </>
      ) : (
        <p className="text-foreground/60">Connexion en cours…</p>
      )}
    </div>
  );
}
