import { getServiceRoleClient } from "@/lib/supabase-server";
import { isClientActive } from "@/lib/client-status";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const supabase = getServiceRoleClient();
  const { slug } = await params;

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return new Response("Invalid slug", { status: 400 });
  }

  // Lookup client by slug securely
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, google_review_link, status, trial_ends_at, paid_until")
    .eq("slug", slug)
    .single();

  if (error || !isClientActive(client)) {
    return new Response("Not found or unavailable", { status: 404 });
  }

  // Await the analytics insert
  await supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "google_click"
  });

  // Redirect securely and strictly disable caching
  const response = NextResponse.redirect(client.google_review_link, 307);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}
