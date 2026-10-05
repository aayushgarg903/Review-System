import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Protect the route: Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  // Fetch the business details for this user (TDD constraint #3)
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('owner_user_id', user.id)
    .single()

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
      {/* Top Nav Mock */}
      <nav className="flex items-center justify-between bg-[#141414] border border-[#2a2a2a] rounded-full px-6 py-3 mb-10 max-w-4xl mx-auto shadow-lg">
        <div className="font-bold text-lg tracking-tight">Rohtak Engine</div>
        <div className="flex gap-4">
          <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-200 transition">
            Dashboard
          </button>
          <button className="text-gray-400 px-4 py-1.5 rounded-full text-sm font-medium hover:text-white transition">
            Feedback
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/50 flex items-center justify-center text-purple-400 text-xs font-bold">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          {client ? `Welcome back, ${client.business_name}` : "Welcome back"}
        </h1>
        <p className="text-gray-400 mb-8">Here is what is happening with your reviews today.</p>
        
        {/* Metric Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Total Google Reviews</h3>
            <div className="text-4xl font-bold text-white flex items-baseline gap-2">
              --
              <span className="text-emerald-500 text-sm font-medium">↑ 12%</span>
            </div>
            <div className="mt-6 h-12 bg-emerald-500/10 rounded-lg border border-emerald-500/20" />
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Private Messages</h3>
            <div className="text-4xl font-bold text-white flex items-baseline gap-2">
              --
              <span className="text-orange-500 text-sm font-medium">↑ 4%</span>
            </div>
            <div className="mt-6 h-12 bg-orange-500/10 rounded-lg border border-orange-500/20" />
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-1">QR Code Scans</h3>
            <div className="text-4xl font-bold text-white flex items-baseline gap-2">
              --
              <span className="text-purple-500 text-sm font-medium">↑ 24%</span>
            </div>
            <div className="mt-6 h-12 bg-purple-500/10 rounded-lg border border-purple-500/20" />
          </div>
        </div>
      </div>
    </main>
  )
}
