import Link from 'next/link'
import Image from 'next/image'
import {
  MessageSquare, CalendarDays, LayoutGrid,
  Check, Zap, Star, ArrowRight, Users, Shield,
} from 'lucide-react'

// ── Data ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Kanban dispatch board',
    description: 'Drag job cards through status columns — scheduled, confirmed, at risk, complete — all in one view.',
    color: '#3b82f6',
  },
  {
    icon: MessageSquare,
    title: 'Automated SMS reminders',
    description: 'Customers confirm or reschedule by replying 1 or 2. No manual follow-up, no missed appointments.',
    color: '#10b981',
  },
  {
    icon: CalendarDays,
    title: 'Calendar scheduling',
    description: 'See your full day across every technician at a glance. Click any open slot to book instantly.',
    color: '#f97316',
  },
  {
    icon: Star,
    title: 'Automatic review requests',
    description: 'A Google review request fires 2 hours after job completion — while the experience is still fresh.',
    color: '#eab308',
  },
  {
    icon: Users,
    title: 'Team management',
    description: 'Add technicians, assign jobs, and track who is doing what across your whole crew.',
    color: '#a855f7',
  },
  {
    icon: Shield,
    title: 'Role-based access',
    description: 'Owner, dispatcher, and viewer roles keep your data safe and your team focused on what matters.',
    color: '#06b6d4',
  },
]

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: '#94a3b8',
    description: 'For solo operators getting started.',
    features: [
      '25 jobs / month',
      '2 technicians',
      '50 SMS included',
      'Kanban + calendar view',
      'Hephaestus branding on SMS',
    ],
    cta: 'Get started free',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$39',
    period: '/ month',
    color: '#3b82f6',
    description: 'For small crews ready to grow.',
    features: [
      '250 jobs / month',
      '5 technicians',
      '500 SMS included',
      'No Hephaestus branding',
      'Google review automation',
    ],
    cta: 'Start free trial',
    href: '/signup?plan=starter',
    highlight: true,
  },
  {
    name: 'Pro',
    price: '$99',
    period: '/ month',
    color: '#a855f7',
    description: 'For growing operations at scale.',
    features: [
      'Unlimited jobs',
      'Unlimited technicians',
      '2,000 SMS included',
      'Priority support',
      'Everything in Starter',
    ],
    cta: 'Start free trial',
    href: '/signup?plan=pro',
    highlight: false,
  },
]

// ── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: '#0d0f17', color: 'white', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(13,15,23,0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-white rounded-lg overflow-hidden flex items-center justify-center" style={{ width: 32, height: 32 }}>
              <Image src="/logo.png" alt="Hephaestus" width={28} height={28} className="object-contain" priority />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Hephaestus</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/6"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-1.5 rounded-lg transition-all"
              style={{ background: '#2563eb' }}
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#93c5fd' }}
        >
          <Zap className="w-3 h-3" />
          Built for field service businesses
        </div>

        <h1
          className="text-5xl sm:text-6xl font-extrabold tracking-tight mb-6 leading-tight"
          style={{ color: 'white' }}
        >
          Dispatch smarter.
          <br />
          <span style={{ color: '#3b82f6' }}>Never miss a job.</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Hephaestus is the all-in-one dispatch platform for plumbers, HVAC techs, electricians, and field crews.
          Schedule jobs, send automated SMS reminders, and collect Google reviews — all in one place.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}
          >
            Start for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium text-slate-300 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Sign in to your account
          </Link>
        </div>

        <p className="text-xs text-slate-600 mt-5">No credit card required. Free plan available forever.</p>
      </section>

      {/* ── Dashboard preview strip ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }} className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {[
              { value: 'Kanban board', label: 'Real-time job status' },
              { value: 'SMS automation', label: 'Confirmations & reminders' },
              { value: 'Calendar view', label: 'Team scheduling' },
              { value: 'Review requests', label: 'Auto Google reviews' },
            ].map(item => (
              <div key={item.value} className="text-center">
                <p className="text-sm font-semibold text-white/80">{item.value}</p>
                <p className="text-xs text-slate-600 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Everything your crew needs</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            From the first booking to the final review request — Hephaestus handles the busywork so your team can focus on the work.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="p-6 rounded-2xl"
                style={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-6xl mx-auto px-6 pb-28" id="pricing">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, honest pricing</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Start free. Upgrade when your business grows. No hidden fees, no long-term contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className="rounded-2xl p-6 flex flex-col"
              style={{
                background: tier.highlight ? 'linear-gradient(135deg, #1a2d5a, #1e3a6e)' : '#1a1d26',
                border: tier.highlight ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.06)',
                boxShadow: tier.highlight ? '0 8px 32px rgba(37,99,235,0.2)' : undefined,
              }}
            >
              {tier.highlight && (
                <div
                  className="inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{ background: 'rgba(59,130,246,0.25)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.35)' }}
                >
                  Most popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: `${tier.color}20` }}
                >
                  <Zap className="w-3.5 h-3.5" style={{ color: tier.color }} />
                </div>
                <span className="text-sm font-bold text-white">{tier.name}</span>
              </div>

              <p className="text-xs text-slate-500 mb-4">{tier.description}</p>

              <div className="flex items-baseline gap-1 mb-5">
                <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                <span className="text-sm text-slate-500">{tier.period}</span>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-400">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: tier.color }} />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className="block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={
                  tier.highlight
                    ? { background: '#2563eb', color: 'white' }
                    : { background: `${tier.color}18`, color: tier.color, border: `1px solid ${tier.color}25` }
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          SMS overages billed at $0.05 / message. All plans include a 14-day free trial of the next tier.
        </p>
      </section>

      {/* ── CTA banner ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#111318' }} className="py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to run a tighter ship?</h2>
          <p className="text-slate-500 mb-8">
            Join field service businesses using Hephaestus to dispatch faster, reduce no-shows, and get more reviews.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', boxShadow: '0 4px 24px rgba(37,99,235,0.35)' }}
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0d0f17' }} className="py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md overflow-hidden" style={{ width: 22, height: 22 }}>
              <Image src="/logo.png" alt="Hephaestus" width={22} height={22} className="object-contain" />
            </div>
            <span className="text-xs font-semibold text-slate-500">Hephaestus</span>
          </div>
          <p className="text-xs text-slate-700">Field service dispatch, done right.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sign in</Link>
            <Link href="/signup" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
