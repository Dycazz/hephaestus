import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Building2, LogOut } from 'lucide-react'

/**
 * Server component layout — gates the entire /admin section.
 * Any profile without is_admin = true is redirected to /dashboard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check is_admin with service role
  const adminClient = await createClient(true)
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/dashboard')

  return (
    <div className="min-h-screen flex" style={{ background: '#080a10' }}>
      {/* Sidebar */}
      <aside
        className="w-56 shrink-0 flex flex-col"
        style={{
          background: '#0d0f17',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          minHeight: '100vh',
        }}
      >
        {/* Brand */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center">
              <span className="text-xs font-black text-black">H</span>
            </div>
            <span className="text-white font-bold text-sm">hephaestus.work</span>
          </div>
          <span
            className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/admin" icon={<Building2 className="w-4 h-4" />} label="Organizations" />
        </nav>

        {/* Footer */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="text-xs text-slate-500 truncate mb-2">{user.email}</div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Back to app
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      {icon}
      {label}
    </Link>
  )
}
