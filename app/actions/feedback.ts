"use server";

import { getServiceRoleClient } from "@/lib/supabase-server";
import { isClientActive } from "@/lib/client-status";
import { Resend } from "resend";

export async function submitFeedback(formData: FormData) {
  const token = formData.get("cf-turnstile-response") as string;
  const slug = formData.get("slug") as string;
  
  let customerName = (formData.get("customerName") as string || "").trim();
  const customerPhone = (formData.get("customerPhone") as string || "").trim();
  const feedbackText = (formData.get("feedbackText") as string || "").trim();
  const consentGiven = formData.get("consent") === "on";

  if (!token || !slug || !feedbackText || !consentGiven) {
    return { error: "Missing required fields." };
  }

  // Server-side validation
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Invalid client slug." };
  }

  if (feedbackText.length < 1 || feedbackText.length > 2000) {
    return { error: "Feedback must be between 1 and 2000 characters." };
  }

  if (customerName.length > 255) {
    customerName = customerName.substring(0, 255);
  }

  if (customerPhone) {
    if (!/^[\d\s+\-()]*$/.test(customerPhone) || customerPhone.length > 20) {
      return { error: "Invalid phone number format." };
    }
  }

  // 1. Verify Turnstile directly from the server
  const params = new URLSearchParams();
  params.append("secret", process.env.TURNSTILE_SECRET_KEY || "");
  params.append("response", token);

  let verifyData;
  try {
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      }
    );
    
    if (!verifyRes.ok) {
      return { error: "Security check failed. Please refresh the page and try again." };
    }
    verifyData = await verifyRes.json();
  } catch {
    // Only log that there was a connection error, not PII
    console.error("Turnstile fetch error: Network connection failed.");
    return { error: "Security check failed to connect. Please try again." };
  }

  if (!verifyData?.success) {
    return { error: "Security check failed. Please try again." };
  }

  const supabase = getServiceRoleClient();

  // 2. Fetch the client id and email using service role
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, owner_email, business_name, status, trial_ends_at, paid_until")
    .eq("slug", slug)
    .single();

  if (clientErr || !isClientActive(client)) {
    return { error: "Client not found or unavailable." };
  }

  // 2.5 Rate Limit: check rows in last 10 mins
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentFeedbackCount, error: countErr } = await supabase
    .from("private_feedback")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.id)
    .gte("created_at", tenMinutesAgo);

  if (countErr) {
    console.error(`Rate limit DB check failed. Code: ${countErr.code || "unknown"}`);
    return { error: "Failed to process request." };
  }

  if (recentFeedbackCount !== null && recentFeedbackCount >= 5) {
    return { error: "Please try again later." };
  }

  // 3. Insert feedback securely (bypasses anon restrictions)
  const { data: insertedRow, error: insertErr } = await supabase.from("private_feedback").insert({
    client_id: client.id,
    customer_name: customerName || null,
    customer_phone: customerPhone || null,
    feedback_text: feedbackText,
    consent_given: true,
  }).select("id").single();

  if (insertErr || !insertedRow) {
    console.error(`DB Insert failed. Code: ${insertErr?.code || "unknown"}`);
    return { error: "Failed to save feedback." };
  }

  // 4. Log analytics event for monthly reporting
  const { error: analyticsErr } = await supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "private_message_sent"
  });

  if (analyticsErr) {
    console.error(`Analytics insert failed. Code: ${analyticsErr.code || "unknown"}`);
  }

  // 5. Send email notification
  if (!process.env.EMAIL_FROM) {
    console.error("Email send skipped: EMAIL_FROM environment variable is missing.");
  } else if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "") {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailRes = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: client.owner_email,
        subject: `New Private Message for ${client.business_name}`,
        text: `You have received a new private message.\n\nCustomer: ${customerName || 'Anonymous'}\nPhone: ${customerPhone || 'N/A'}\n\nMessage:\n${feedbackText}\n\nYou can reply to the customer directly using the details provided above.`,
      });
      if (emailRes.error) {
        // Safe to log email API error names/messages since they don't contain customer PII natively
        console.error(`Resend API Error: ${emailRes.error.name} - ${emailRes.error.message}`);
      } else {
        const { error: updateErr } = await supabase.from("private_feedback")
          .update({ email_sent: true })
          .eq("id", insertedRow.id);
          
        if (updateErr) {
          console.error(`DB Update (email_sent) failed. Code: ${updateErr.code || "unknown"}`);
        }
      }
    } catch {
      console.error("Failed to send email alert: Unexpected error in Resend client.");
    }
  } else {
      console.error("Email send skipped: RESEND_API_KEY environment variable is missing.");
  }

  return { success: true };
}
