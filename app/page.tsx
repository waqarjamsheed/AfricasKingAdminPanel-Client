/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';

export default function HomePage() {
  const allowRegistration = true;
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white px-6 py-16 shadow-soft">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,.6),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(239,68,68,.4),transparent_40%)]" />
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="h-full w-full bg-[linear-gradient(0deg,transparent_24%,rgba(255,255,255,.06)_25%,rgba(255,255,255,.06)_26%,transparent_27%),linear-gradient(90deg,transparent_24%,rgba(255,255,255,.06)_25%,rgba(255,255,255,.06)_26%,transparent_27%)] bg-[size:40px_40px] opacity-10" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <img src="/icon.png" alt="AfricasKing" className="h-8 w-8" />
            <span className="text-sm uppercase tracking-widest text-primary-300">AfricasKing</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">Unlimited Entertainment. One Subscription.</h1>
          <p className="mt-3 text-gray-300 text-lg">Live channels and on‑demand content in one place. Stream instantly on any device with secure payments.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold">
              Get Started
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-3 font-semibold hover:bg-white/15">
              Login
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-300">
            <span className="rounded-full bg-white/10 px-3 py-1">Live TV</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Movies</span>
            <span className="rounded-full bg-white/10 px-3 py-1">Series</span>
            <span className="rounded-full bg-white/10 px-3 py-1">24/7 Support</span>
          </div>
          <p className="mt-4 text-xs text-gray-400">Already a member? <Link className="underline" href="/login">Login here</Link>.</p>
        </div>
      </section>

      {/* Devices / Preview */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-soft">
          <h3 className="text-xl font-semibold">Watch anywhere</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">TV, mobile, tablet, and browser. Switch devices and continue where you left off.</p>
          <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg border border-black/5 dark:border-white/10 bg-gradient-to-br from-gray-800 to-gray-900 relative">
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-16 w-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                <div className="ml-1 h-0 w-0 border-y-8 border-y-transparent border-l-[14px] border-l-white" />
              </div>
            </div>
            <div className="absolute right-3 bottom-3 flex gap-2 text-[10px]">
              <span className="rounded bg-black/50 px-2 py-1 text-white">HD</span>
              <span className="rounded bg-black/50 px-2 py-1 text-white">Dolby</span>
              <span className="rounded bg-black/50 px-2 py-1 text-white">5.1</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1">Smart TV</span>
            <span className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1">iOS</span>
            <span className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1">Android</span>
            <span className="rounded-md border border-black/10 dark:border-white/10 px-2 py-1">Web</span>
          </div>
        </div>
        <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-soft">
          <h3 className="text-xl font-semibold">What’s on</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Popular categories and channels curated for you.</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {['Sports+','News24','KidsZone','CinemaX','MusicTV','WorldLive'].map((c) => (
              <div key={c} className="rounded-lg border border-black/10 dark:border-white/10 bg-gray-50 dark:bg-gray-800 px-3 py-6 text-center font-semibold">
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mt-10">
        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-soft">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold">Simple monthly plan</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Instant activation. Cancel anytime. Secure checkout with receipts.</p>
              <ul className="mt-3 grid gap-1 text-sm text-gray-700 dark:text-gray-200">
                <li>• Live TV + on‑demand</li>
                <li>• Works on your devices</li>
                <li>• Email support</li>
              </ul>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-3xl font-extrabold tracking-tight">Flexible pricing</div>
              <div className="text-xs text-gray-500">See price at checkout</div>
              <Link href="/register" className="mt-3 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold">Create Account</Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          { n: 1, t: allowRegistration ? 'Create account' : 'Login', d: allowRegistration ? 'Register with your email and verify.' : 'Existing members can continue to access their account.' },
          { n: 2, t: 'Choose plan', d: 'Secure payment with Stripe.' },
          { n: 3, t: 'Start watching', d: 'Get login details instantly and stream.' }
        ].map(s => (
          <div key={s.n} className="rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-5 shadow-soft">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold mb-3">{s.n}</div>
            <h4 className="font-semibold">{s.t}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">{s.d}</p>
          </div>
        ))}
      </section>

      {/* Testimonials */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        {[
          {q:'So easy to set up. I was watching in minutes!',a:'— A. K.'},
          {q:'Great value and works on all my devices.',a:'— M. T.'}
        ].map((t) => (
          <div key={t.q} className="rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-soft">
            <p className="text-sm text-gray-700 dark:text-gray-200">“{t.q}”</p>
            <p className="mt-2 text-xs text-gray-500">{t.a}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="mt-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-black/5 dark:border-white/10 bg-white dark:bg-gray-900 p-6 shadow-soft">
        <div>
          <h4 className="font-semibold text-lg">{allowRegistration ? 'Ready to start?' : 'Already have an account?'}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {allowRegistration ? 'Create your account and start streaming in minutes.' : 'New registrations are paused for now, but existing users can still log in.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/register" className="rounded-lg bg-primary px-5 py-3 font-semibold">Create Account</Link>
          <Link href="/login" className="rounded-lg bg-black/80 text-white px-5 py-3 font-semibold dark:bg-white/10">Login</Link>
        </div>
      </section>
    </main>
  );
}
