import { isThirdParty, manufacturer } from '../data/channel'

export const PROVIDER_LOGO_SLUGS: Record<string, string> = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  Claude: 'anthropic',
  xAI: 'xai',
  Cursor: 'cursor',
  Kimi: 'kimi',
  Zhipu: 'zhipu',
  GLM: 'zhipu',
  MiniMax: 'minimax',
  Alibaba: 'alibaba',
  OpenCode: 'opencode',
  DeepSeek: 'deepseek',
  Google: 'google',
  Gemini: 'google',
  'Command Code': 'command-code',
  Ollama: 'ollama',
  Xiaomi: 'xiaomi',
  Tencent: 'tencent',
  Meta: 'meta',
  Microsoft: 'microsoft',
  Meituan: 'meituan',
  Muse: 'meta',
  StepFun: 'stepfun',
  Step: 'stepfun',
}

export type ProviderLogoSize = 'sm' | 'md'

export function providerLogoSlug(provider: string): string {
  return PROVIDER_LOGO_SLUGS[provider] ?? provider.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function providerInitials(provider: string): string {
  const parts = provider.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return provider.slice(0, 2).toUpperCase() || '?'
}

export function brandMaker(provider: string): string {
  return manufacturer(provider)
}

export function brandLogos(
  maker: string,
  channel: string,
): { thirdParty: boolean; logos: string[] } {
  const normalizedMaker = brandMaker(maker)
  if (!isThirdParty(maker, channel)) {
    return { thirdParty: false, logos: [normalizedMaker] }
  }
  return { thirdParty: true, logos: [channel, normalizedMaker] }
}
