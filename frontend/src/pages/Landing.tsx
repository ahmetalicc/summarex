import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { HeroWaveform } from '../components/audio/HeroWaveform';
import {
  AppleIcon,
  FileTextIcon,
  GooglePlayIcon,
  MicIcon,
  PlayIcon,
  SparklesIcon,
  UploadIcon,
} from '../components/layout/Icons';

export default function Landing() {
  const { t } = useTranslation();
  const demoRef = useRef<HTMLDivElement>(null);

  const scrollToDemo = () => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      {/* HERO — Signal Green, asymmetric + bold */}
      <section className="relative isolate overflow-hidden noise-texture">
        {/* Background layers */}
        <div aria-hidden className="absolute inset-0 -z-20 bg-radial-hero" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-16 sm:px-6 md:pb-24 md:pt-24 lg:grid-cols-12 lg:gap-6">
          {/* Left: Eyebrow + Title + Subtitle + CTAs */}
          <div className="relative lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-border bg-bg-surface/40 px-3.5 py-1.5 backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="eyebrow">{t('landing.heroEyebrow')}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: 'easeOut' }}
              className="font-display font-bold text-text"
              style={{ fontSize: 'clamp(2.75rem, 7.5vw, 6.5rem)', lineHeight: 0.95, letterSpacing: '-0.045em' }}
            >
              {t('landing.heroTitle')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
              className="mt-6 max-w-xl text-lg leading-relaxed text-text-muted sm:text-xl"
            >
              {t('landing.heroSubtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Link to="/login">
                <Button size="lg" leftIcon={<MicIcon width={18} height={18} />}>
                  {t('landing.ctaPrimary')}
                </Button>
              </Link>
              <Button
                size="lg"
                variant="secondary"
                onClick={scrollToDemo}
                leftIcon={<PlayIcon width={14} height={14} />}
              >
                {t('landing.ctaSecondary')}
              </Button>
            </motion.div>

            {/* Meta strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 grid max-w-lg grid-cols-3 gap-3 border-t border-border/70 pt-6 sm:gap-6"
            >
              {[
                { k: 'mp3 · wav · m4a', v: 'Formats' },
                { k: '25 MB', v: 'Max upload' },
                { k: '50+', v: 'Languages' },
              ].map((m) => (
                <div key={m.v}>
                  <div className="font-display text-sm font-bold text-text sm:text-lg">{m.k}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                    {m.v}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Live waveform card — hidden on mobile to prevent overflow */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block lg:col-span-4"
          >
            <div className="gradient-border relative overflow-hidden rounded-3xl bg-bg-surface/60 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="pulse-ring flex h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="eyebrow">LIVE · 00:42</span>
                </div>
                <span className="rounded-md bg-accent/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                  AI · Scribe
                </span>
              </div>

              <div className="relative h-32 rounded-2xl bg-bg/60 p-3">
                <HeroWaveform className="h-full" barCount={64} variant="hero" />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-lg border border-border bg-bg/40 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Transcript
                  </p>
                  <p className="line-clamp-2 text-text">
                    {t('landing.heroLiveTranscript')}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Summary
                  </p>
                  <p className="text-text">{t('landing.heroLiveSummary')}</p>
                </div>
              </div>
            </div>

            {/* Floating accent orb */}
            <div
              aria-hidden
              className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-accent/20 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-primary/25 blur-2xl"
            />
          </motion.div>
        </div>
      </section>

      {/* TWO FLOWS — asymmetric grid */}
      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-16 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">{t('landing.flows.eyebrow')}</p>
            <h2
              className="font-display font-bold tracking-tight text-text"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1 }}
            >
              {t('landing.flows.title')}
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-lg leading-relaxed text-text-muted">
              {t('landing.flows.subtitle')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              { Icon: SparklesIcon, key: 'summarize', tone: 'primary' as const },
              { Icon: FileTextIcon, key: 'transcribe', tone: 'accent' as const },
            ]
          ).map(({ Icon, key, tone }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
            >
              <Card gradient hoverable className="group relative h-full overflow-hidden">
                <CardContent className="flex h-full flex-col gap-5 p-8">
                  <div className="flex items-start justify-between">
                    <span
                      className={
                        'grid h-12 w-12 place-items-center rounded-2xl ' +
                        (tone === 'primary'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-accent/20 text-accent')
                      }
                    >
                      <Icon width={22} height={22} />
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
                      0{i + 1}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-2xl font-semibold leading-tight text-text">
                      {t(`landing.flows.${key}.title`)}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-text-muted">
                      {t(`landing.flows.${key}.description`)}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-5">
                    <span
                      className={
                        'font-mono text-[11px] font-semibold uppercase tracking-[0.16em] ' +
                        (tone === 'primary' ? 'text-primary' : 'text-accent')
                      }
                    >
                      {t(`landing.flows.${key}.tag`)}
                    </span>
                    <span
                      aria-hidden
                      className="grid h-8 w-8 place-items-center rounded-full border border-border text-text-muted transition-all group-hover:border-primary group-hover:text-primary group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DEMO STRIP */}
      <section ref={demoRef} className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="mb-14 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow mb-3">DEMO · REAL OUTPUT</p>
            <h2
              className="font-display font-bold tracking-tight text-text"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1 }}
            >
              {t('landing.demoTitle')}
            </h2>
            <p className="mt-4 text-lg text-text-muted">{t('landing.demoSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-bg-surface/50 px-4 py-2 font-mono text-xs text-text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span>Sample · Team standup · 03:24</span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Transcript card */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <Card gradient className="h-full">
              <CardContent className="p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileTextIcon width={16} height={16} className="text-text-muted" />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-text-muted">
                      {t('landing.demoTranscriptLabel')}
                    </h3>
                  </div>
                  <Badge variant="info">{t('landing.demoTranscript.badge')}</Badge>
                </div>
                <div className="space-y-4 text-[15px] leading-relaxed text-text-muted">
                  <p>
                    <span className="font-mono text-xs text-primary">00:12</span>
                    <span className="ml-3">
                      {t('landing.demoTranscript.line1Text')}{' '}
                      {t('landing.demoTranscript.line2Text')}
                    </span>
                  </p>
                  <p>
                    <span className="font-mono text-xs text-primary">01:47</span>
                    <span className="ml-3">
                      {t('landing.demoTranscript.line3Text')}{' '}
                      {t('landing.demoTranscript.line4Text')}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Summary card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            <Card gradient className="h-full">
              <CardContent className="p-7">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SparklesIcon width={16} height={16} className="text-accent" />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-text-muted">
                      {t('landing.demoSummaryLabel')}
                    </h3>
                  </div>
                  <Badge variant="success">AI · Done</Badge>
                </div>
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                      {t('landing.demoOverview')}
                    </p>
                    <p className="text-[15px] leading-relaxed text-text">{t('landing.demoOverviewText')}</p>
                  </div>
                  <div>
                    <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                      {t('landing.demoDecisions')}
                    </p>
                    <ul className="space-y-2 text-[15px] text-text">
                      <li className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{t('landing.demoDecision1')}</span>
                      </li>
                      <li className="flex gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{t('landing.demoDecision2')}</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                      {t('landing.demoActions')}
                    </p>
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                      <p className="text-[15px] font-medium text-text">
                        {t('landing.demoAction1Task')}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 font-mono font-semibold text-accent">
                          @Maya
                        </span>
                        <span className="text-text-muted">·</span>
                        <span className="font-mono text-text-muted">
                          {t('landing.demoAction1Deadline')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* MOBILE TEASER */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="gradient-border noise-texture relative overflow-hidden rounded-3xl bg-bg-surface/60 px-8 py-16 backdrop-blur"
        >
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-accent/15 blur-3xl" aria-hidden />

          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <Badge variant="info" className="mb-5">
                {t('landing.mobile.eyebrow')}
              </Badge>
              <h2
                className="font-display font-bold leading-tight tracking-tight text-text"
                style={{ fontSize: 'clamp(1.75rem, 3.5vw, 3rem)' }}
              >
                {t('landing.mobile.title')}
              </h2>
              <p className="mt-4 max-w-lg text-lg text-text-muted">
                {t('landing.mobile.subtitle')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
              {(
                [
                  { Icon: AppleIcon, label: t('landing.mobile.appStore') },
                  { Icon: GooglePlayIcon, label: t('landing.mobile.googlePlay') },
                ]
              ).map(({ Icon, label }) => (
                <span
                  key={label}
                  aria-disabled
                  className="inline-flex cursor-default items-center gap-3 rounded-2xl border border-border bg-bg-elevated/70 px-5 py-3 backdrop-blur transition-all hover:border-primary/40"
                >
                  <Icon width={26} height={26} />
                  <span className="flex flex-col leading-tight">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-muted">
                      {t('landing.mobile.comingSoon')}
                    </span>
                    <span className="text-base font-semibold text-text">{label}</span>
                  </span>
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-bg-surface via-bg-surface to-bg-elevated px-8 py-16 text-center noise-texture sm:px-16"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40">
            <HeroWaveform className="h-full" barCount={80} variant="hero" />
          </div>

          <div className="relative">
            <span className="eyebrow">READY WHEN YOU ARE</span>
            <h2
              className="mt-4 font-display font-bold leading-[1.05] tracking-tight text-text"
              style={{ fontSize: 'clamp(2rem, 5vw, 4.5rem)' }}
            >
              {t('landing.finalCtaTitle')}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-text-muted">
              {t('landing.finalCtaSubtitle')}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/login">
                <Button size="lg" leftIcon={<UploadIcon width={18} height={18} />}>
                  {t('landing.finalCtaButton')}
                </Button>
              </Link>
              <Button size="lg" variant="secondary" onClick={scrollToDemo}>
                {t('landing.ctaSecondary')}
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
