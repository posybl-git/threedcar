'use client';

import type { CSSProperties } from 'react';
import { hero } from '@/config/car';
import { useExperience } from '@/store/experience';
import { CountUp } from './CountUp';

/**
 * Product description overlay. Hidden until the intro camera sweep finishes, then each line
 * fades/slides in with a stagger (CSS `.reveal`; instant under reduced motion).
 * The wrapper is pointer-events: none so it never blocks orbiting; only the CTAs take input.
 */
export function HeroCopy() {
  const show = useExperience((s) => s.introDone);
  const recording = useExperience((s) => s.recording);
  const goTo = useExperience((s) => s.goTo);

  let i = 0;
  const reveal = (className: string) => ({ className: `reveal ${className}`, style: { '--i': i++ } as CSSProperties });

  return (
    <section
      className="hero-copy"
      data-show={show}
      aria-labelledby="hero-title"
      style={{ '--reveal-ms': `${hero.reveal.duration}ms`, '--stagger-ms': `${hero.reveal.stagger}ms` } as CSSProperties}
    >
      <p {...reveal('hero-eyebrow')}>{hero.eyebrow}</p>
      <h1 id="hero-title" {...reveal('hero-headline')}>
        {hero.headline}
      </h1>
      <p {...reveal('hero-sub')}>{hero.subheadline}</p>
      <p {...reveal('hero-body')}>{hero.body}</p>
      <dl {...reveal('hero-stats')}>
        {hero.stats.map((s) => (
          <div key={s.label} className="hero-stat">
            <dt>{s.label}</dt>
            <dd>
              <CountUp value={s.value} decimals={s.decimals} start={show} durationMs={hero.countUpMs} />
              <span className="hero-stat-unit"> {s.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div {...reveal('hero-ctas')}>
        <a href={hero.primaryCta.href} className="btn btn-primary">
          {hero.primaryCta.label}
        </a>
        <button type="button" className="btn btn-secondary" onClick={() => goTo(hero.secondaryCta.preset)}>
          {hero.secondaryCta.label}
        </button>
      </div>
      {!recording && (
        <p {...reveal('hero-hint')}>
          {hero.hint}
        </p>
      )}
    </section>
  );
}
