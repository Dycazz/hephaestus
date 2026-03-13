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
    color: '#f97316',
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
    description: 'Set daily, weekly, bi-weekly, or monthly repeating jobs and let Hephaestus handle the schedule.',
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
    color: '#60a5fa',
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
    color: '#f97316',
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
    color: '#fbbf24',
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
  const starterColor    = '#60a5fa'
  const proColor        = '#f97316'
  const enterpriseColor = '#fbbf24'

  return (
    <div style={{ background: '#090909', color: '#f0ece3', minHeight: '100vh' }}>

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
          <div className="flex items-center gap-2.5">
            <div className="bg-white rounded-lg overflow-hidden flex items-center justify-center shrink-0" style={{ width: 30, height: 30 }}>
              <Image src="/logo.png" alt="Hephaestus" width={26} height={26} className="object-contain" priority />
            </div>
            <span className="font-display text-sm font-bold tracking-tight" style={{ color: '#f0ece3', letterSpacing: '-0.01em' }}>
              Hephaestus
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="#pricing"
              className="text-sm font-medium transition-colors hidden sm:block"
              style={{ color: '#9494a0' }}
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-sm font-medium transition-colors px-3 py-1.5 rounded-lg"
              style={{ color: '#9494a0' }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-1.5 rounded-lg transition-all"
              style={{ background: '#f97316', boxShadow: '0 2px 12px rgba(249,115,22,0.3)' }}
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-24">
        {/* Forge radial glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: '900px',
            height: '500px',
            background: 'radial-gradient(ellipse 700px 400px at 50% 0%, rgba(249,115,22,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="max-w-3xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 fade-up"
            style={{
              background: 'rgba(249,115,22,0.1)',
              border: '1px solid rgba(249,115,22,0.25)',
              color: '#fb923c',
              animationDelay: '0ms',
            }}
          >
            <Zap className="w-3 h-3" />
            Built for field service businesses
          </div>

          <h1
            className="font-display font-extrabold tracking-tight mb-6 fade-up"
            style={{
              fontSize: 'clamp(2.8rem, 6vw, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: '#f0ece3',
              animationDelay: '80ms',
            }}
          >
            Dispatch smarter.<br />
            <span style={{ color: '#f97316' }}>Never miss a job.</span>
          </h1>

          <p
            className="text-lg mb-10 leading-relaxed fade-up"
            style={{ color: '#9494a0', maxWidth: '36rem', animationDelay: '160ms' }}
          >
            Hephaestus is the all-in-one dispatch platform for plumbers, HVAC techs, electricians, and field crews.
            Schedule jobs, send automated SMS reminders, and collect Google reviews — all in one place.
          </p>

          <div
            className="flex flex-col sm:flex-row items-start gap-3 fade-up"
            style={{ animationDelay: '240ms' }}
          >
            <Link
              href="/signup"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #ea580c, #f97316)',
                boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
              }}
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-base font-medium transition-colors"
              style={{ color: '#9494a0', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Sign in to your account
            </Link>
          </div>

          <p
            className="text-xs mt-5 fade-up"
            style={{ color: '#3a3a48', animationDelay: '300ms' }}
          >
            No credit card required · 14-day free trial included
          </p>
        </div>
      </section>

      {/* ── Feature ticker strip ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="py-4">
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
                  <span style={{ color: '#f97316', fontSize: '8px', margin: '0 16px' }}>●</span>
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
            From the first booking to the final review request — Hephaestus handles the busywork so your team can focus on the work.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="p-5 rounded-xl fade-up"
                style={{
                  background: '#111114',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: `2px solid ${f.color}`,
                  animationDelay: `${i * 60}ms`,
                }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <Icon className="w-4 h-4 shrink-0" style={{ color: f.color }} />
                  <h3 className="text-sm font-semibold" style={{ color: '#f0ece3' }}>{f.title}</h3>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#9494a0' }}>{f.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Pricing cards ── */}
      <section className="max-w-6xl mx-auto px-6 pb-16" id="pricing">
        <div className="mb-14">
          <h2
            className="font-display font-bold mb-3"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', color: '#f0ece3', letterSpacing: '-0.02em' }}
          >
            Simple, honest pricing
          </h2>
          <p style={{ color: '#9494a0' }}>
            Start free for 14 days. No credit card required. Upgrade when your business grows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className="rounded-2xl p-6 flex flex-col relative"
              style={{
                background: tier.highlight
                  ? 'linear-gradient(145deg, #15120d, #1c1409)'
                  : '#111114',
                border: tier.highlight
                  ? `1px solid rgba(249,115,22,0.35)`
                  : '1px solid rgba(255,255,255,0.05)',
                boxShadow: tier.highlight
                  ? '0 8px 40px rgba(249,115,22,0.12)'
                  : undefined,
              }}
            >
              {tier.highlight && (
                <div
                  className="inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{
                    background: 'rgba(249,115,22,0.15)',
                    color: '#f97316',
                    border: '1px solid rgba(249,115,22,0.3)',
                  }}
                >
                  Most popular
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: `${tier.color}15` }}
                >
                  <Zap className="w-3.5 h-3.5" style={{ color: tier.color }} />
                </div>
                <span
                  className="font-display text-sm font-bold"
                  style={{ color: '#f0ece3', letterSpacing: '-0.01em' }}
                >
                  {tier.name}
                </span>
              </div>

              <p className="text-xs mb-5" style={{ color: '#9494a0' }}>{tier.description}</p>

              <div className="flex items-baseline gap-1 mb-6">
                <span
                  className="font-display font-extrabold"
                  style={{ fontSize: '2.25rem', color: '#f0ece3', letterSpacing: '-0.04em' }}
                >
                  {tier.price}
                </span>
                <span className="text-sm" style={{ color: '#3a3a48' }}>{tier.period}</span>
              </div>

              <ul className="space-y-2.5 mb-7 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs" style={{ color: '#9494a0' }}>
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
                    ? {
                        background: 'linear-gradient(135deg, #ea580c, #f97316)',
                        color: 'white',
                        boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                      }
                    : {
                        background: `${tier.color}10`,
                        color: tier.color,
                        border: `1px solid ${tier.color}20`,
                      }
                }
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
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(249,115,22,0.03)' }}
                  >
                    <div className="col-span-4 px-5 py-2.5">
                      <span
                        className="font-display text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: '#f97316', opacity: 0.7 }}
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
      <section
        className="py-20"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, #0e0c09 0%, #090909 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6">
          <h2
            className="font-display font-bold mb-4"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#f0ece3', letterSpacing: '-0.03em' }}
          >
            Ready to run a tighter ship?
          </h2>
          <p className="mb-8" style={{ color: '#9494a0' }}>
            Join field service businesses using Hephaestus to dispatch faster, reduce no-shows, and get more reviews.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #ea580c, #f97316)',
              boxShadow: '0 4px 24px rgba(249,115,22,0.3)',
            }}
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#090909' }} className="py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md overflow-hidden shrink-0" style={{ width: 20, height: 20 }}>
              <Image src="/logo.png" alt="Hephaestus" width={20} height={20} className="object-contain" />
            </div>
            <span className="font-display text-xs font-semibold" style={{ color: '#3a3a48' }}>Hephaestus</span>
          </div>
          <p className="text-xs" style={{ color: '#3a3a48' }}>Field service dispatch, done right.</p>
          <div className="flex items-center gap-5">
            <a href="#pricing" className="text-xs transition-colors" style={{ color: '#3a3a48' }}>Pricing</a>
            <Link href="/login"  className="text-xs transition-colors" style={{ color: '#3a3a48' }}>Sign in</Link>
            <Link href="/signup" className="text-xs transition-colors" style={{ color: '#3a3a48' }}>Sign up</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
