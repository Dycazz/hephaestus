import Link from 'next/link'
import Image from 'next/image'
import {
  MessageSquare, CalendarDays, LayoutGrid,
  Check, Zap, Star, ArrowRight, Users, Shield, Plus,
  RefreshCw, ClipboardList, Bell, Phone, X,
  Sparkles, TrendingUp, Timer, MapPin,
} from 'lucide-react'

// ── Data ───────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutGrid,
    title: 'Kanban dispatch board',
    description: 'Drag job cards through status columns — scheduled, confirmed, at risk, complete — all in one view.',
    color: '#d97706',
  },
  {
    icon: MessageSquare,
    title: 'Automated SMS reminders',
    description: 'Customers confirm or reschedule by replying 1 or 2. No manual follow-up, no missed appointments.',
    color: '#34d399',
  },
  {
    icon: CalendarDays,
    title: 'Calendar scheduling',
    description: 'See your full week across every technician at a glance. Click any open slot to book instantly.',
    color: '#60a5fa',
  },
  {
    icon: Star,
    title: 'Automatic review requests',
    description: 'A Google review request fires 2 hours after job completion — while the experience is still fresh.',
    color: '#fbbf24',
  },
  {
    icon: RefreshCw,
    title: 'Recurring appointments',
    description: 'Set daily, weekly, bi-weekly, or monthly repeating jobs and let hephaestus.work handle the schedule.',
    color: '#a78bfa',
  },
  {
    icon: ClipboardList,
    title: 'Prep checklists',
    description: 'Attach per-service default checklists so techs always arrive with the right tools and expectations.',
    color: '#22d3ee',
  },
  {
    icon: Users,
    title: 'Team management',
    description: 'Add technicians, assign jobs, and track who is doing what across your whole crew in real time.',
    color: '#fb7185',
  },
  {
    icon: Bell,
    title: 'Push notifications',
    description: 'Technicians get instant push alerts on the mobile app the moment a job is assigned to them.',
    color: '#c084fc',
  },
  {
    icon: Shield,
    title: 'Role-based access',
    description: 'Owner, dispatcher, and viewer roles keep your data safe and your team focused on their work.',
    color: '#2dd4bf',
  },
]


type FeatureValue = boolean | string | null

interface ComparisonFeature {
  label: string
  starter: FeatureValue
  pro: FeatureValue
  enterprise: FeatureValue
  section?: string
}

const COMPARISON: ComparisonFeature[] = [
  { section: 'Capacity',  label: 'Jobs per month',       starter: '200',        pro: 'Unlimited',       enterprise: 'Unlimited'       },
  {                        label: 'Technicians',           starter: '3',          pro: '5',               enterprise: 'Unlimited'       },
  {                        label: 'SMS per month',         starter: '500',        pro: 'Unlimited',       enterprise: 'Unlimited'       },
  {                        label: 'Team members',          starter: 'Unlimited',  pro: 'Unlimited',       enterprise: 'Unlimited'       },

  { section: 'Scheduling', label: 'Kanban dispatch board', starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Calendar view',         starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Recurring appointments',starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Technician availability',starter: true,       pro: true,              enterprise: true              },
  {                         label: 'Prep checklists',       starter: true,        pro: true,              enterprise: true              },
  {                         label: 'Waitlist management',   starter: true,        pro: true,              enterprise: true              },

  { section: 'Communication', label: 'Automated SMS reminders',  starter: true, pro: true,              enterprise: true              },
  {                             label: 'Two-way customer replies', starter: true, pro: true,              enterprise: true              },
  {                             label: 'Reschedule via SMS',       starter: true, pro: true,              enterprise: true              },
  {                             label: 'SMS review requests',      starter: true, pro: true,              enterprise: true              },
  {                             label: 'Custom Twilio phone number',starter: null, pro: null,             enterprise: true              },

  { section: 'Mobile & Alerts', label: 'Mobile app (iOS & Android)', starter: true, pro: true,          enterprise: true              },
  {                               label: 'Push notifications',         starter: true, pro: true,          enterprise: true              },

  { section: 'Team & Access',  label: 'Role-based access control', starter: true, pro: true,            enterprise: true              },
  {                              label: 'Team invitations',           starter: true, pro: true,            enterprise: true              },
  {                              label: 'Client profiles & history',  starter: true, pro: true,            enterprise: true              },

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
        <X className="w-4 h-4" style={{ color: '#2a2a36' }} />
      </div>
    )
  }
  if (value === true) {
    return (
      <div className="flex justify-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `${color}18` }}>
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
  const starterColor    = '#3b82f6'
  const proColor        = '#a855f7'
  const enterpriseColor = '#f59e0b'

  return (
    <div style={{ color: '#f0ece3', minHeight: '100vh' }}>

      {/* ── Nav ── */}
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(9,9,9,0.88)',
        backdropFilter: 'blur(14px)',
      }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="hephaestus.work" width={32} height={32} className="object-contain" priority />
            <span className="font-display text-base font-bold tracking-tight" style={{ color: '#f0ece3', letterSpacing: '-0.02em' }}>
              hephaestus.work
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#pricing"
              className="text-sm font-medium transition-colors hidden sm:block hover:text-white"
              style={{ color: '#9494a0' }}
            >
              Pricing
            </a>
            <a
              href="mailto:service.hephaestus.work@gmail.com"
              className="text-sm font-medium transition-colors hidden sm:block hover:text-white"
              style={{ color: '#9494a0' }}
            >
              Contact support
            </a>
            <Link
              href="/login"
              className="text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:text-white"
              style={{ color: '#9494a0' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all"
              style={{ background: '#f59e0b' }}
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
              }}
            >
              <Users className="w-3.5 h-3.5" />
              Streamlined field service management
            </div>

            <h1
              className="font-display font-extrabold tracking-tight mb-6"
              style={{
                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: '#ffffff',
              }}
            >
              Dispatch smarter.<br />
              <span style={{ color: '#9494a0' }}>Never miss a job.</span>
            </h1>

            <p
              className="text-lg mb-10 leading-relaxed"
              style={{ color: '#a1a1aa', maxWidth: '36rem' }}
            >
              The all-in-one dispatch platform for HVAC, plumbing, and electrical service crews. 
              Automate scheduling, eliminate paperwork, and grow your revenue with integrated tools.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all bg-amber-500 hover:bg-amber-600"
              >
                Get started for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-colors border border-zinc-800 hover:bg-zinc-800/50"
                style={{ color: '#e4e4e7' }}
              >
                Sign in to dashboard
              </Link>
            </div>

            <p
              className="text-[12px] font-medium mt-6 text-zinc-500"
            >
              14-day free trial · No credit card required
            </p>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div
              className="rounded-2xl p-6 overflow-hidden relative border border-zinc-800 bg-zinc-900/50 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  {['Board', 'Week', 'Day'].map((label, i) => (
                    <div
                      key={label}
                      className="px-4 py-1.5 rounded-md text-[11px] font-medium transition-all"
                      style={i === 0 ? { background: '#f59e0b', color: 'black' } : { color: '#a1a1aa' }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700" />
                  <div className="w-24 h-8 rounded-md bg-zinc-800 border border-zinc-700" />
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { title: 'Confirmed', jobs: [{ name: 'Lopez HVAC', tech: 'Kira', time: '2:30 PM' }] },
                  { title: 'In Progress', jobs: [{ name: 'Harris Plumbing', tech: 'Jalen', time: '4:00 PM' }] },
                  { title: 'At Risk', jobs: [{ name: 'Swift Elec.', tech: 'Mo', time: '5:15 PM' }] },
                ].map((col, i) => (
                  <div key={col.title} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-semibold text-zinc-400">{col.title}</h4>
                      <span className="text-[11px] text-zinc-600 font-medium">{col.jobs.length}</span>
                    </div>
                    {col.jobs.map(job => (
                      <div
                        key={job.name}
                        className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 shadow-sm"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 2 ? '#ef4444' : (i === 1 ? '#eab308' : '#f59e0b') }} />
                          <p className="text-xs font-medium text-zinc-200 truncate">{job.name}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[9px] font-medium text-zinc-400">
                              {job.tech.charAt(0)}
                            </div>
                            <span className="text-[10px] text-zinc-400">{job.tech}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500">{job.time}</span>
                        </div>
                      </div>
                    ))}
                    {i < 2 && (
                      <div className="h-20 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center opacity-50 bg-zinc-900/30">
                        <Plus className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature ticker strip ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="py-4">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-0 flex-wrap">
            {[
              'Kanban board',
              'SMS automation',
              'Calendar view',
              'Review requests',
              'Mobile app',
              'Recurring jobs',
              'Team management',
            ].map((item, i) => (
              <div key={item} className="flex items-center">
                {i > 0 && (
                  <span style={{ color: '#d97706', fontSize: '8px', margin: '0 16px' }}>●</span>
                )}
                <span className="text-xs font-medium" style={{ color: '#3a3a48' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-14">
          <h2
            className="font-display font-bold mb-3"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#f0ece3', letterSpacing: '-0.02em' }}
          >
            Everything your crew needs
          </h2>
          <p style={{ color: '#9494a0', maxWidth: '36rem' }}>
            From the first booking to the final review request — hephaestus.work handles the busywork so your team can focus on the work.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/30 transition-shadow hover:bg-zinc-900/60"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-zinc-800 bg-zinc-950">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100">{f.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-zinc-400">{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="mb-10">
          <h2 className="font-display font-bold mb-3 tracking-tight" style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#f0ece3' }}>
            A comprehensive service workflow
          </h2>
          <p style={{ color: '#9494a0' }}>Automate dispatching, notifications, and customer reviews in one place.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Have Customers Book Through hephaestus.work Portal', icon: Phone, desc: 'Log jobs in 15 seconds. Tag the tech. Send the crew.' },
            { title: 'The Crew Arrives', icon: LayoutGrid, desc: 'Real-time board tracking. No "where are you?" calls needed.' },
            { title: 'The Review Fires', icon: Star, desc: 'Automatic review requests. Grow your reputation while you sleep.' },
          ].map((step, i) => (
            <div key={step.title} className="p-5 rounded-2xl fade-up border border-white/5 hover:bg-white/5 transition-colors" style={{ background: '#0f0f12', animationDelay: `${i * 80}ms` }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(217,119,6,0.12)', color: '#d97706' }}>
                  <step.icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold" style={{ color: '#f0ece3' }}>{step.title}</span>
              </div>
              <p className="text-xs" style={{ color: '#9494a0' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing cards ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16" id="pricing">
        <div className="mb-14">
          <h2
            className="font-display font-bold mb-3 tracking-tight"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.22rem)', color: '#f0ece3', letterSpacing: '-0.04em' }}
          >
            Transparent pricing
          </h2>
          <p style={{ color: '#9494a0' }}>
            Simple plans for every stage of growth. No hidden fees or surprise costs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className="rounded-2xl p-8 flex flex-col relative border border-zinc-800 bg-zinc-900/30 transition-all hover:bg-zinc-900/50"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="font-display text-lg font-bold text-zinc-100">
                  {tier.name}
                </span>
                {tier.highlight && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    Popular
                  </span>
                )}
              </div>

              <p className="text-sm mb-6 text-zinc-400 min-h-[40px]">{tier.description}</p>

              <div className="flex items-baseline gap-1 mb-8">
                <span className="font-display font-extrabold text-3xl text-zinc-50 tracking-tight">
                  {tier.price}
                </span>
                <span className="text-sm text-zinc-500">{tier.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={tier.href}
                className={`block w-full text-center py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tier.highlight 
                    ? 'bg-amber-500 text-black hover:bg-amber-600' 
                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-xs mt-5" style={{ color: '#3a3a48' }}>
          All plans include a 14-day free trial · Cancel anytime · No hidden fees
        </p>
      </section>

      {/* ── Feature comparison table ── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="mb-10">
          <h2
            className="font-display font-bold mb-2"
            style={{ fontSize: '1.5rem', color: '#f0ece3', letterSpacing: '-0.02em' }}
          >
            Compare plans
          </h2>
          <p className="text-sm" style={{ color: '#9494a0' }}>Everything that&apos;s included — side by side.</p>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.06)', background: '#0e0e12' }}
        >
          {/* Table header */}
          <div className="grid grid-cols-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4" />
            {[
              { name: 'Starter',    price: '$24.99', color: starterColor    },
              { name: 'Pro',        price: '$49.99', color: proColor        },
              { name: 'Enterprise', price: '$99.99', color: enterpriseColor },
            ].map(t => (
              <div
                key={t.name}
                className="px-4 py-4 text-center"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="font-display text-sm font-bold" style={{ color: '#f0ece3' }}>{t.name}</p>
                <p className="text-xs font-semibold mt-0.5" style={{ color: t.color }}>
                  {t.price}<span style={{ color: '#3a3a48', fontWeight: 400 }}>/mo</span>
                </p>
              </div>
            ))}
          </div>

          {(() => {
            const rows: React.ReactNode[] = []
            let lastSection = ''

            COMPARISON.forEach((row, i) => {
              if (row.section && row.section !== lastSection) {
                lastSection = row.section
                rows.push(
                  <div
                    key={`section-${row.section}`}
                    className="grid grid-cols-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(217,119,6,0.03)' }}
                  >
                    <div className="col-span-4 px-5 py-2.5">
                      <span
                        className="font-display text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: '#d97706', opacity: 0.7 }}
                      >
                        {row.section}
                      </span>
                    </div>
                  </div>
                )
              }

              const isLast = i === COMPARISON.length - 1
              rows.push(
                <div
                  key={row.label}
                  className="grid grid-cols-4"
                  style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="px-5 py-3 flex items-center">
                    <span className="text-xs" style={{ color: '#9494a0' }}>{row.label}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    <FeatureCell value={row.starter}    color={starterColor}    />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    <FeatureCell value={row.pro}        color={proColor}        />
                  </div>
                  <div className="px-4 py-3 flex items-center justify-center" style={{ borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    <FeatureCell value={row.enterprise} color={enterpriseColor} />
                  </div>
                </div>
              )
            })

            return rows
          })()}

          {/* CTA row */}
          <div className="grid grid-cols-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
            <div className="px-5 py-5" />
            {TIERS.map(t => (
              <div key={t.name} className="px-4 py-5" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                <Link
                  href={t.href}
                  className="block w-full text-center py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: `${t.color}12`, color: t.color, border: `1px solid ${t.color}20` }}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs mt-5" style={{ color: '#3a3a48' }}>
          All plans include a 14-day free trial · SMS overages billed at $0.05 / message · Cancel anytime
        </p>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-display font-bold mb-4 text-3xl tracking-tight text-white">
            Ready to run a tighter ship?
          </h2>
          <p className="mb-8 text-base text-zinc-400">
            Join field service businesses using hephaestus.work to dispatch faster, reduce no-shows, and get more reviews.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-black transition-colors bg-amber-500 hover:bg-amber-600"
          >
            Start your free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-zinc-800 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md overflow-hidden shrink-0" style={{ width: 24, height: 24 }}>
              <Image src="/logo.png" alt="hephaestus.work" width={24} height={24} className="object-contain" />
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-white">hephaestus.work</span>
          </div>
          <p className="text-xs font-medium text-zinc-500">Modern field service management</p>
          <div className="flex flex-wrap justify-center md:items-center gap-6">
            <a href="mailto:service.hephaestus.work@gmail.com" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Contact Support</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors">Get started</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
