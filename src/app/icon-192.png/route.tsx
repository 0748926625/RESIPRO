import { renderIcon } from "@/lib/pwa/icon";

// A plain route handler (not the icon.tsx convention) so the URL is a stable,
// predictable path the web manifest's icons array can reference directly.
// force-static: this image never varies, so build it once instead of per-request.
export const dynamic = "force-static";

export async function GET() {
  return renderIcon(192);
}
