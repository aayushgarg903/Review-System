import { getServiceRoleClient } from "@/lib/supabase-server";
import { isClientActive } from "@/lib/client-status";
import FeedbackForm from "@/components/FeedbackForm";

// Required for dynamic routing
export const dynamic = 'force-dynamic';

export default async function PrivateFeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getServiceRoleClient();
  
  // Look up client by slug
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, business_name, status, logo_url, trial_ends_at, paid_until")
    .eq("slug", slug)
    .single();

  if (error || !isClientActive(client)) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#F9F8F6] p-4 font-sans">
        <p className="text-[#57534E] text-center text-sm">
          This page is temporarily unavailable
        </p>
      </main>
    );
  }

  // Record analytics event: someone opened the private form
  const { error: analyticsErr } = await supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "private_form_open"
  });
  if (analyticsErr) {
    console.error(`Analytics insert failed. Code: ${analyticsErr.code || "unknown"}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-[#F9F8F6] font-sans selection:bg-[#0A3622] selection:text-white">
      <div className="w-full max-w-[400px] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-[#EAE8E3] rounded-3xl p-8 flex flex-col items-center gap-6 mt-6 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        
        {client.logo_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={client.logo_url} 
              alt={`${client.business_name} logo`} 
              className="w-16 h-16 object-contain rounded-full bg-white border border-[#EAE8E3] shadow-sm p-1"
            />
          </>
        )}
        
        <div className="text-center w-full flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-[#1C1917] leading-tight tracking-tight">
            Private Message
          </h1>
          <p className="text-[#57534E] text-[13px] font-medium">
            To the management of {client.business_name}
          </p>
        </div>

        <FeedbackForm slug={slug} siteKey={process.env.TURNSTILE_SITE_KEY || ""} />

      </div>
    </main>
  );
}
