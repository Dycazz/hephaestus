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
    color: '#d97706',
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
  const proColor        = '#d97706'
  const enterpriseColor = '#fbbf24'

  return (
    <div style={{ background: '#0f1115', color: '#f0ece3', minHeight: '100vh' }}>

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
              className="animate-shimmer flex items-center gap-1.5 text-sm font-semibold text-black px-4 py-1.5 rounded-lg transition-all hover:bg-amber-500"
              style={{ background: '#d97706', boxShadow: '0 2px 12px rgba(217,119,6,0.25)' }}
            >
              Get started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-6 pt-28 pb-20 relative">
        {/* Forge radial glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            width: '900px',
            height: '520px',
            background: 'radial-gradient(ellipse 700px 420px at 50% 0%, rgba(217,119,6,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8 fade-up"
              style={{
                background: 'rgba(217,119,6,0.1)',
                border: '1px solid rgba(217,119,6,0.25)',
                color: '#fb923c',
                animationDelay: '0ms',
              }}
            >
              <Sparkles className="w-3 h-3" />
              Streamlined field service management
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
              <span style={{ color: '#d97706' }}>Never miss a job.</span>
            </h1>

            <p
              className="text-lg mb-10 leading-relaxed fade-up"
              style={{ color: '#9494a0', maxWidth: '36rem', animationDelay: '160ms' }}
            >
              The all-in-one dispatch platform for HVAC, plumbing, and electrical service crews. 
              Automate scheduling, eliminate paperwork, and grow your revenue with integrated tools.
            </p>

            <div
              className="flex flex-col sm:flex-row items-start gap-4 fade-up"
              style={{ animationDelay: '240ms' }}
            >
              <Link
                href="/signup"
                className="animate-shimmer flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-black transition-all hover:bg-amber-500"
                style={{
                  background: '#d97706',
                  boxShadow: '0 4px 20px rgba(217,119,6,0.3)',
                }}
              >
                Get started for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-medium transition-colors border border-white/5 hover:bg-white/5"
                style={{ color: '#9494a0' }}
              >
                Sign in to dashboard
              </Link>
            </div>

            <p
              className="text-[11px] font-medium mt-6 fade-up uppercase tracking-widest"
              style={{ color: '#3a3a48', animationDelay: '300ms' }}
            >
              14-day free trial · no credit card · zero bloat
            </p>
          </div>

          {/* Hero visual */}
          <div className="relative fade-up animate-float" style={{ animationDelay: '200ms' }}>
            {/* Forge Beams */}
            <div className="absolute -inset-20 blur-[100px] pointer-events-none opacity-20">
              <div className="absolute top-0 left-1/4 w-1/2 h-full bg-amber-600/20" style={{ animation: 'beamShift 8s infinite ease-in-out' }} />
              <div className="absolute bottom-0 right-1/4 w-1/3 h-2/3 bg-orange-600/10" style={{ animation: 'beamShift 12s infinite ease-in-out reverse' }} />
            </div>

            <div
              className="rounded-3xl p-6 overflow-hidden relative"
              style={{
                background: '#0f1115',
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 25px 80px -20px rgba(0,0,0,0.6)',
              }}
            >
              {/* Header / Toggle bar */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
                  {['Board', 'Week', 'Day'].map((label, i) => (
                    <div
                      key={label}
                      className="px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                      style={i === 0 ? { background: 'rgba(217,119,6,0.15)', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' } : { color: '#3a3a48' }}
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
                  <div className="w-24 h-8 rounded-xl bg-amber-600/10 border border-amber-600/20" />
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="grid grid-cols-3 gap-6">
                {[
                  { title: 'Confirmed', jobs: [{ name: 'Lopez HVAC', tech: 'Kira', time: '2:30 PM' }] },
                  { title: 'In Progress', jobs: [{ name: 'Harris Plumbing', tech: 'Jalen', time: '4:00 PM' }] },
                  { title: 'At Risk', jobs: [{ name: 'Swift Elec.', tech: 'Mo', time: '5:15 PM' }] },
                ].map((col, i) => (
                  <div key={col.title} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#3a3a48]">{col.title}</h4>
                      <span className="text-[10px] text-white/10">{col.jobs.length}</span>
                    </div>
                    {col.jobs.map(job => (
                      <div
                        key={job.name}
                        className="p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-default"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderColor: i === 2 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          animation: i === 1 ? 'pulse-glow 4s infinite' : undefined
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: i === 2 ? '#ef4444' : '#d97706' }} />
                          <p className="text-xs font-bold text-white truncate">{job.name}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[8px] font-bold text-[#9494a0]">
                              {job.tech.charAt(0)}
                            </div>
                            <span className="text-[10px] text-[#3a3a48]">{job.tech}</span>
                          </div>
                          <span className="text-[10px] font-medium text-[#9494a0]">{job.time}</span>
                        </div>
                      </div>
                    ))}
                    {i < 2 && (
                      <div className="h-24 rounded-2xl border border-dashed border-white/5 flex items-center justify-center opacity-30">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Dashboard Glow */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 12% -10%, rgba(217,119,6,0.05), transparent 40%)',
                }}
              />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={f.title}
                className="p-5 rounded-xl fade-up hover-glow"
                style={{
                  background: '#14171d',
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
            { title: 'Booked through the hephaestus.work portal', icon: Phone, desc: 'Log jobs in 15 seconds. Tag the tech. Send the crew.' },
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {TIERS.map(tier => (
            <div
              key={tier.name}
              className="rounded-2xl p-6 flex flex-col relative hover-glow group"
              style={{
                background: tier.highlight
                  ? 'linear-gradient(145deg, #15120d, #1c1409)'
                  : '#14171d',
                border: tier.highlight
                  ? `1px solid rgba(217,119,6,0.35)`
                  : '1px solid rgba(255,255,255,0.05)',
                boxShadow: tier.highlight
                  ? '0 8px 40px rgba(217,119,6,0.12)'
                  : undefined,
              }}
            >
              {tier.highlight && (
                <div
                  className="inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{
                    background: 'rgba(217,119,6,0.15)',
                    color: '#d97706',
                    border: '1px solid rgba(217,119,6,0.3)',
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
                        background: 'linear-gradient(135deg, #c2410c, #d97706)',
                        color: 'white',
                        boxShadow: '0 4px 16px rgba(217,119,6,0.3)',
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
      <section
        className="py-20"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, #161920 0%, #0f1115 100%)',
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
            Join field service businesses using hephaestus.work to dispatch faster, reduce no-shows, and get more reviews.
          </p>
          <Link
            href="/signup"
            className="animate-shimmer inline-flex items-center gap-2 px-10 py-4 rounded-xl text-base font-bold text-black transition-all hover:bg-amber-500"
            style={{
              background: '#d97706',
              boxShadow: '0 4px 24px rgba(217,119,6,0.3)',
            }}
          >
            Start your free trial
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#0f1115' }} className="py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-white rounded-md overflow-hidden shrink-0" style={{ width: 20, height: 20 }}>
              <Image src="/logo.png" alt="hephaestus.work" width={20} height={20} className="object-contain" />
            </div>
            <span className="font-display text-xs font-bold tracking-widest uppercase" style={{ color: '#3a3a48' }}>hephaestus.work</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#2a2a36' }}>Modern field service management</p>
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
