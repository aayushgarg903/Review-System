"use server";

import { getServiceRoleClient } from "@/lib/supabase-server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function submitFeedback(formData: FormData) {
  const token = formData.get("cf-turnstile-response") as string;
  const slug = formData.get("slug") as string;
  const customerName = formData.get("customerName") as string;
  const customerPhone = formData.get("customerPhone") as string;
  const feedbackText = formData.get("feedbackText") as string;
  const consentGiven = formData.get("consentGiven") === "true";

  if (!token || !slug || !feedbackText || !consentGiven) {
    return { error: "Missing required fields." };
  }

  // 1. Verify Turnstile directly from the server
  const verifyRes = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${process.env.TURNSTILE_SECRET_KEY}&response=${token}`,
    }
  );
  
  const verifyData = await verifyRes.json();
  if (!verifyData.success) {
    return { error: "Security check failed. Please try again." };
  }

  const supabase = getServiceRoleClient();

  // 2. Fetch the client id and email using service role
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, owner_email, business_name")
    .eq("slug", slug)
    .single();

  if (clientErr || !client) {
    return { error: "Client not found." };
  }

  // 3. Insert feedback securely (bypasses anon restrictions)
  const { error: insertErr } = await supabase.from("private_feedback").insert({
    client_id: client.id,
    customer_name: customerName || null,
    customer_phone: customerPhone || null,
    feedback_text: feedbackText,
    consent_given: true,
  });

  if (insertErr) {
    console.error("DB Insert Error:", insertErr);
    return { error: "Failed to save feedback." };
  }

  // 4. Log analytics event for monthly reporting
  await supabase.from("analytics_events").insert({
    client_id: client.id,
    event_type: "private_message_sent"
  });

  // 5. Fire and forget email notification
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "") {
    try {
      await resend.emails.send({
        from: "alerts@yourdomain.com", // This must be updated to a verified domain in production
        to: client.owner_email,
        subject: `New Private Message for ${client.business_name}`,
        text: `You have received a new private message.\n\nCustomer: ${customerName || 'Anonymous'}\nPhone: ${customerPhone || 'N/A'}\n\nMessage:\n${feedbackText}\n\nPlease login to your dashboard to view and resolve this.`,
      });
    } catch (emailErr) {
      console.error("Failed to send email alert", emailErr);
      // We don't fail the submission if the email fails, the DB row is still saved.
    }
  }

  return { success: true };
}
