import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (network-boundary/routing focus); the
// exported function is now `proxy` instead of `middleware`. This runs on every request
// (see `config.matcher` below) to refresh the Supabase session cookie and to keep
// unauthenticated visitors out of the role-scoped areas. It is a coarse gate only — each
// area's layout still calls requireRole() server-side, since role checks need a DB read
// that is cheaper to do once per layout render than on every request here.
const PROTECTED_PREFIXES = ["/client", "/owner", "/admin"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without Supabase credentials configured (see .env.example), skip session refresh
  // instead of crashing every route with a 500 — this only matters for local setup
  // before Phase 2 wiring; role-protected areas still fail closed once auth exists,
  // since getViewer() treats "no user" as a visitor.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
