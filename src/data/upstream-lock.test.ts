import { describe, expect, it } from 'vitest'
import { monitoredPathsChanged, parseUpstreamLock } from './upstream-lock'

describe('upstream lock', () => {
  it('requires a single commit and the three monitored paths', () => {
    const lock = parseUpstreamLock({
      repository: 'FeiZhuLulu/real-api-pricing',
      ref: 'a'.repeat(40),
      paths: [
        'derived/points.json',
        'derived/benchmark-configurations.json',
        'derived/benchmark-points.json',
        'data/adopted.csv',
      ],
    })
    expect(lock.paths).toContain('data/adopted.csv')
    expect(() => parseUpstreamLock({ repository: 'x', ref: 'abc', paths: ['derived/points.json'] })).toThrow()
  })

  it('treats configuration-only and mapping-only hash changes as a sync trigger', () => {
    const locked = {
      'derived/points.json': 'aaa',
      'derived/benchmark-configurations.json': 'bbb',
      'derived/benchmark-points.json': 'ccc',
      'data/adopted.csv': 'ddd',
    }
    expect(monitoredPathsChanged(locked, locked)).toBe(false)
    expect(
      monitoredPathsChanged(locked, {
        ...locked,
        'derived/benchmark-configurations.json': 'bbb2',
      }),
    ).toBe(true)
    expect(
      monitoredPathsChanged(locked, {
        ...locked,
        'derived/benchmark-points.json': 'ccc2',
      }),
    ).toBe(true)
    expect(
      monitoredPathsChanged(locked, {
        ...locked,
        'derived/points.json': 'aaa2',
      }),
    ).toBe(true)
    expect(
      monitoredPathsChanged(locked, {
        ...locked,
        'data/adopted.csv': 'ddd2',
      }),
    ).toBe(true)
  })
})
