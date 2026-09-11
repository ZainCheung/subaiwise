import type { ReactNode } from 'react'
import { isThirdParty } from '../data/channel'
import { brandLogos, brandMaker, providerInitials, providerLogoSlug, type ProviderLogoSize } from '../lib/provider-brands'

const logoFiles = {
  ...import.meta.glob<string>('../assets/provider-logos/*.svg', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
  ...import.meta.glob<string>('../assets/provider-logos/*.png', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
}

export function providerLogoUrl(provider: string): string | undefined {
  const slug = providerLogoSlug(provider)
  return (
    logoFiles[`../assets/provider-logos/${slug}.png`] ??
    logoFiles[`../assets/provider-logos/${slug}.svg`]
  )
}

export function ProviderLogo({
  provider,
  size = 'sm',
}: {
  provider: string
  size?: ProviderLogoSize
}) {
  const src = providerLogoUrl(provider)
  return (
    <span className={`provider-logo provider-logo-${size}`} title={provider} aria-label={provider}>
      {src ? (
        <img src={src} alt="" draggable={false} />
      ) : (
        <span aria-hidden="true">{providerInitials(provider)}</span>
      )}
    </span>
  )
}

export function BrandMarks({
  maker,
  channel,
  size = 'sm',
}: {
  maker: string
  channel: string
  size?: ProviderLogoSize
}) {
  const { thirdParty, logos } = brandLogos(maker, channel)
  if (!thirdParty) {
    return <ProviderLogo provider={logos[0]} size={size} />
  }
  return (
    <span className="brand-pair">
      <ProviderLogo provider={logos[0]} size={size} />
      <ProviderLogo provider={logos[1]} size={size} />
    </span>
  )
}

export function ModelIdentity({
  maker,
  modelName,
  size = 'sm',
}: {
  maker: string
  modelName: string
  size?: ProviderLogoSize
}) {
  return (
    <span className="identity-with-logo">
      <ProviderLogo provider={brandMaker(maker)} size={size} />
      <span className="min-w-0 truncate text-[13px] font-medium text-ink">{modelName}</span>
    </span>
  )
}

export function PlanIdentity({
  maker,
  channel,
  planName,
  size = 'sm',
  logo = 'third-party',
}: {
  maker: string
  channel: string
  planName: string
  size?: ProviderLogoSize
  logo?: 'always' | 'third-party' | 'never'
}) {
  const showLogo =
    logo === 'always' || (logo === 'third-party' && isThirdParty(maker, channel))
  return (
    <span className="identity-with-logo">
      {showLogo ? <ProviderLogo provider={channel} size={size} /> : null}
      <span className="min-w-0 truncate text-[13px] text-ink">{planName}</span>
    </span>
  )
}

export function CompactBrandIdentity({
  maker,
  channel,
  size = 'sm',
  children,
}: {
  maker: string
  channel: string
  size?: ProviderLogoSize
  children: ReactNode
}) {
  return (
    <span className="identity-with-logo identity-with-logo-block">
      <BrandMarks maker={maker} channel={channel} size={size} />
      <span className="min-w-0">{children}</span>
    </span>
  )
}
