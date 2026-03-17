import Link from 'next/link'
import {
  MessageSquare,
  CalendarDays,
  LayoutGrid,
  Check,
  Zap,
  Star,
  ArrowRight,
  Users,
  Shield,
  RefreshCw,
  ClipboardList,
  Bell,
  Phone,
  X,
  Sparkles,
  TrendingUp,
  Timer,
  MapPin,
} from 'lucide-react'

const FEATURES = [
  {
    title: 'Dispatch board that actually moves work',
    description:
      'Drag jobs, notify techs, and keep the day on track without toggling between tools.',
    icon: LayoutGrid,
  },
  {
    title: 'Review requests on autopilot',
    description:
      'Two-hour follow ups that lift local rankings and make great work visible.',
    icon: Star,
  },
  {
    title: 'No-show recovery in minutes',
    description:
      'Reschedule texts and waitlist nudges that recover revenue without extra admin time.',
    icon: RefreshCw,
  },
  {
    title: 'Smart reminders that get replies',
    description:
      'Personalized, branded messages that confirm appointments and reduce cancellations.',
    icon: MessageSquare,
  },
  {
    title: 'Availability that makes sense',
    description:
      'Set custom hours and block time without fighting a calendar grid.',
    icon: CalendarDays,
  },
  {
    title: 'Reports the team reads',
    description:
      'See week performance, booking velocity, and technician load at a glance.',
    icon: ClipboardList,
  },
]

const STATS = [
  { label: 'Avg. response time', value: '4 min' },
  { label: 'Revenue recovered', value: '+18%' },
  { label: 'No-show rate', value: '-32%' },
  { label: 'Reviews/month', value: '+54' },
]

type PlanValue = boolean | string | null

const PLAN_COMPARE: Array<{
  section?: string
  label: string
  starter: PlanValue
  pro: PlanValue
  enterprise: PlanValue
}> = [
  { section: 'Capacity', label: 'Jobs per month', starter: '200', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Technicians', starter: '3', pro: '5', enterprise: 'Unlimited' },
  { label: 'SMS per month', starter: '500', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Team members', starter: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
  { section: 'Scheduling', label: 'Dispatch board', starter: true, pro: true, enterprise: true },
  { label: 'Calendar view', starter: true, pro: true, enterprise: true },
  { label: 'Recurring appointments', starter: true, pro: true, enterprise: true },
  { label: 'Technician availability', starter: true, pro: true, enterprise: true },
  { label: 'Prep checklists', starter: true, pro: true, enterprise: true },
  { label: 'Waitlist recovery', starter: true, pro: true, enterprise: true },
  { section: 'Communication', label: 'Automated SMS reminders', starter: true, pro: true, enterprise: true },
  { label: 'Two-way replies', starter: true, pro: true, enterprise: true },
  { label: 'Reschedule via SMS', starter: true, pro: true, enterprise: true },
  { label: 'Review requests', starter: true, pro: true, enterprise: true },
  { label: 'Custom Twilio number', starter: null, pro: null, enterprise: true },
  { section: 'Mobile & Alerts', label: 'Mobile app (iOS + Android)', starter: true, pro: true, enterprise: true },
  { label: 'Push notifications', starter: true, pro: true, enterprise: true },
  { section: 'Team & Access', label: 'Role-based access', starter: true, pro: true, enterprise: true },
  { label: 'Team invitations', starter: true, pro: true, enterprise: true },
  { label: 'Client profiles', starter: true, pro: true, enterprise: true },
  { section: 'Support', label: 'Email support', starter: true, pro: true, enterprise: true },
  { label: 'Priority support', starter: null, pro: true, enterprise: true },
  { label: 'Dedicated account manager', starter: null, pro: null, enterprise: true },
  { label: 'SLA guarantee', starter: null, pro: null, enterprise: true },
]

const TIERS = [
  {
    name: 'Starter',
    price: '$24.99',
    cadence: '/mo',
    description: 'For solo operators and small crews getting started.',
    cta: 'Start with Starter',
    features: [
      '200 jobs per month',
      '3 technicians',
      '500 SMS per month',
      'Dispatch board + calendar view',
      'Automated SMS reminders',
      'Review request flow',
    ],
  },
  {
    name: 'Pro',
    price: '$49.99',
    cadence: '/mo',
    description: 'For growing teams that need more automation.',
    cta: 'Start with Pro',
    highlight: true,
    features: [
      'Unlimited jobs',
      '5 technicians',
      'Unlimited SMS',
      'Everything in Starter',
      'Waitlist recovery',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: '$99.99',
    cadence: '/mo',
    description: 'For larger operations that need white-glove support.',
    cta: 'Start with Enterprise',
    features: [
      'Unlimited technicians',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom Twilio number',
      'Advanced reporting',
    ],
  },
]

function FeatureCell({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: typeof LayoutGrid
}) {
  return (
    <div className="group rounded-2xl border border-orange-500/20 bg-gradient-to-br from-white/5 to-transparent p-6 transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/60 hover:shadow-[0_30px_60px_-30px_rgba(249,115,22,0.8)]">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/15 text-orange-400 transition-all duration-300 group-hover:bg-orange-500/30 group-hover:text-orange-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{description}</p>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600" />
            <div>
              <p className="text-sm font-semibold text-orange-400">Hephaestus</p>
              <p className="text-xs text-white/50">Dispatch</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
            <a className="transition hover:text-white" href="#features">
              Features
            </a>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-white/70 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 right-0 h-96 w-96 rounded-full bg-orange-500/20 blur-[140px]" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-orange-400/10 blur-[120px]" />
        </div>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
              <Sparkles className="h-3 w-3" />
              <span>Built for local service teams</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
              The operations cockpit that keeps your dispatch calm, your techs moving,
              and your customers informed.
            </h1>
            <p className="max-w-xl text-lg text-white/70">
              Hephaestus turns chaos into momentum with a live dispatch board, automated SMS,
              and a booking portal that converts. No more chasing confirmations or juggling
              spreadsheets.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-orange-400 hover:text-white"
              >
                See the product
                <Zap className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-400" />
                <span>Used by dispatch teams nationwide</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-400" />
                <span>Secure by default</span>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 right-6 hidden rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs text-white/70 shadow-[0_20px_40px_-30px_rgba(249,115,22,0.9)] lg:block">
              Reviews up <span className="text-orange-400">+52%</span>
            </div>
            <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-white/5 to-transparent p-6 shadow-[0_40px_80px_-60px_rgba(249,115,22,0.9)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Live dispatch</p>
                  <p className="text-xs text-white/50">Wednesday, 9:32 AM</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Timer className="h-4 w-4 text-orange-400" />
                  <span>Avg arrival 22 min</span>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  {
                    title: 'Water heater install',
                    tech: 'Mia Torres',
                    status: 'En route',
                    time: '10:15 AM',
                  },
                  {
                    title: 'Emergency leak',
                    tech: 'Ryan Chen',
                    status: 'Confirmed',
                    time: '10:45 AM',
                  },
                  {
                    title: 'Drain inspection',
                    tech: 'Sam Patel',
                    status: 'Scheduled',
                    time: '12:30 PM',
                  },
                ].map((job) => (
                  <div
                    key={job.title}
                    className="rounded-2xl border border-white/10 bg-black/60 px-4 py-3 transition hover:border-orange-500/40"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{job.title}</p>
                        <p className="text-xs text-white/50">{job.tech}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-orange-400">{job.status}</p>
                        <p className="text-xs text-white/50">{job.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-white/60">
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-orange-400" />
                    <span>3 in route</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-orange-400" />
                    <span>12 confirmations</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    <span>+18% week</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-black/60">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/60 p-4">
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
              <p className="text-xs text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-white/10 bg-black/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs uppercase tracking-[0.3em] text-white/40">
          <span>Dispatch</span>
          <span>Scheduling</span>
          <span>Automation</span>
          <span>Review Growth</span>
          <span>Payments</span>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-400">Core features</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Everything you need to run a modern service operation
            </h2>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-300 transition hover:text-orange-200"
          >
            View product tour
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <FeatureCell key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 pt-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-orange-500/30 bg-gradient-to-br from-white/5 to-transparent p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-400">How it works</p>
          <h3 className="mt-4 text-2xl font-semibold text-white">Every appointment, handled</h3>
          <p className="mt-3 text-sm text-white/70">
            Confirmations, reminders, and reviews are automated so your team stays focused
            on the job, not the phone.
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                title: 'Customer books online',
                copy: 'Portal captures service details and preferred tech.',
                icon: Phone,
              },
              {
                title: 'Dispatch stays live',
                copy: 'Board updates everyone instantly with automated texts.',
                icon: Bell,
              },
              {
                title: 'Follow-ups run themselves',
                copy: 'No-shows recover, reviews flow in, and revenue stays steady.',
                icon: RefreshCw,
              },
            ].map((step) => (
              <div key={step.title} className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-orange-500/20 p-2 text-orange-300">
                  <step.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="text-xs text-white/60">{step.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4">
          {[
            {
              title: 'Jobs confirmed',
              stat: '94%',
              copy: 'Confirmation rate with SMS automation.',
              icon: MessageSquare,
            },
            {
              title: 'Faster schedule fill',
              stat: '2.4x',
              copy: 'Waitlist nudges fill canceled slots quickly.',
              icon: Users,
            },
            {
              title: 'Less admin work',
              stat: '-11 hrs',
              copy: 'Weekly time saved per dispatcher.',
              icon: Timer,
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-white/10 bg-black/60 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">{card.title}</p>
                  <p className="text-3xl font-semibold text-white">{card.stat}</p>
                </div>
                <div className="rounded-full bg-orange-500/15 p-3 text-orange-300">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-white/50">{card.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-orange-400">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Plans that scale with your team</h2>
          <p className="mt-3 text-sm text-white/60">
            Transparent pricing. Cancel anytime. No long-term contracts.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={[
                'relative rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1',
                tier.highlight
                  ? 'border-orange-500 bg-gradient-to-br from-orange-500/15 to-transparent shadow-[0_40px_80px_-60px_rgba(249,115,22,0.8)]'
                  : 'border-white/10 bg-black/70',
              ].join(' ')}
            >
              {tier.highlight && (
                <div className="absolute -top-4 left-6 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-black">
                  Most popular
                </div>
              )}
              <p className="text-lg font-semibold text-white">{tier.name}</p>
              <p className="mt-2 text-3xl font-semibold text-white">
                {tier.price}
                <span className="text-sm text-white/50">{tier.cadence}</span>
              </p>
              <p className="mt-2 text-sm text-white/60">{tier.description}</p>
              <Link
                href="/login"
                className={[
                  'mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
                  tier.highlight
                    ? 'bg-orange-500 text-black hover:bg-orange-400'
                    : 'border border-white/10 text-white/80 hover:border-orange-500/60 hover:text-white',
                ].join(' ')}
              >
                {tier.cta}
              </Link>
              <ul className="mt-6 space-y-3 text-sm text-white/70">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2">
                    <Check className="mt-1 h-4 w-4 text-orange-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-black/70">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] border-b border-white/10 px-6 py-4 text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Feature</span>
            <span>Starter</span>
            <span>Pro</span>
            <span>Enterprise</span>
          </div>
          {PLAN_COMPARE.map((row) => (
            <div
              key={`${row.section ?? 'row'}-${row.label}`}
              className="border-b border-white/10 px-6 py-4 text-sm text-white/70 last:border-b-0"
            >
              {row.section && (
                <div className="mb-2 text-xs uppercase tracking-[0.28em] text-orange-300">
                  {row.section}
                </div>
              )}
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center">
                <span>{row.label}</span>
                {[row.starter, row.pro, row.enterprise].map((value, idx) => (
                  <span key={`${row.label}-${idx}`}>
                    {value === true && <Check className="h-4 w-4 text-orange-400" />}
                    {value === null && <X className="h-4 w-4 text-white/30" />}
                    {typeof value === 'string' && <span>{value}</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20" id="faq">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              q: 'Can we keep our existing phone number?',
              a: 'Yes. We can port numbers or use your existing business line for outbound texting.',
            },
            {
              q: 'How long does onboarding take?',
              a: 'Most teams are live within 48 hours with guided setup and template imports.',
            },
            {
              q: 'Does it work on mobile?',
              a: 'Absolutely. Dispatchers, techs, and owners can manage schedules from any device.',
            },
            {
              q: 'Do you integrate with payment processors?',
              a: 'Yes. Stripe is supported today and additional gateways are available on request.',
            },
          ].map((item) => (
            <div key={item.q} className="rounded-2xl border border-white/10 bg-black/60 p-6">
              <p className="text-sm font-semibold text-white">{item.q}</p>
              <p className="mt-2 text-sm text-white/60">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent px-6 py-10 text-center md:flex-row md:text-left">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-orange-300">Ready to roll?</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              See how calm dispatch can feel in a week.
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Start trial
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-orange-400 hover:text-white"
            >
              Talk to sales
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-xs text-white/50 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600" />
            <span>Hephaestus.work</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Support</span>
            <span>Security</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
