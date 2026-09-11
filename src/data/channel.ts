/**
 * Access-channel identity lives in the data pipeline, not in UI heuristics.
 *
 * Canonical meanings:
 * - `provider` / manufacturer: who made the model (DeepSeek, OpenAI, Meta)
 * - `channel`: who sells or hosts the plan (Ollama, OpenCode, OpenAI)
 *
 * Channel is resolved from the stable plan id prefix, never from display names.
 */

export const MANUFACTURER_ALIASES: Record<string, string> = {
  Muse: 'Meta',
  GLM: 'Zhipu',
  Claude: 'Anthropic',
  Gemini: 'Google',
  Step: 'StepFun',
}

/**
 * Longest-prefix wins. Keys are plan-id prefixes (`chatgpt_plus`, `ollama_pro`),
 * not model slugs and not display labels.
 */
export const CHANNEL_BY_PLAN_PREFIX: ReadonlyArray<readonly [string, string]> = [
  ['command_code', 'Command Code'],
  ['opencode', 'OpenCode'],
  ['chatgpt', 'OpenAI'],
  ['openai', 'OpenAI'],
  ['claude', 'Anthropic'],
  ['anthropic', 'Anthropic'],
  ['supergrok', 'xAI'],
  ['cursor', 'Cursor'],
  ['devin', 'Devin'],
  ['kimi', 'Kimi'],
  ['glm', 'Zhipu'],
  ['minimax', 'MiniMax'],
  ['aliyun', 'Alibaba'],
  ['ollama', 'Ollama'],
  ['deepseek', 'DeepSeek'],
  ['stepfun', 'StepFun'],
  ['gemini', 'Google'],
  ['google', 'Google'],
  ['xiaomi', 'Xiaomi'],
  ['mimo', 'Xiaomi'],
  ['tencent', 'Tencent'],
  ['hunyuan', 'Tencent'],
  ['meituan', 'Meituan'],
  ['longcat', 'Meituan'],
  ['muse', 'Meta'],
  ['meta', 'Meta'],
  ['xai', 'xAI'],
]

const PREFIXES_LONGEST_FIRST = [...CHANNEL_BY_PLAN_PREFIX].sort(
  (a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]),
)

export const KNOWN_CHANNELS = [
  ...new Set(CHANNEL_BY_PLAN_PREFIX.map(([, channel]) => channel)),
].sort((a, b) => a.localeCompare(b))

export type ChannelResolution = {
  channel: string
  known: boolean
  matchedPrefix: string | null
  planId: string
}

export function planIdFromPointId(id: string): string {
  const separator = id.indexOf('::')
  return separator === -1 ? id : id.slice(0, separator)
}

function matchesPlanPrefix(planId: string, prefix: string): boolean {
  return planId === prefix || planId.startsWith(`${prefix}_`)
}

/** Normalize model-maker aliases without inventing a new manufacturer. */
export function manufacturer(vendor: string): string {
  return MANUFACTURER_ALIASES[vendor] ?? vendor
}

/**
 * Resolve the access/service provider for a plan.
 *
 * Unknown prefixes fall back to the model maker (first-party assumption).
 * That is a safe production default; it never maps an unknown plan onto a
 * different third-party brand. Callers that need to discover gaps should
 * inspect `known` or use `assertKnownChannel`.
 */
export function resolveChannel(input: {
  id?: string
  planId?: string
  manufacturer: string
}): ChannelResolution {
  const planId = input.planId || (input.id ? planIdFromPointId(input.id) : '')
  const match = PREFIXES_LONGEST_FIRST.find(([prefix]) =>
    matchesPlanPrefix(planId, prefix),
  )
  if (match) {
    return {
      channel: match[1],
      known: true,
      matchedPrefix: match[0],
      planId,
    }
  }
  return {
    channel: input.manufacturer,
    known: false,
    matchedPrefix: null,
    planId,
  }
}

export function assertKnownChannel(resolution: ChannelResolution): void {
  if (resolution.known) return
  throw new Error(
    `Unknown access channel for plan "${resolution.planId || '(empty)'}". ` +
      'Add a plan-id prefix mapping in src/data/channel.ts.',
  )
}

export function isThirdParty(provider: string, channel: string): boolean {
  return channel !== provider && channel !== manufacturer(provider)
}

export function isFirstParty(provider: string, channel: string): boolean {
  return !isThirdParty(provider, channel)
}

export function warnUnknownChannels(planIds: Iterable<string>): void {
  const unique = [...new Set(planIds)].filter(Boolean).sort()
  if (!unique.length) return
  console.warn(
    `Unknown access-channel plan prefixes (fell back to manufacturer): ${unique.join(', ')}`,
  )
}
