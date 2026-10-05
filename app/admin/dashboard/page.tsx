import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Protect the route: Get the user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/admin/login')
  }

  // Fetch the business details for this user
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('owner_user_id', user.id)
    .single()

  if (!client) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white p-8 flex items-center justify-center">
        <p>No business found for this account. Please contact support.</p>
      </main>
    )
  }

  // Fetch real stats
  const [
    { count: googleClicks },
    { count: landingViews },
    { count: privateMessages }
  ] = await Promise.all([
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('event_type', 'google_click'),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('event_type', 'landing_page_view'),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('client_id', client.id).eq('event_type', 'private_message_sent'),
  ])

  // Fetch feedback messages
  const { data: feedbackList } = await supabase
    .from('private_feedback')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  // Server Actions
  async function logout() {
    'use server'
    const supabaseAction = await createClient()
    await supabaseAction.auth.signOut()
    redirect('/admin/login')
  }

  async function updateFeedbackStatus(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const status = formData.get('status') as string
    const supabaseAction = await createClient()
    
    // Auth user check is technically handled by RLS, but verifying session is good
    const { data: { user } } = await supabaseAction.auth.getUser()
    if (!user) return

    await supabaseAction.from('private_feedback').update({ status }).eq('id', id)
    revalidatePath('/admin/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
      {/* Top Nav */}
      <nav className="flex items-center justify-between bg-[#141414] border border-[#2a2a2a] rounded-full px-6 py-3 mb-10 max-w-6xl mx-auto shadow-lg">
        <div className="font-bold text-lg tracking-tight">Rohtak Engine</div>
        <div className="flex gap-4">
          <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-200 transition">
            Dashboard
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-gray-400 text-sm">{user.email}</div>
          <form action={logout}>
            <button type="submit" className="text-gray-400 hover:text-white text-sm font-medium transition">
              Logout
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Welcome back, {client.business_name}
        </h1>
        <p className="text-gray-400 mb-8">Here is your actual feedback and activity data.</p>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Google Review Clicks</h3>
            <div className="text-4xl font-bold text-white mt-2">
              {googleClicks ?? 0}
            </div>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Private Messages</h3>
            <div className="text-4xl font-bold text-white mt-2">
              {privateMessages ?? 0}
            </div>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl">
            <h3 className="text-gray-400 text-sm font-medium mb-1">Landing Page Views</h3>
            <div className="text-4xl font-bold text-white mt-2">
              {landingViews ?? 0}
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <h2 className="text-xl font-semibold tracking-tight mb-4">Customer Feedback</h2>
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-xl">
          {(!feedbackList || feedbackList.length === 0) ? (
            <div className="p-8 text-center text-gray-500">
              No private feedback received yet.
            </div>
          ) : (
            <div className="divide-y divide-[#2a2a2a]">
              {feedbackList.map((feedback) => (
                <div key={feedback.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-[#1a1a1a] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-white">{feedback.customer_name || 'Anonymous'}</span>
                      <span className="text-gray-500 text-sm">{feedback.customer_phone}</span>
                      <span className="text-gray-600 text-xs">• {new Date(feedback.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed mb-4">&quot;{feedback.feedback_text}&quot;</p>
                  </div>
                  
                  <div className="w-full md:w-48 flex flex-col gap-2">
                    <form action={updateFeedbackStatus} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={feedback.id} />
                      <select 
                        name="status"
                        defaultValue={feedback.status}
                        className="bg-[#0a0a0a] border border-[#2a2a2a] text-sm rounded-lg px-3 py-2 text-gray-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="unresolved">🔴 Unresolved</option>
                        <option value="in_progress">🟡 In Progress</option>
                        <option value="resolved">🟢 Resolved</option>
                      </select>
                      <button type="submit" className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-xs py-1.5 px-3 rounded text-gray-300 transition-colors">
                        Update Status
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
