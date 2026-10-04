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
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 text-center text-sm">
          This page is temporarily unavailable
        </p>
      </main>
    );
  }

  // Analytics: Record qr_scan securely
  await supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "qr_scan"
  });

  return (
    <main className="min-h-screen flex flex-col items-center p-6 bg-gray-50">
      <div className="w-full max-w-[360px] bg-white shadow-sm rounded-xl p-6 flex flex-col items-center gap-6 mt-10">
        
        {client.logo_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={client.logo_url} 
              alt={`${client.business_name} logo`} 
              className="w-20 h-20 object-contain rounded-full bg-gray-100"
            />
          </>
        )}
        
        <h1 className="text-2xl font-semibold text-gray-900 text-center">
          {client.business_name}
        </h1>
        
        <p className="text-gray-600 text-center text-sm font-medium">
          Thanks for visiting. How would you like to share your experience?
        </p>

        <div className="flex flex-col w-full gap-4 mt-2">
          {/* Identical styling for both buttons to prevent bias */}
          <a 
            href={`/r/${slug}/go`}
            className="w-full min-h-[48px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition-colors text-center shadow-sm"
          >
            Leave a Google review
          </a>
          
          <Link 
            href={`/r/${slug}/feedback`}
            prefetch={false}
            className="w-full min-h-[48px] flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-4 py-3 transition-colors text-center shadow-sm"
          >
            Send a private message
          </Link>
        </div>
      </div>
      
      <div className="mt-auto py-8">
        <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 underline">
          Privacy Notice
        </Link>
      </div>
    </main>
  );
}
