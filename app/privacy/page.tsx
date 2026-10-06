import { SITE_CONFIG } from "@/lib/site-config";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <div className="w-full max-w-2xl bg-white shadow-sm rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Privacy Notice</h1>
        
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Operator</h2>
            <p>This service is operated by {SITE_CONFIG.operatorName}. You can contact us at <a href={`mailto:${SITE_CONFIG.contactEmail}`} className="text-blue-600 hover:underline">{SITE_CONFIG.contactEmail}</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-2">What we collect</h2>
            <p>If you choose to send a private message, we collect the feedback text you provide, along with your name and phone number (if you choose to provide them). We also log anonymous interaction events (like scanning the QR code or clicking a button) to generate basic analytics. To limit spam, we keep a keyed (HMAC) hash of the visitor&apos;s IP address for up to one day. It is used only to limit repeated submissions, is not stored with your message, and is deleted automatically.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Why we collect it</h2>
            <p>We collect this information strictly to allow the management of the participating business to review your feedback and contact you to resolve any issues. We do not use your information for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Who sees it and Service Providers</h2>
            <p>Your private feedback is visible only to the management of the specific business you visited. To provide this service, we use the following secure third-party infrastructure providers:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Vercel</strong>: For hosting the website securely.</li>
              <li><strong>Supabase</strong>: For securely storing your feedback and our database.</li>
              <li><strong>Resend</strong>: For sending email notifications to the business.</li>
              <li><strong>Cloudflare (Turnstile)</strong>: For security and spam protection on our forms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Data Retention</h2>
            <p>All private messages and associated contact details are automatically and permanently deleted from our systems after 18 months in accordance with data minimization principles.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Withdrawing Consent and Your Rights</h2>
            <p>You have the right to withdraw your consent and request the deletion of your personal data at any time before the 18-month retention period ends. To request deletion, withdraw consent, or ask questions about your data, please contact the business management directly, or email us at the contact address listed in the Operator section above.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
