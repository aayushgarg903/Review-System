"use client";

import { useState, useRef } from "react";
import { submitFeedback } from "@/app/actions/feedback";
import { Turnstile, TurnstileInstance } from "@marsidev/react-turnstile";
import Link from "next/link";

export default function FeedbackForm({ slug, siteKey }: { slug: string, siteKey: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenStatus, setTokenStatus] = useState<"solved" | "error" | "expired" | null>(null);
  
  const turnstileRef = useRef<TurnstileInstance>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    
    const formData = new FormData(e.currentTarget);
    formData.append("slug", slug);

    try {
      const res = await submitFeedback(formData);

      if (res?.error) {
        setStatus("error");
        setErrorMessage(res.error);
        turnstileRef.current?.reset();
        setTokenStatus(null);
      } else if (res?.success) {
        setStatus("success");
      }
    } catch {
      setStatus("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
      turnstileRef.current?.reset();
      setTokenStatus(null);
    }
  }

  if (status === "success") {
    return (
      <div className="w-full text-center py-14 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-[#E6F4EA] rounded-full flex items-center justify-center mb-1 shadow-sm border border-[#C3E6CB]">
          <svg className="w-12 h-12 text-[#0A3622]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[26px] font-bold text-[#1C1917] tracking-tight">Message Sent</h2>
        <p className="text-[#57534E] text-[16px] font-medium max-w-[300px] leading-relaxed">
          Thank you. Your feedback has been sent directly to management.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full mt-2">
      {errorMessage && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] text-[#B91C1C] p-4 rounded-xl text-[14px] font-medium text-center shadow-sm">
          {errorMessage}
        </div>
      )}
      
      <div>
        <label htmlFor="feedbackText" className="block text-[15px] font-semibold text-[#1C1917] mb-2.5">
          How can we improve? <span className="text-red-500">*</span>
        </label>
        <textarea
          id="feedbackText"
          name="feedbackText"
          required
          rows={5}
          className="w-full bg-[#F9F8F6] text-[#1C1917] border border-[#EAE8E3] rounded-[20px] p-4.5 text-[15px] focus:bg-white focus:ring-[3px] focus:ring-[#E6F4EA] focus:border-[#0A3622] outline-none resize-none shadow-sm transition-all placeholder-[#A8A29E]"
          placeholder="Please share your experience..."
          maxLength={2000}
        />
        <p className="text-[13px] text-[#A8A29E] mt-2.5 font-medium px-1">
          Please don&apos;t include medical or other sensitive details.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customerName" className="block text-[14px] font-semibold text-[#1C1917] mb-2">Name <span className="text-[#A8A29E] font-medium">(Optional)</span></label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            className="w-full bg-[#F9F8F6] text-[#1C1917] border border-[#EAE8E3] rounded-xl p-3.5 text-[15px] outline-none focus:bg-white focus:ring-[3px] focus:ring-[#E6F4EA] focus:border-[#0A3622] shadow-sm transition-all"
          />
        </div>
        <div>
          <label htmlFor="customerPhone" className="block text-[14px] font-semibold text-[#1C1917] mb-2">Phone <span className="text-[#A8A29E] font-medium">(Optional)</span></label>
          <input
            type="tel"
            id="customerPhone"
            name="customerPhone"
            className="w-full bg-[#F9F8F6] text-[#1C1917] border border-[#EAE8E3] rounded-xl p-3.5 text-[15px] outline-none focus:bg-white focus:ring-[3px] focus:ring-[#E6F4EA] focus:border-[#0A3622] shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="flex items-start gap-3.5 bg-[#F9F8F6] p-5 rounded-2xl border border-[#EAE8E3] shadow-sm">
        <input 
          type="checkbox" 
          id="consent" 
          name="consent"
          required 
          className="mt-0.5 w-[18px] h-[18px] rounded border-[#EAE8E3] text-[#0A3622] focus:ring-[#0A3622] cursor-pointer"
        />
        <label htmlFor="consent" className="text-[13px] text-[#57534E] leading-relaxed font-medium cursor-pointer">
          I consent to my feedback and details being shared securely with management to resolve my issue in accordance with the <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#1C1917]">Privacy Policy</Link>.
        </label>
      </div>

      <div className="flex justify-center my-2">
        <Turnstile 
          ref={turnstileRef}
          siteKey={siteKey || ""} 
          onSuccess={() => setTokenStatus("solved")}
          onError={() => setTokenStatus("error")}
          onExpire={() => setTokenStatus("expired")}
        />
        {(tokenStatus === "error" || tokenStatus === "expired") && (
          <p className="text-red-500 text-xs mt-2 text-center">
            Security check failed to load. Please refresh the page.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading" || tokenStatus !== "solved"}
        className="w-full min-h-[56px] bg-[#0A3622] hover:bg-[#062416] disabled:opacity-50 disabled:hover:bg-[#0A3622] text-white text-[16px] font-medium rounded-2xl px-6 py-3 transition-all duration-200 shadow-[0_4px_14px_rgba(10,54,34,0.1)] hover:shadow-[0_8px_20px_rgba(10,54,34,0.15)] hover:-translate-y-0.5 flex justify-center items-center mt-2"
      >
        {status === "loading" ? (
          <span className="flex items-center gap-2.5">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </span>
        ) : "Send Private Message"}
      </button>
    </form>
  );
}
