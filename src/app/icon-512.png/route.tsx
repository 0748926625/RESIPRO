import { renderIcon } from "@/lib/pwa/icon";

export const dynamic = "force-static";

export async function GET() {
  return renderIcon(512);
}
