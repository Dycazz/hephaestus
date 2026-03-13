import Link from 'next/link'
import Image from 'next/image'
import {
  MessageSquare, CalendarDays, LayoutGrid,
  Check, Zap, Star, ArrowRight, Users, Shield,
  RefreshCw, ClipboardList, Bell, Phone, X,
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
    description: 'See your full week across every technician at a glance. Click any open slot to book instantly.',
    color: '#f97316',
  },
  {
    icon: Star,
    title: 'Automatic review requests',
    description: 'A Google review request fires 2 hours after job completion — while the experience is still fresh.',
    color: '#eab308',
  },
  {
    icon: RefreshCw,
    title: 'Recurring appointments',
    description: 'Set daily, weekly, bi-weekly, or monthly repeating jobs and let Hephaestus handle the schedule.',
    color: '#a855f7',
  },
  {
    icon: ClipboardList,
    title: 'Prep checklists',
    description: 'Attach per-service default checklists so techs always arrive with the right tools and expectations.',
    color: '#06b6d4',
  },
  {
    icon: Users,
    title: 'Team management',
    description: 'Add technicians, assign jobs, and track who is doing what across your whole crew in real time.',
    color: '#f43f5e',
  },
  {
    icon: Bell,
    title: 'Push notifications',
    description: 'Technicians get instant push alerts on the mobile app the moment a job is assigned to them.',
    color: '#8b5cf6',
  },
  {
    icon: Shield,
    title: 'Role-based access',
    description: 'Owner, dispatcher, and viewer roles keep your data safe and your team focused on their work.',
    color: '#14b8a6',
  },
]

// Feature rows used in the comparison table
// null = not included, true = included, string = custom label
type FeatureValue = boolean | string | null

interface ComparisonFeature {
  label: string
  starter: FeatureValue
  pro: FeatureValue
  enterprise: FeatureValue
  section?: string  // section heading — only set on first item in a group
}

const COMPARISON: ComparisonFeature[] = [
  // Capacity
  { section: 'Capacity',  label: 'Jobs per month',       starter: '200',        pro: 'Unlimited',       enterprise: 'Unlimited'       },
  {                        label: 'Technicians',           starter: '3',          pro: '5',               enterprise: 'Unlimited'       },
  {                        label: 'SMS per month',         starter: '500',        pro: 'Unlimited',       enterprise: 'Unlimited'       },
  {                        label: 'Team members',          starter: 'Unlimited',  pro: 'Unlimited',       enterprise: 'Unlimited'       },

  // Scheduling
  { section: 'Scheduling', label: 'Kanban dispatch board', starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Calendar view',         starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Recurring appointments',starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Technician availability',starter: true,       pro: true,              enterprise: true              },
  {                         label: 'Prep checklists',       starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Waitlist management',   starter: true,        pro: true,              enterprise: true              },

  // Communication
  { section: 'Communication', label: 'Automated SMS reminders',  starter: true, pro: true,              enterprise: true              },
  {                             label: 'Two-way customer replies', starter: true, pro: true,              enterprise: true              },
  {                             label: 'Reschedule via SMS',       starter: true, pro: true,              enterprise: true              },
  {                             label: 'SMS review requests',      starter: true, pro: true,              enterprise: true              },
  {                             label: 'Custom Twilio phone number',starter: null, pro: null,             enterprise: true              },

  // Mobile & notifications
  { section: 'Mobile & Alerts', label: 'Mobile app (iOS & Android)', starter: true, pro: true,          enterprise: true              },
  {                               label: 'Push notifications',         starter: true, pro: true,          enterprise: true              },

  // Team & access
  { section: 'Team & Access',  label: 'Role-based access control', starter: true, pro: true,            enterprise: true              },
  {                              label: 'Team invitations',           starter: true, pro: true,            enterprise: true              },
  {                              label: 'Client profiles & history',  starter: true, pro: true,            enterprise: true              },

  // Support
  { section: 'Support',        label: 'Email support',           starter: true,   pro: true,              enterprise: true              },
  {                              label: 'Priority support',        starter: null,   pro: true,              enterprise: true              },
  {                              label: 'Dedicated account manager',starter: null,  pro: null,              enterprise: true              },
  {                              label: 'SLA guarantee',           starter: null,   pro: null,              enterprise: true              },
]

const TIERS = [
  {
    name: 'Starter',
    price: '$24.99',
    period: '/ month',
    color: '#3b82f6',
    description: 'For solo operators and small crews just getting started.',
    highlight: false,
    features: [
      '200 jobs / month',
      '3 technicians',
      '500 SMS / month',
      'Kanban + calendar view',
      'Recurring appointments',
      'Automated SMS reminders',
      'Google review automation',
      'Mobile app + push notifications',
      'Role-based access control',
      'Email support',
    ],
    cta: 'Start with Starter',
    href: '/signup?plan=starter',
  },
  {
    name: 'Pro',
    price: '$49.99',
    period: '/ month',
    color: '#a855f7',
    description: 'For growing operations that need more capacity and reach.',
    highlight: true,
    features: [
      'Unlimited jobs',
      '5 technicians',
      'Unlimited SMS',
      'Everything in Starter',
      'Waitlist management',
      'Two-way SMS conversations',
      'Advanced recurring scheduling',
      'Priority support',
    ],
    cta: 'Start with Pro',
    href: '/signup?plan=pro',
  },
  {
    name: 'Enterprise',
    price: '$99.99',
    period: '/ month',
    color: '#f59e0b',
    description: 'For large operations that demand unlimited scale and white-glove service.',
    highlight: false,
    features: [
      'Unlimited jobs',
      'Unlimited technicians',
      'Unlimited SMS',
      'Everything in Pro',
      'Custom Twilio phone number',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Start with Enterprise',
    href: '/signup?plan=enterprise',
  },
]

// ── Helper components ───────────────────────────────────────────────────────

function FeatureCell({ value, color }: { value: FeatureValue; color: string }) {
  if (value === null) {
    return (
      <div className="flex justify-center">
        <X className="w-4 h-4 text-slate-700" />
      </div>
    )
  }
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${color}20` }}>
          <Check className="w-3 h-3" style={{ color }} />
        </div>
      </div>
    )
  }
  return (
    <div className="text-center text-xs font-semibold" style={{ color }}>
      {value}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const starterColor  = '#3b82f6'
  const proColor      = '#a855f7'
  const enterpriseColor = '#f59e0b'

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
          <div className="flex items-center gap-4">
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors hidden sm:block"
            >
              Pricing
            </a>
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

        <p className="text-xs text-slate-600 mt-5">No credit card required · 14-day free trial included</p>
      </section>

      {/* ── Dashboard preview strip ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }} className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {[
              { value: 'Kanban board',    label: 'Real-time job status' },
              { value: 'SMS automation',  label: 'Confirmations & reminders' },
              { value: 'Calendar view',   label: 'Team scheduling' },
              { value: 'Review requests', label: 'Auto Google reviews' },
              { value: 'Mobile app',      label: 'iOS & Android' },
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

      {/* ── Pricing cards ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16" id="pricing">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">Simple, honest pricing</h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Start free for 14 days. No credit card required. Upgrade when your business grows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-start">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className="rounded-2xl p-6 flex flex-col relative"
              style={{
                background: tier.highlight ? 'linear-gradient(135deg, #1a2047, #1e2860)' : '#1a1d26',
                border: tier.highlight ? `1px solid ${tier.color}50` : '1px solid rgba(255,255,255,0.06)',
                boxShadow: tier.highlight ? `0 8px 32px ${tier.color}25` : undefined,
              }}
            >
              {tier.highlight && (
                <div
                  className="inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{ background: `${tier.color}25`, color: tier.color, border: `1px solid ${tier.color}40` }}
                >
                  Most popular
                </div>
              )}

              {/* Plan name + icon */}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${tier.color}20`, border: `1px solid ${tier.color}30` }}
                >
                  <Zap className="w-4 h-4" style={{ color: tier.color }} />
                </div>
                <span className="text-sm font-bold text-white">{tier.name}</span>
              </div>

              <p className="text-xs text-slate-500 mb-4">{tier.description}</p>

              {/* Price */}
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                <span className="text-sm text-slate-500">{tier.period}</span>
              </div>

              {/* Feature list */}
              <ul className="space-y-2.5 mb-7 flex-1">
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
                    ? { background: tier.color, color: 'white', boxShadow: `0 4px 16px ${tier.color}40` }
                    : { background: `${tier.color}15`, color: tier.color, border: `1px solid ${tier.color}25` }
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          All plans include a 14-day free trial · Cancel anytime · No hidden fees
        </p>
      </section>

      {/* ── Full feature comparison table ── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">Compare plans</h2>
          <p className="text-sm text-slate-500">Everything that&apos;s included — side by side.</p>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#13151f' }}
        >
          {/* Table header */}
          <div className="grid grid-cols-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4" />
            {[
              { name: 'Starter',    price: '$24.99', color: starterColor    },
              { name: 'Pro',        price: '$49.99', color: proColor        },
              { name: 'Enterprise', price: '$99.99', color: enterpriseColor },
            ].map(t => (
              <div
                key={t.name}
                className="px-4 py-4 text-center border-l"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                <p className="text-sm font-bold text-white">{t.name}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: t.color }}>{t.price}<span className="text-slate-600 font-normal">/mo</span></p>
              </div>
            ))}
          </div>

          {/* Feature rows */}
          {(() => {
            const rows: React.ReactNode[] = []
            let lastSection = ''

            COMPARISON.forEach((row, i) => {
              // Section heading row
              if (row.section && row.section !== lastSection) {
                lastSection = row.section
                rows.push(
                  <div
                    key={`section-${row.section}`}
                    className="grid grid-cols-4 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}
                  >
                    <div className="col-span-4 px-5 py-2.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                        {row.section}
                      </span>
                    </div>
                  </div>
                )
              }

              // Data row
              const isLast = i === COMPARISON.length - 1
              rows.push(
                <div
                  key={row.label}
                  className="grid grid-cols-4 border-b transition-colors hover:bg-white/2"
                  style={{ borderColor: isLast ? 'transparent' : 'rgba(255,255,255,0.04)' }}
                >
                  <div className="px-5 py-3 flex items-center">
                    <span className="text-xs text-slate-400">{row.label}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <FeatureCell value={row.starter}    color={starterColor}    />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <FeatureCell value={row.pro}        color={proColor}        />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center border-l" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <FeatureCell value={row.enterprise} color={enterpriseColor} />
                  </div>
                </div>
              )
            })

            return rows
          })()}

          {/* CTA row */}
          <div className="grid grid-cols-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="px-5 py-5" />
            {TIERS.map(t => (
              <div key={t.name} className="px-4 py-5 border-l" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <Link
                  href={t.href}
                  className="block w-full text-center py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}25` }}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          All plans include a 14-day free trial · SMS overages billed at $0.05 / message · Cancel anytime
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
            <a href="#pricing" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Pricing</a>
            <Link href="/login"  className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sign in</Link>
            <Link href="/signup" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
