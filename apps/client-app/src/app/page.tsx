import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 pt-safe py-4">
        <span className="font-display text-2xl font-semibold tracking-tight text-primary">
          Travel Bug
        </span>
        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="ghost">Log in</Button>
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-10 md:pt-16">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-90"
            style={{
              background:
                'linear-gradient(165deg, #0d5c63 0%, #0a3d42 45%, #1a2e2b 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-30"
            style={{
              backgroundImage:
                'radial-gradient(circle at 70% 30%, #e8a838 0%, transparent 40%)',
            }}
          />
          <div className="mx-auto max-w-5xl text-primary-foreground">
            <p className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              Travel Bug
            </p>
            <h1 className="mt-4 max-w-xl text-xl font-medium text-white/90 md:text-2xl">
              The AI pocket travel app for solo explorers and agencies who care about the
              details.
            </h1>
            <p className="mt-4 max-w-lg text-base text-white/70">
              Vault your tickets, follow a day-by-day timeline, and chat with a concierge
              that knows your trip — not a generic chatbot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  Start free trial
                </Button>
              </Link>
              <Link href="/register?path=agency">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  I have an agency invite
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-10 px-5 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold text-foreground">
              For individuals
            </h2>
            <p className="mt-3 text-muted-foreground">
              Monthly access to your personal vault, itinerary timeline, and AI chat —
              built for phones, usable on the web while you plan.
            </p>
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold text-foreground">
              For travel agencies
            </h2>
            <p className="mt-3 text-muted-foreground">
              Invite clients with a code. They get a free pass for the trip window plus
              one month prior — white-glove pocket guides at scale.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
        Travel Bug · Working POC · Mock billing & AI
      </footer>
    </div>
  );
}
