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
      {/* HERO */}
      <section className="relative isolate overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_15%,rgba(42,180,143,0.08),transparent_60%)]"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          className="absolute inset-x-0 top-1/2 -z-10 h-72 -translate-y-1/2"
        >
          <HeroWaveform />
        </motion.div>
        <div className="mx-auto flex min-h-[calc(100dvh-4rem-4rem)] max-w-5xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-bg-surface/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted backdrop-blur">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse"
                />
                {t('landing.heroEyebrow')}
              </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: 'easeOut' }}
            className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-text sm:text-6xl lg:text-7xl"
          >
            {t('landing.heroTitle')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: 'easeOut' }}
            className="mx-auto mt-6 max-w-2xl text-base text-text-muted sm:text-lg"
          >
            {t('landing.heroSubtitle')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
          >
            <Link to="/login">
              <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" leftIcon={<MicIcon width={18} height={18} />}>
                  {t('landing.ctaPrimary')}
                </Button>
              </motion.span>
            </Link>
            <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                variant="secondary"
                onClick={scrollToDemo}
                leftIcon={<PlayIcon width={14} height={14} />}
              >
                {t('landing.ctaSecondary')}
              </Button>
            </motion.span>
          </motion.div>
        </div>
      </section>

      {/* TWO FLOWS */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            {t('landing.flows.eyebrow')}
          </p>
          <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t('landing.flows.title')}
          </h2>
          <p className="mt-3 text-text-muted">{t('landing.flows.subtitle')}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {(
            [
              { Icon: SparklesIcon, key: 'summarize' },
              { Icon: FileTextIcon, key: 'transcribe' },
            ] as const
          ).map(({ Icon, key }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
            >
              <Card glass className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon width={22} height={22} />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-text">
                      {t(`landing.flows.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">
                      {t(`landing.flows.${key}.description`)}
                    </p>
                  </div>
                  <span className="mt-auto pt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
                    {t(`landing.flows.${key}.tag`)}
                  </span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* DEMO STRIP */}
      <section ref={demoRef} className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t('landing.demoTitle')}
          </h2>
          <p className="mt-3 text-text-muted">{t('landing.demoSubtitle')}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Card glass className="h-full">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    {t('landing.demoTranscriptLabel')}
                  </h3>
                  <Badge variant="info">{t('landing.demoTranscript.badge')}</Badge>
                </div>
                <div className="space-y-3 text-sm leading-relaxed text-text-muted">
                  <p>
                    {t('landing.demoTranscript.line1Text')}{' '}
                    {t('landing.demoTranscript.line2Text')}
                  </p>
                  <p>
                    {t('landing.demoTranscript.line3Text')}{' '}
                    {t('landing.demoTranscript.line4Text')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Card glass className="h-full">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                    {t('landing.demoSummaryLabel')}
                  </h3>
                  <Badge variant="success">AI · Done</Badge>
                </div>
                <div className="space-y-5 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {t('landing.demoOverview')}
                    </p>
                    <p className="text-text">{t('landing.demoOverviewText')}</p>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {t('landing.demoDecisions')}
                    </p>
                    <ul className="space-y-1.5 text-text">
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {t('landing.demoDecision1')}
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {t('landing.demoDecision2')}
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                      {t('landing.demoActions')}
                    </p>
                    <div className="rounded-lg border border-border bg-bg-elevated/60 p-3">
                      <p className="text-text">{t('landing.demoAction1Task')}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
                        <Badge variant="warning" dot={false}>
                          @Maya
                        </Badge>
                        <span>·</span>
                        <span>{t('landing.demoAction1Deadline')}</span>
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
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-bg-surface/60 px-8 py-12 text-center backdrop-blur"
        >
          <Badge variant="info">{t('landing.mobile.eyebrow')}</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {t('landing.mobile.title')}
          </h2>
          <p className="max-w-xl text-text-muted">{t('landing.mobile.subtitle')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {(
              [
                { Icon: AppleIcon, label: t('landing.mobile.appStore') },
                { Icon: GooglePlayIcon, label: t('landing.mobile.googlePlay') },
              ] as const
            ).map(({ Icon, label }) => (
              <span
                key={label}
                aria-disabled
                className="inline-flex cursor-default items-center gap-2.5 rounded-xl border border-border bg-bg-elevated/70 px-4 py-2.5 text-left opacity-80"
              >
                <Icon width={22} height={22} />
                <span className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t('landing.mobile.comingSoon')}
                  </span>
                  <span className="text-sm font-semibold text-text">{label}</span>
                </span>
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="rounded-3xl border border-border bg-gradient-to-br from-bg-surface to-bg-elevated px-8 py-14 shadow-2xl"
        >
          <h2 className="font-display text-3xl font-bold leading-tight text-text sm:text-4xl">
            {t('landing.finalCtaTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-text-muted">
            {t('landing.finalCtaSubtitle')}
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/login">
              <motion.span whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button size="lg" leftIcon={<UploadIcon width={18} height={18} />}>
                  {t('landing.finalCtaButton')}
                </Button>
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </section>
    </>
  );
}
