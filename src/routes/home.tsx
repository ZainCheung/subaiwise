import { dataset } from '../data/load'
import { toPointsPayload } from '../data/view-model'
import { useI18n } from '../lib/i18n'
import { computeInsights, computeStats } from '../lib/stats'
import { Nav } from '../components/Nav'
import { Hero } from '../components/Hero'
import { StatStrip } from '../components/StatStrip'
import { CompareSection } from '../components/CompareSection'
import { LeaderboardChart } from '../components/LeaderboardChart'
import { ChartsSection } from '../components/ChartsSection'
import { AdvancedPareto } from '../components/AdvancedPareto'
import { Method } from '../components/Method'
import { Downloads } from '../components/Downloads'
import { Footer } from '../components/Footer'

export function HomePage() {
  const { t } = useI18n()
  const data = toPointsPayload(dataset)
  const stats = computeStats(data)
  const insights = computeInsights(data)

  return (
    <div className="min-h-screen bg-bg">
      <Nav />
      <main>
        <Hero stats={stats} insights={insights} />
        <StatStrip stats={stats} />
        <CompareSection data={data} />
        <section id="leaderboard" className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              {t('leaderboardTitle')}
            </h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-muted">
              {t('leaderboardSub')}
            </p>
          </div>
          <div className="mt-8">
            <LeaderboardChart points={data.points} boards={data.boards} />
          </div>
        </section>
        <ChartsSection data={data} />
        <AdvancedPareto data={data} />
        <Method mix={data.mix} />
        <Downloads />
      </main>
      <Footer />
    </div>
  )
}
