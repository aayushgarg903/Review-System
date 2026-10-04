import { getServiceRoleClient } from "@/lib/supabase-server";
import FeedbackForm from "@/components/FeedbackForm";

// Required for dynamic routing
export const dynamic = 'force-dynamic';

export default async function PrivateFeedbackPage({ params }: { params: { slug: string } }) {
  const supabase = getServiceRoleClient();
  
  // Look up client by slug
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, business_name, status, logo_url")
    .eq("slug", params.slug)
    .single();

  if (error || !client || client.status === "lapsed" || client.status === "paused") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 text-center text-sm">
          This page is temporarily unavailable
        </p>
      </main>
    );
  }

  // Fire and forget analytics event: someone opened the private form
  supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "private_form_open"
  }).then();

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-gray-50">
      <div className="w-full max-w-[360px] bg-white shadow-sm rounded-xl p-6 flex flex-col items-center gap-6 mt-6">
        
        {client.logo_url && (
          <img 
            src={client.logo_url} 
            alt={`${client.business_name} logo`} 
            className="w-16 h-16 object-contain rounded-full bg-gray-100"
          />
        )}
        
        <div className="text-center w-full">
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">
            Private Message
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            To the management of {client.business_name}
          </p>
        </div>

        <FeedbackForm slug={params.slug} siteKey={process.env.TURNSTILE_SITE_KEY || ""} />

      </div>
    </main>
  );
}
