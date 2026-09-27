import { adsTxt } from "@/lib/ads";
export const dynamic = "force-dynamic";
export function GET() {
  const body = adsTxt(process.env.ADSENSE_PUBLISHER_ID?.trim());
  return new Response(body || "Advertising is not configured.\n", {
    status: body ? 200 : 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": body ? "public, max-age=3600" : "no-store",
    },
  });
}
