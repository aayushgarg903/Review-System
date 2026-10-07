import { getServiceRoleClient } from "@/lib/supabase-server";
import { isClientActive } from "@/lib/client-status";
import Link from "next/link";

// Required for Next.js to dynamically render this route
export const dynamic = 'force-dynamic';

export default async function FeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getServiceRoleClient();
  
  // Look up client by slug
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, business_name, logo_url, google_review_link, status, trial_ends_at, paid_until")
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

  // Analytics: Record landing_page_view securely
  const { error: analyticsErr } = await supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "landing_page_view"
  });
  if (analyticsErr) {
    console.error(`Analytics insert failed. Code: ${analyticsErr.code || "unknown"}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-[#F9F8F6] font-sans selection:bg-[#0A3622] selection:text-white">
      <div className="w-full max-w-[400px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-[#EAE8E3] rounded-[32px] p-8 sm:p-10 flex flex-col items-center gap-7 mt-12 sm:mt-[10vh] transition-all">
        
        {client.logo_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={client.logo_url} 
              alt={`${client.business_name} logo`} 
              className="w-24 h-24 object-contain rounded-[24px] bg-white border border-[#EAE8E3] shadow-sm p-1.5"
            />
          </>
        )}
        
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[26px] font-bold text-[#1C1917] text-center tracking-tight leading-tight">
            {client.business_name}
          </h1>
          <p className="text-[#57534E] text-center text-[16px] font-medium leading-relaxed px-2">
            Thanks for visiting. How would you like to share your experience?
          </p>
        </div>

        <div className="flex flex-col w-full gap-3.5 mt-2">
          {/* Identical styling for both buttons to prevent bias */}
          <a 
            href={`/r/${slug}/go`}
            className="w-full min-h-[56px] flex items-center justify-center bg-[#0A3622] hover:bg-[#062416] text-white text-[16px] font-medium rounded-2xl px-6 py-3 transition-all duration-200 text-center shadow-[0_4px_14px_rgba(10,54,34,0.1)] hover:shadow-[0_8px_20px_rgba(10,54,34,0.15)] hover:-translate-y-0.5"
          >
            Leave a Google review
          </a>
          
          <Link 
            href={`/r/${slug}/feedback`}
            prefetch={false}
            className="w-full min-h-[56px] flex items-center justify-center bg-[#0A3622] hover:bg-[#062416] text-white text-[16px] font-medium rounded-2xl px-6 py-3 transition-all duration-200 text-center shadow-[0_4px_14px_rgba(10,54,34,0.1)] hover:shadow-[0_8px_20px_rgba(10,54,34,0.15)] hover:-translate-y-0.5"
          >
            Send a private message
          </Link>
        </div>
      </div>
      
      <div className="mt-auto py-8">
        <Link href="/privacy" className="text-[13px] text-[#A8A29E] hover:text-[#57534E] transition-colors">
          Privacy Notice
        </Link>
      </div>
    </main>
  );
}
