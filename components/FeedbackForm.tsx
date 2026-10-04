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
      <div className="w-full text-center py-10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-medium text-gray-900">Message Sent</h2>
        <p className="text-gray-600 text-sm max-w-[280px]">
          Thank you. Your feedback has been sent directly to management.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg text-sm text-center">
          {errorMessage}
        </div>
      )}
      
      <div>
        <label htmlFor="feedbackText" className="block text-sm font-medium text-gray-700 mb-1.5">
          How can we improve? <span className="text-red-500">*</span>
        </label>
        <textarea
          id="feedbackText"
          name="feedbackText"
          required
          rows={5}
          className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none shadow-sm"
          placeholder="Please share your experience..."
          maxLength={2000}
        />
        <p className="text-xs text-gray-500 mt-1">
          Please don&apos;t include medical or other sensitive details.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1.5">Name (Optional)</label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone (Optional)</label>
          <input
            type="tel"
            id="customerPhone"
            name="customerPhone"
            className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
        <input 
          type="checkbox" 
          id="consent" 
          name="consent"
          required 
          className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="consent" className="text-xs text-gray-600 leading-relaxed">
          I consent to my feedback and details being shared securely with management to resolve my issue in accordance with the <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</Link>.
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
        className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-3 transition-colors shadow-sm flex justify-center items-center"
      >
        {status === "loading" ? (
          <span className="flex items-center gap-2">
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
