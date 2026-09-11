import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { brandLogos, PROVIDER_LOGO_SLUGS, providerInitials, providerLogoSlug } from './provider-brands'

describe('provider brand mapping', () => {
  it('maps known makers and channels onto bundled logo slugs', () => {
    expect(providerLogoSlug('OpenAI')).toBe('openai')
    expect(providerLogoSlug('Anthropic')).toBe('anthropic')
    expect(providerLogoSlug('Command Code')).toBe('command-code')
    expect(providerLogoSlug('Ollama')).toBe('ollama')
    expect(providerLogoSlug('Muse')).toBe('meta')
    expect(providerLogoSlug('GLM')).toBe('zhipu')
    expect(providerLogoSlug('StepFun')).toBe('stepfun')
  })

  it('slugifies unknown providers without inventing a known brand file', () => {
    expect(providerLogoSlug('Unknown Labs')).toBe('unknown-labs')
    expect(providerLogoSlug('Unknown Labs')).not.toBe('openai')
  })

  it('falls back to stable initials for unknown marks', () => {
    expect(providerInitials('Unknown Labs')).toBe('UL')
    expect(providerInitials('Command Code')).toBe('CC')
    expect(providerInitials('xAI')).toBe('XA')
  })

  it('shows one logo for first-party and two for third-party access', () => {
    expect(brandLogos('OpenAI', 'OpenAI')).toEqual({
      thirdParty: false,
      logos: ['OpenAI'],
    })
    expect(brandLogos('DeepSeek', 'Ollama')).toEqual({
      thirdParty: true,
      logos: ['Ollama', 'DeepSeek'],
    })
    expect(brandLogos('Muse', 'OpenCode')).toEqual({
      thirdParty: true,
      logos: ['OpenCode', 'Meta'],
    })
    expect(brandLogos('Muse', 'Muse')).toEqual({
      thirdParty: false,
      logos: ['Meta'],
    })
    expect(brandLogos('OpenAI', 'Devin')).toEqual({
      thirdParty: true,
      logos: ['Devin', 'OpenAI'],
    })
    expect(providerInitials('Devin')).toBe('DE')
  })

  it('has a bundled asset for every mapped slug', () => {
    const files = new Set(
      readdirSync(resolve(process.cwd(), 'src/assets/provider-logos')),
    )
    for (const slug of new Set(Object.values(PROVIDER_LOGO_SLUGS))) {
      expect(
        files.has(`${slug}.svg`) || files.has(`${slug}.png`),
        `missing logo file for slug "${slug}"`,
      ).toBe(true)
    }
  })
})
