'use client'

import { useState } from 'react'
import { login } from './actions'
import { SITE_CONFIG } from '@/lib/site-config'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-6 font-sans selection:bg-[#0A3622] selection:text-white">
      <div className="w-full max-w-[420px]">
        <div className="bg-white border border-[#EAE8E3] rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-10 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="mb-8 text-center flex flex-col gap-1">
            <h1 className="text-[26px] font-semibold tracking-tight text-[#1C1917]">Welcome back</h1>
            <p className="text-[15px] font-medium text-[#57534E]">Enter your credentials to access the dashboard</p>
          </div>

          <form action={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#404040]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full h-12 bg-white border border-[#EAE8E3] rounded-xl px-4 text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#0A3622] focus:border-[#0A3622] transition-shadow shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                placeholder="owner@business.com"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-semibold text-[#404040]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full h-12 bg-white border border-[#EAE8E3] rounded-xl px-4 text-[15px] text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#0A3622] focus:border-[#0A3622] transition-shadow shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full h-12 bg-[#0A3622] text-[#F9F8F6] font-medium rounded-2xl hover:bg-[#062416] focus:outline-none focus:ring-2 focus:ring-[#0A3622]/50 focus:ring-offset-2 transition-all disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-[1px]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#F9F8F6]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer text */}
        {SITE_CONFIG.operatorName !== 'REPLACE_ME' && (
          <p className="text-center text-[13px] text-[#A8A29E] mt-6 font-medium">
            Powered by {SITE_CONFIG.operatorName}
          </p>
        )}
      </div>
    </main>
  )
}
