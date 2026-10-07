import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { SITE_CONFIG } from '@/lib/site-config'

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
    .select('id, business_name')
    .eq('owner_user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Error fetching client details:', error.message)
  }

  if (!client) {
    return (
      <main className="min-h-screen bg-[#F9F8F6] text-[#1C1917] p-8 flex items-center justify-center font-sans selection:bg-[#0A3622] selection:text-white">
        <p className="text-[#57534E] font-medium">No business found for this account. {SITE_CONFIG.contactEmail !== 'REPLACE_ME' ? `Please contact ${SITE_CONFIG.contactEmail}` : 'Please contact the service provider.'}</p>
      </main>
    )
  }

  // Fetch real stats (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

  const [
    { count: googleClicks },
    { count: landingViews },
    { count: privateMessages }
  ] = await Promise.all([
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('event_type', 'google_click').gte('created_at', thirtyDaysAgoIso),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('event_type', 'landing_page_view').gte('created_at', thirtyDaysAgoIso),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('client_id', client.id).eq('event_type', 'private_message_sent').gte('created_at', thirtyDaysAgoIso),
  ])

  // Fetch feedback messages
  const { data: feedbackList } = await supabase
    .from('private_feedback')
    .select('id, customer_name, customer_phone, created_at, resolved_at, feedback_text, owner_note, status')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(50)

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

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return;

    // Validate status
    if (status !== 'unresolved' && status !== 'in_progress' && status !== 'resolved') return;

    const supabaseAction = await createClient()
    
    // Auth user check is technically handled by RLS, but verifying session is good
    const { data: { user } } = await supabaseAction.auth.getUser()
    if (!user) return

    type UpdateData = { status: string; resolved_at?: string | null }
    const updateData: UpdateData = { status }
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    } else {
      updateData.resolved_at = null
    }

    const { error } = await supabaseAction.from('private_feedback').update(updateData).eq('id', id)
    if (error) {
      console.error(error.code)
    }
    revalidatePath('/admin/dashboard')
  }

  async function updateFeedbackNote(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const rawNote = formData.get('owner_note') as string
    const owner_note = rawNote ? rawNote.slice(0, 1000) : ''

    // Validate UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) return;

    const supabaseAction = await createClient()
    
    const { data: { user } } = await supabaseAction.auth.getUser()
    if (!user) return

    const { error } = await supabaseAction.from('private_feedback').update({ owner_note }).eq('id', id)
    if (error) {
      console.error(error.code)
    }
    revalidatePath('/admin/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#F9F8F6] text-[#1C1917] p-6 md:p-10 font-sans selection:bg-[#0A3622] selection:text-white">
      {/* Top Nav */}
      <nav className="flex items-center justify-between bg-white border border-[#EAE8E3] rounded-full px-6 py-3 mb-12 max-w-[1000px] mx-auto shadow-sm">
        <div className="font-semibold text-[17px] tracking-tight text-[#1C1917]">{client.business_name}</div>
        <div className="flex gap-4">
          <button className="bg-[#0A3622] text-[#F9F8F6] px-5 py-2 rounded-full text-[14px] font-medium hover:bg-[#062416] transition-all shadow-sm hover:shadow-md hover:-translate-y-[1px]">
            Dashboard
          </button>
        </div>
        <div className="flex items-center gap-4 hidden sm:flex">
          <div className="text-[#57534E] text-[14px] font-medium">{user.email}</div>
          <form action={logout}>
            <button type="submit" className="text-[#A8A29E] hover:text-[#1C1917] text-[14px] font-medium transition-colors">
              Logout
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1000px] mx-auto">
        <div className="mb-12 flex flex-col gap-1.5">
          <h1 className="text-[32px] font-semibold tracking-tight text-[#1C1917]">
            Welcome back, {client.business_name}
          </h1>
          <p className="text-[#57534E] text-[16px] font-medium">Here is your actual feedback and activity data (Last 30 days).</p>
        </div>
        
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          <div className="bg-[#0A3622] rounded-3xl p-7 shadow-[0_8px_30px_rgba(10,54,34,0.15)] transition-all hover:shadow-[0_12px_40px_rgba(10,54,34,0.2)] hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
            <h3 className="text-[#EAE8E3] text-[14px] font-medium mb-3 relative z-10">Private messages</h3>
            <div className="text-[44px] font-bold text-white tracking-tight leading-none relative z-10">
              {privateMessages ?? 0}
            </div>
          </div>

          <div className="bg-white border border-[#EAE8E3] rounded-3xl p-7 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:-translate-y-1">
            <h3 className="text-[#57534E] text-[14px] font-medium mb-3">Google link clicks</h3>
            <div className="text-[44px] font-bold text-[#1C1917] tracking-tight leading-none">
              {googleClicks ?? 0}
            </div>
          </div>

          <div className="bg-white border border-[#EAE8E3] rounded-3xl p-7 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:-translate-y-1">
            <h3 className="text-[#57534E] text-[14px] font-medium mb-3">Landing page views</h3>
            <div className="text-[44px] font-bold text-[#1C1917] tracking-tight leading-none">
              {landingViews ?? 0}
            </div>
          </div>
        </div>

        {/* Feedback List */}
        <h2 className="text-[22px] font-semibold tracking-tight mb-5 text-[#1C1917]">Customer Feedback</h2>
        <div className="bg-white border border-[#EAE8E3] rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          {(!feedbackList || feedbackList.length === 0) ? (
            <div className="p-16 text-center text-[#A8A29E] font-medium text-[15px]">
              No private feedback received yet.
            </div>
          ) : (
            <div className="divide-y divide-[#EAE8E3]">
              {feedbackList.map((feedback) => (
                <div key={feedback.id} className="p-6 sm:p-7 flex flex-col md:flex-row gap-6 hover:bg-[#faf9f7] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2.5 mb-2">
                      <span className="font-semibold text-[#1C1917] text-[15px]">{feedback.customer_name || 'Anonymous'}</span>
                      {feedback.customer_phone && <span className="text-[#57534E] text-[13px] font-medium bg-[#F9F8F6] px-2 py-0.5 rounded-md border border-[#EAE8E3]">{feedback.customer_phone}</span>}
                      <span className="text-[#A8A29E] text-[13px] font-medium">• {new Date(feedback.created_at).toLocaleDateString()}</span>
                      {feedback.resolved_at && (
                        <span className="bg-[#E6F4EA] text-[#0A3622] text-[12px] font-medium px-2.5 py-0.5 rounded-md border border-[#C3E6CB] ml-1">
                          Resolved {new Date(feedback.resolved_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-[#404040] text-[15px] leading-relaxed mb-4 font-medium">&quot;{feedback.feedback_text}&quot;</p>
                    
                    <form action={updateFeedbackNote} className="flex gap-2 w-full max-w-sm mt-3">
                      <input type="hidden" name="id" value={feedback.id} />
                      <input 
                        type="text" 
                        name="owner_note"
                        defaultValue={feedback.owner_note || ''}
                        placeholder="Add a private note..."
                        className="flex-1 bg-[#F9F8F6] border border-[#EAE8E3] text-[13px] rounded-lg px-3 py-2 text-[#57534E] focus:outline-none focus:border-[#0A3622] focus:ring-1 focus:ring-[#0A3622] placeholder-[#A8A29E] shadow-sm transition-all"
                      />
                      <button type="submit" className="bg-white border border-[#EAE8E3] hover:bg-[#F9F8F6] text-[#57534E] hover:text-[#1C1917] text-[13px] font-medium py-2 px-4 rounded-lg transition-all shadow-sm">
                        Save
                      </button>
                    </form>
                  </div>
                  
                  <div className="w-full md:w-48 flex flex-col gap-2 pt-1">
                    <form action={updateFeedbackStatus} className="flex flex-col gap-2">
                      <input type="hidden" name="id" value={feedback.id} />
                      <select 
                        name="status"
                        defaultValue={feedback.status}
                        className="bg-[#F9F8F6] border border-[#EAE8E3] text-[13px] font-semibold rounded-lg px-3 py-2.5 text-[#1C1917] focus:outline-none focus:border-[#0A3622] focus:ring-1 focus:ring-[#0A3622] shadow-sm appearance-none cursor-pointer"
                      >
                        <option value="unresolved">🔴 Unresolved</option>
                        <option value="in_progress">🟡 In Progress</option>
                        <option value="resolved">🟢 Resolved</option>
                      </select>
                      <button type="submit" className="bg-white border border-[#EAE8E3] hover:bg-[#F9F8F6] text-[#57534E] hover:text-[#1C1917] text-[13px] font-medium py-2 px-4 rounded-lg transition-all shadow-sm">
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
