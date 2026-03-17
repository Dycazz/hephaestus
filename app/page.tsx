import Link from 'next/link'
import { ArrowRight, Bell, CalendarDays, Check, LayoutGrid, MessageSquare, Shield, Zap } from 'lucide-react'

const FEATURES = [
  {
    title: 'Live dispatch board',
    description: 'Drag jobs, track techs, and keep the day moving.',
    icon: LayoutGrid,
  },
  {
    title: 'Branded SMS',
    description: 'Confirmations and reminders that get replies.',
    icon: MessageSquare,
  },
  {
    title: 'Smart reschedule',
    description: 'Waitlists and nudges that recover revenue fast.',
    icon: CalendarDays,
  },
  {
    title: 'Reliable by default',
    description: 'Audit logs, role access, and secure data handling.',
    icon: Shield,
  },
]

const FLOW = [
  {
    title: 'Book',
    copy: 'Customers pick a window and share details quickly.',
    icon: CalendarDays,
  },
  {
    title: 'Dispatch',
    copy: 'Board updates with automated tech alerts.',
    icon: Bell,
  },
  {
    title: 'Follow up',
    copy: 'Confirmations and reviews stay consistent.',
    icon: MessageSquare,
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$24.99',
    cadence: '/mo',
    description: 'Small crews and solo operators.',
    cta: 'Start Starter',
    features: ['200 jobs', '3 techs', '500 SMS', 'Dispatch + calendar'],
  },
  {
    name: 'Pro',
    price: '$49.99',
    cadence: '/mo',
    description: 'Growing teams that need automation.',
    cta: 'Start Pro',
    highlight: true,
    features: ['Unlimited jobs', '5 techs', 'Unlimited SMS', 'Waitlist recovery'],
  },
  {
    name: 'Enterprise',
    price: '$99.99',
    cadence: '/mo',
    description: 'Larger ops with dedicated support.',
    cta: 'Talk to sales',
    features: ['Unlimited techs', 'Custom number', 'SLA guarantee', 'Advanced reporting'],
  },
]

function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description: string
  icon: typeof LayoutGrid
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-black/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/60">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/15 text-orange-300 transition group-hover:bg-orange-500/30">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{description}</p>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600" />
            <p className="text-sm font-semibold text-orange-400">Hephaestus</p>
          </div>
          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.28em] text-white/50 md:flex">
            <a className="transition hover:text-white" href="#product">
              Product
            </a>
            <a className="transition hover:text-white" href="#pricing">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-orange-500/18 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-orange-400/8 blur-[140px]" />
          <div className="absolute inset-0 opacity-40 [background:radial-gradient(circle_at_top,rgba(249,115,22,0.18),transparent_55%)]" />
        </div>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-200">
              <Zap className="h-3 w-3" />
              Built for field service
            </div>
            <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
              Dispatch operations that feel calm, even on the busiest day.
            </h1>
            <p className="max-w-xl text-base text-white/65">
              Hephaestus keeps every job moving with a live board, automated SMS, and a
              booking portal built for service teams.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-orange-400 hover:text-white"
              >
                See the product
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-xs uppercase tracking-[0.28em] text-white/45">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-400" />
                Secure by default
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-orange-500/30 bg-black/70 p-6 shadow-[0_40px_80px_-60px_rgba(249,115,22,0.8)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Dispatch board</p>
                  <p className="text-sm font-semibold text-white">Wednesday, 9:32 AM</p>
                </div>
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60">
                  Live
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[
                  { title: 'Water heater install', tech: 'Mia Torres', status: 'En route', time: '10:15 AM' },
                  { title: 'Emergency leak', tech: 'Ryan Chen', status: 'Confirmed', time: '10:45 AM' },
                  { title: 'Drain inspection', tech: 'Sam Patel', status: 'Scheduled', time: '12:30 PM' },
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
                {[
                  { label: '3 in route', icon: LayoutGrid },
                  { label: '12 confirmations', icon: MessageSquare },
                  { label: 'Next up', icon: ArrowRight },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-white/10 bg-black/50 p-3">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-orange-400" />
                      <span>{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-400">Product</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">
              Focused tools for focused teams.
            </h2>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-300 transition hover:text-orange-200"
          >
            View product tour
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section id="flow" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-white/10 bg-black/60 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-400">Flow</p>
          <h3 className="mt-4 text-2xl font-semibold text-white">From booking to follow-up.</h3>
          <p className="mt-3 text-sm text-white/60">
            Keep the day moving with a clear, automated loop.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {FLOW.map((step) => (
              <div key={step.title} className="rounded-2xl border border-white/10 bg-black/70 p-6">
                <div className="mb-4 inline-flex rounded-full bg-orange-500/20 p-2 text-orange-300">
                  <step.icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="mt-2 text-xs text-white/60">{step.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-400">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">Plans that scale cleanly.</h2>
          <p className="mt-3 text-sm text-white/60">Transparent pricing. Cancel anytime.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((tier) => (
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
                <div className="absolute -top-4 left-6 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black">
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
                  'mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition',
                  tier.highlight
                    ? 'bg-orange-500 text-black hover:bg-orange-400'
                    : 'border border-white/10 text-white/70 hover:border-orange-500/60 hover:text-white',
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
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-orange-500/40 bg-gradient-to-r from-orange-500/15 via-orange-500/5 to-transparent px-6 py-10 text-center md:flex-row md:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-orange-300">Ready when you are</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              See a calmer dispatch week in seven days.
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-orange-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Start trial
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/20 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-orange-400 hover:text-white"
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
          <div className="flex items-center gap-6 uppercase tracking-[0.25em] text-white/40">
            <span>Support</span>
            <span>Security</span>
            <span>Terms</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
