import { describe, expect, it } from 'vitest'
import {
  configurationsForEntryBoard,
  selectDefaultBenchmarkReference,
} from './benchmark-selection'
import type { BenchmarkConfiguration, BenchmarkMapping } from './schema'

function configuration(
  partial: Partial<BenchmarkConfiguration> & Pick<BenchmarkConfiguration, 'id' | 'score'>,
): BenchmarkConfiguration {
  return {
    boardId: 'aa_intelligence_index',
    modelId: 'gpt-5.6-sol',
    variant: partial.id,
    scoreIsEstimated: false,
    archive: 'scores.json',
    ...partial,
  }
}

function graph(
  configurations: BenchmarkConfiguration[],
  mappings: BenchmarkMapping[],
) {
  return { benchmarkConfigurations: configurations, benchmarkMappings: mappings }
}

describe('highest_archived_reference', () => {
  const configs = [
    configuration({ id: 'intel:max', score: 47.0614, reasoningEffort: 'max', variant: 'max' }),
    configuration({ id: 'intel:high', score: 42.4992, reasoningEffort: 'high', variant: 'high' }),
    configuration({
      id: 'intel:est',
      score: 28.328,
      scoreIsEstimated: true,
      reasoningEffort: null,
      variant: 'estimated',
    }),
  ]
  const mappings: BenchmarkMapping[] = configs.map((item) => ({
    entryId: 'plus::gpt-5.6-sol',
    configurationId: item.id,
    mappingKind: 'model_configuration_reference',
    mappingConfidence: 'low',
    mappingNote: null,
    quotaEffortMatched: null,
  }))

  it('selects the highest archived score, not an estimated lower row', () => {
    const selected = selectDefaultBenchmarkReference(
      graph(configs, mappings),
      'plus::gpt-5.6-sol',
      'aa_intelligence_index',
    )
    expect(selected?.configuration.id).toBe('intel:max')
    expect(selected?.selection).toBe('highest_archived_reference')
  })

  it('is deterministic when scores tie', () => {
    const tied = [
      configuration({ id: 'intel:b', score: 40, variant: 'b' }),
      configuration({ id: 'intel:a', score: 40, variant: 'a' }),
    ]
    const selected = selectDefaultBenchmarkReference(
      graph(
        tied,
        tied.map((item) => ({
          entryId: 'plus::gpt-5.6-sol',
          configurationId: item.id,
        })),
      ),
      'plus::gpt-5.6-sol',
      'aa_intelligence_index',
    )
    expect(selected?.configuration.id).toBe('intel:a')
  })

  it('prefers a higher estimated archived score over a lower measured score', () => {
    const selected = selectDefaultBenchmarkReference(
      graph(
        [
          configuration({
            id: 'intel:est-high',
            score: 39.6178,
            scoreIsEstimated: true,
            reasoningEffort: 'medium',
          }),
          configuration({
            id: 'intel:measured',
            score: 39.4295,
            scoreIsEstimated: false,
            reasoningEffort: 'high',
          }),
        ],
        [
          { entryId: 'plan::gemini', configurationId: 'intel:est-high' },
          { entryId: 'plan::gemini', configurationId: 'intel:measured' },
        ],
      ),
      'plan::gemini',
      'aa_intelligence_index',
    )
    expect(selected?.configuration.id).toBe('intel:est-high')
  })

  it('returns every mapped configuration for an entry and board', () => {
    const refs = configurationsForEntryBoard(
      graph(configs, mappings),
      'plus::gpt-5.6-sol',
      'aa_intelligence_index',
    )
    expect(refs.map((ref) => ref.configuration.reasoningEffort)).toEqual(['max', 'high', null])
  })

  it('does not select unmapped archive-only configurations', () => {
    const selected = selectDefaultBenchmarkReference(
      graph(
        [
          ...configs,
          configuration({
            id: 'intel:unmapped',
            score: 99,
            modelId: 'other-model',
          }),
        ],
        mappings,
      ),
      'plus::gpt-5.6-sol',
      'aa_intelligence_index',
    )
    expect(selected?.configuration.id).toBe('intel:max')
  })

  it('returns null when a harness filter matches no mapped configuration', () => {
    expect(
      selectDefaultBenchmarkReference(
        graph(configs, mappings),
        'plus::gpt-5.6-sol',
        'aa_intelligence_index',
        { harness: ['Claude Code'] },
      ),
    ).toBeNull()
  })
})
